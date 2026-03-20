import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument, StandardFonts, rgb, degrees } from 'npm:pdf-lib@1.17.1';
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

    drawCenteredText(coverPage, heading, 400, helveticaBold, 40, rgb(0, 0, 0));
    drawCenteredParagraph(coverPage, subtitle, 320, helvetica, 12, rgb(0.2, 0.2, 0.2), 520, 18);
  }

  if (addPageNumbers) {
    const totalPages = pdfDoc.getPageCount();
    const LETTER_WIDTH_PT = 612;
    const TARGET_FONT_SIZE_AT_LETTER = 28;

    for (let index = 0; index < totalPages; index += 1) {
      const page = pdfDoc.getPage(index);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const rotation = page.getRotation();
      const rotationAngle = rotation ? rotation.angle : 0;

      const scaleFactor = pageWidth / LETTER_WIDTH_PT;
      const size = Math.round(TARGET_FONT_SIZE_AT_LETTER * scaleFactor);
      const rightMargin = Math.round(36 * scaleFactor);
      const bottomMargin = Math.round(36 * scaleFactor);

      const pageNum = index + 1;
      const totalPagesLabel = totalPages;
      const label = `Page ${pageNum} of ${totalPagesLabel}`;
      const textWidth = helveticaBold.widthOfTextAtSize(label, size);

      let x, y, textRotation;

      if (rotationAngle === 0 || rotationAngle === 360) {
        x = pageWidth - textWidth - rightMargin;
        y = bottomMargin;
        textRotation = 0;
      } else if (rotationAngle === 90) {
        x = pageHeight - bottomMargin;
        y = rightMargin;
        textRotation = -90;
      } else if (rotationAngle === 180) {
        x = rightMargin + textWidth;
        y = pageHeight - bottomMargin;
        textRotation = 180;
      } else if (rotationAngle === 270) {
        x = bottomMargin;
        y = pageWidth - rightMargin;
        textRotation = 90;
      } else {
        x = pageWidth - textWidth - rightMargin;
        y = bottomMargin;
        textRotation = 0;
      }

      // Ensure coordinates are valid
      if (!isNaN(x) && !isNaN(y)) {
        page.drawText(label, {
          x,
          y,
          size,
          font: helveticaBold,
          color: rgb(0, 0, 0),
          rotate: degrees(textRotation),
        });
      }
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
    const fileUrl = payload.fileUrl;
    const fileName = payload.fileName;
    const addCoverPage = Boolean(payload.addCoverPage);
    const addPageNumbers = Boolean(payload.addPageNumbers);
    const optimizePdf = Boolean(payload.optimizePdf);
    const applyOcr = payload.applyOcr !== false;
    const proofName = String(payload.proofName || '').trim();
    const formalName = String(payload.formalName || '').trim();
    const exhibitNumber = String(payload.exhibitNumber || '').trim();
    const proofCategory = String(payload.proofCategory || 'Exhibit').trim();

    if (!fileUrl) {
      return Response.json({ error: 'File URL is required.' }, { status: 400 });
    }

    if (!String(fileName || '').toLowerCase().endsWith('.pdf')) {
      return Response.json({ error: 'Only PDF files can be processed.' }, { status: 400 });
    }

    if (!addCoverPage && !addPageNumbers && !optimizePdf) {
      return Response.json({ error: 'Select at least one PDF processing option.' }, { status: 400 });
    }

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch PDF from URL.');
    }

    let nextBytes = new Uint8Array(await fileResponse.arrayBuffer());
    const alreadySearchable = applyOcr ? await isSearchablePdf(nextBytes) : true;

    if (applyOcr && !alreadySearchable) {
      nextBytes = await runAdobeOcr(nextBytes);
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
    const saveFolder = normalizePath(settings[0]?.dropbox_extract_folder || '/Case Presenter/Extracts');
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    await ensureDropboxFolder(accessToken, saveFolder);

    const outputName = `${getBaseName(fileName)}-extract.pdf`;
    const uploadedFile = await uploadDropboxFile(accessToken, `${saveFolder}/${outputName}`, nextBytes);

    return Response.json({
      file_source: 'dropbox',
      dropbox_file_id: uploadedFile.id,
      dropbox_path: uploadedFile.path_display,
      dropbox_file_name: uploadedFile.name,
      processed_file_name: uploadedFile.name,
      dropbox_folder_path: saveFolder,
      dropbox_folder_url: getDropboxFolderUrl(saveFolder),
      optimized_for_viewer: true,
      optimized_date: new Date().toISOString(),
      optimized_with_cover_page: addCoverPage,
      optimized_with_page_numbers: addPageNumbers,
      already_searchable: alreadySearchable,
      ocr_applied: applyOcr && !alreadySearchable,
      optimization_applied: optimizePdf,
    });
  } catch (error) {
    console.error('processExtractPdf failed', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});