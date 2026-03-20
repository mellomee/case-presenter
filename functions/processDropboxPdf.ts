import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import pdfParse from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import AdobePdfServicesSdk from 'npm:@adobe/pdfservices-node-sdk@4.1.0';

const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  OCRJob,
  OCRResult,
  CompressPDFJob,
  CompressPDFResult,
  LinearizePDFJob,
  LinearizePDFResult,
} = AdobePdfServicesSdk;

const SEARCHABLE_TEXT_THRESHOLD = 20;

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function getBaseName(fileName) {
  return String(fileName || 'document.pdf').replace(/\.pdf$/i, '');
}

function getDropboxFolderUrl(path) {
  const normalizedPath = normalizePath(path);
  return `https://www.dropbox.com/home${normalizedPath.split('/').map(encodeURIComponent).join('/')}`;
}

async function streamToUint8Array(stream) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of stream) {
    const bytes = typeof chunk === 'string'
      ? new TextEncoder().encode(chunk)
      : chunk instanceof Uint8Array
        ? chunk
        : new Uint8Array(chunk);

    chunks.push(bytes);
    totalLength += bytes.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function isSearchablePdf(pdfBytes) {
  try {
    const parsed = await pdfParse(Buffer.from(pdfBytes));
    const normalizedText = (parsed.text || '').replace(/\s+/g, '');
    return normalizedText.length > SEARCHABLE_TEXT_THRESHOLD;
  } catch {
    return false;
  }
}

function createAdobePdfServices() {
  const clientId = Deno.env.get('ADOBE_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Adobe PDF credentials are missing.');
  }

  const credentials = new ServicePrincipalCredentials({ clientId, clientSecret });
  return new PDFServices({ credentials });
}

async function runAdobeJob(pdfBytes, JobClass, ResultClass) {
  const pdfServices = createAdobePdfServices();
  const inputAsset = await pdfServices.upload({
    readStream: Readable.from([pdfBytes]),
    mimeType: MimeType.PDF,
  });

  const job = new JobClass({ inputAsset });
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({ pollingURL, resultType: ResultClass });
  const streamAsset = await pdfServices.getContent({ asset: pdfServicesResponse.result.asset });
  return await streamToUint8Array(streamAsset.readStream);
}

async function runAdobeOcr(pdfBytes) {
  return await runAdobeJob(pdfBytes, OCRJob, OCRResult);
}

async function runAdobeCompress(pdfBytes) {
  return await runAdobeJob(pdfBytes, CompressPDFJob, CompressPDFResult);
}

async function runAdobeLinearize(pdfBytes) {
  return await runAdobeJob(pdfBytes, LinearizePDFJob, LinearizePDFResult);
}

async function downloadDropboxFile(accessToken, pathOrId) {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: pathOrId }),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to download Dropbox file.');
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function ensureDropboxFolder(accessToken, path) {
  if (!path) return;

  const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, autorename: false }),
  });

  if (response.ok) return;
  const errorText = await response.text();
  if (!errorText.includes('conflict')) {
    throw new Error(errorText || 'Failed to create Dropbox folder.');
  }
}

async function uploadDropboxFile(accessToken, path, bytes) {
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true,
        mute: true,
      }),
    },
    body: bytes,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_summary || 'Failed to upload processed PDF back to Dropbox.');
  }

  return data;
}

function drawCenteredText(page, text, y, font, size, color) {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = Math.max(50, (pageWidth - textWidth) / 2);
  page.drawText(text, { x, y, size, font, color });
}

function drawCenteredParagraph(page, text, y, font, size, color, maxWidth, lineHeight = size * 1.3) {
  const cleanedText = String(text || '').trim();
  if (!cleanedText) return;

  const words = cleanedText.split(/\s+/);
  const lines = [];
  let currentLine = words[0] || '';

  for (let index = 1; index < words.length; index += 1) {
    const nextLine = `${currentLine} ${words[index]}`;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    drawCenteredText(page, line, y - index * lineHeight, font, size, color);
  });
}

async function addCoverAndPageNumbers(pdfBytes, { addCoverPage, addPageNumbers, proofName, formalName, exhibitNumber, proofCategory }) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (addCoverPage) {
    const coverPage = pdfDoc.insertPage(0, [612, 792]);
    const heading = exhibitNumber
      ? `${proofCategory === 'Exhibit' ? 'Exhibit' : (proofCategory || 'Proof')} ${exhibitNumber}`
      : (proofCategory || 'Proof');
    const subtitle = formalName || proofName || 'Untitled Proof';

    drawCenteredText(coverPage, heading, 580, helveticaBold, 40, rgb(0, 0, 0));
    drawCenteredParagraph(coverPage, subtitle, 620, helvetica, 12, rgb(0.2, 0.2, 0.2), 520, 18);
  }

  if (addPageNumbers) {
    const totalPages = pdfDoc.getPageCount();
    // Standard letter page width in PDF points (8.5" × 72pt/in = 612pt)
    // Target ~1cm printed height on letter = 28.35pt font at 612pt width
    // Scale proportionally for non-letter page sizes
    const LETTER_WIDTH_PT = 612;
    const TARGET_FONT_SIZE_AT_LETTER = 28;

    for (let index = 0; index < totalPages; index += 1) {
      const page = pdfDoc.getPage(index);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const scaleFactor = pageWidth / LETTER_WIDTH_PT;
      const size = Math.round(TARGET_FONT_SIZE_AT_LETTER * scaleFactor);
      const rightMargin = Math.round(36 * scaleFactor);
      const bottomMargin = Math.round(36 * scaleFactor);

      const pageNum = index + 1;
      const label = `Page ${pageNum} of ${totalPages}`;
      const textWidth = helveticaBold.widthOfTextAtSize(label, size);
      const x = pageWidth - textWidth - rightMargin;
      page.drawText(label, {
        x,
        y: bottomMargin,
        size,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Draw "TEST" in the middle of the page in big font
      const testFontSize = Math.round(80 * scaleFactor);
      const testText = 'TEST';
      const testTextWidth = helveticaBold.widthOfTextAtSize(testText, testFontSize);
      const testX = Math.max(50, (pageWidth - testTextWidth) / 2);
      const testY = pageHeight / 2;
      page.drawText(testText, {
        x: testX,
        y: testY,
        size: testFontSize,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const fileId = payload.fileId;
    const originalPath = payload.path;
    const fileName = payload.name;
    const addCoverPage = Boolean(payload.addCoverPage);
    const addPageNumbers = Boolean(payload.addPageNumbers);
    const optimizePdf = Boolean(payload.optimizePdf);
    const proofName = String(payload.proofName || '').trim();
    const formalName = String(payload.formalName || '').trim();
    const exhibitNumber = String(payload.exhibitNumber || '').trim();
    const proofCategory = String(payload.proofCategory || 'Exhibit').trim();
    // Optional: comma-separated 1-based page numbers to extract (e.g. "1,3,5,6")
    const extractPagesParam = payload.extractPages ? String(payload.extractPages).trim() : null;

    if (!fileId && !originalPath) {
      return Response.json({ error: 'A Dropbox PDF is required.' }, { status: 400 });
    }

    if (!String(fileName || '').toLowerCase().endsWith('.pdf')) {
      return Response.json({ error: 'Only Dropbox PDF files can be processed.' }, { status: 400 });
    }

    if (!addCoverPage && !addPageNumbers && !optimizePdf) {
      return Response.json({ error: 'Select at least one PDF processing option.' }, { status: 400 });
    }

    const sourceReference = fileId
      ? (String(fileId).startsWith('id:') ? fileId : `id:${fileId}`)
      : originalPath;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    const originalBytes = await downloadDropboxFile(accessToken, sourceReference);
    const alreadySearchable = await isSearchablePdf(originalBytes);

    let nextBytes = alreadySearchable ? originalBytes : await runAdobeOcr(originalBytes);

    // If specific pages are requested, extract only those pages using pdf-lib
    if (extractPagesParam) {
      const pageNumbers = extractPagesParam.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1);
      if (pageNumbers.length > 0) {
        const srcDoc = await PDFDocument.load(nextBytes);
        const extractDoc = await PDFDocument.create();
        const zeroIndexed = pageNumbers.map((n) => n - 1).filter((i) => i < srcDoc.getPageCount());
        const copiedPages = await extractDoc.copyPages(srcDoc, zeroIndexed);
        copiedPages.forEach((page) => extractDoc.addPage(page));
        nextBytes = await extractDoc.save();
      }
    }

    if (addCoverPage || addPageNumbers) {
      nextBytes = await addCoverAndPageNumbers(nextBytes, {
        addCoverPage,
        addPageNumbers,
        proofName,
        formalName,
        exhibitNumber,
        proofCategory,
      });
    }

    if (optimizePdf) {
      nextBytes = await runAdobeCompress(nextBytes);
      nextBytes = await runAdobeLinearize(nextBytes);
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const isExtract = Boolean(payload.isExtract);
    const saveFolder = isExtract
      ? normalizePath(settings[0]?.dropbox_extract_folder || '/Case Presenter/Extracts')
      : normalizePath(settings[0]?.dropbox_save_folder || '/Case Presenter/OCR');
    await ensureDropboxFolder(accessToken, saveFolder);

    const outputName = `${getBaseName(fileName)}-presenter.pdf`;
    const uploadedFile = await uploadDropboxFile(accessToken, `${saveFolder}/${outputName}`, nextBytes);

    return Response.json({
      file_source: 'dropbox',
      dropbox_file_id: uploadedFile.id,
      dropbox_path: uploadedFile.path_display,
      dropbox_file_name: uploadedFile.name,
      processed_file_name: uploadedFile.name,
      dropbox_folder_path: saveFolder,
      dropbox_folder_url: getDropboxFolderUrl(saveFolder),
      original_dropbox_file_id: fileId || '',
      original_dropbox_path: originalPath || '',
      original_dropbox_file_name: fileName || '',
      optimized_for_viewer: true,
      optimized_date: new Date().toISOString(),
      optimized_with_cover_page: addCoverPage,
      optimized_with_page_numbers: addPageNumbers,
      already_searchable: alreadySearchable,
      ocr_applied: !alreadySearchable,
      optimization_applied: optimizePdf,
    });
  } catch (error) {
    console.error('processDropboxPdf failed', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});