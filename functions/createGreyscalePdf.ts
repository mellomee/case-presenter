import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import AdobePdfServicesSdk from 'npm:@adobe/pdfservices-node-sdk@4.1.0';
import Jimp from 'npm:jimp@0.22.12';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';

const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFToImagesParams,
  ExportPDFToImagesTargetFormat,
  ExportPDFToImagesOutputType,
  ExportPDFToImagesJob,
  ExportPDFToImagesResult,
} = AdobePdfServicesSdk;

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
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
    throw new Error(data?.error_summary || 'Failed to upload greyscale PDF to Dropbox.');
  }

  return data;
}

async function downloadUrlFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download source PDF.');
  }
  return new Uint8Array(await response.arrayBuffer());
}

function getAdobeCredentials() {
  const clientId = Deno.env.get('ADOBE_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Adobe PDF credentials are missing.');
  }

  return new ServicePrincipalCredentials({ clientId, clientSecret });
}

async function exportPdfToImages(pdfBytes) {
  const credentials = getAdobeCredentials();
  const pdfServices = new PDFServices({ credentials });
  const inputAsset = await pdfServices.upload({
    readStream: Readable.from([pdfBytes]),
    mimeType: MimeType.PDF,
  });

  const params = new ExportPDFToImagesParams({
    targetFormat: ExportPDFToImagesTargetFormat.JPEG,
    outputType: ExportPDFToImagesOutputType.LIST_OF_PAGE_IMAGES,
  });

  const job = new ExportPDFToImagesJob({ inputAsset, params });
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: ExportPDFToImagesResult,
  });

  const pageAssets = pdfServicesResponse.result.assets || [];
  const pages = [];

  for (const asset of pageAssets) {
    const streamAsset = await pdfServices.getContent({ asset });
    const imageBytes = await streamToUint8Array(streamAsset.readStream);
    pages.push(imageBytes);
  }

  return pages;
}

async function convertImageToGreyscale(imageBytes) {
  const image = await Jimp.read(Buffer.from(imageBytes));
  image.greyscale().quality(60);

  return {
    width: image.bitmap.width,
    height: image.bitmap.height,
    bytes: await image.getBufferAsync(Jimp.MIME_JPEG),
  };
}

function bytesToDataUrl(bytes) {
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

async function buildGreyscalePdf(pdfBytes) {
  const exportedPages = await exportPdfToImages(pdfBytes);

  if (exportedPages.length === 0) {
    throw new Error('No pages were returned from Adobe conversion.');
  }

  const firstPage = await convertImageToGreyscale(exportedPages[0]);
  const firstOrientation = firstPage.width > firstPage.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation: firstOrientation,
    unit: 'px',
    format: [firstPage.width, firstPage.height],
    compress: true,
  });

  pdf.addImage(bytesToDataUrl(firstPage.bytes), 'JPEG', 0, 0, firstPage.width, firstPage.height, undefined, 'FAST');

  for (let index = 1; index < exportedPages.length; index += 1) {
    const page = await convertImageToGreyscale(exportedPages[index]);
    const orientation = page.width > page.height ? 'landscape' : 'portrait';
    pdf.addPage([page.width, page.height], orientation);
    pdf.addImage(bytesToDataUrl(page.bytes), 'JPEG', 0, 0, page.width, page.height, undefined, 'FAST');
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const proofId = payload.proofId;
    const proof = payload.proof;

    if (!proofId || !proof) {
      return Response.json({ error: 'A proof is required.' }, { status: 400 });
    }

    if (proof.file_type !== 'PDF') {
      return Response.json({ error: 'Only PDF proofs can be converted to greyscale.' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    const sourceBytes = proof.file_source === 'dropbox'
      ? await downloadDropboxFile(
          accessToken,
          proof.dropbox_file_id
            ? (String(proof.dropbox_file_id).startsWith('id:') ? proof.dropbox_file_id : `id:${proof.dropbox_file_id}`)
            : proof.dropbox_path
        )
      : await downloadUrlFile(proof.file_url);

    const outputBytes = await buildGreyscalePdf(sourceBytes);
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const saveFolder = normalizePath(settings[0]?.dropbox_save_folder || '/Case Presenter/OCR');
    await ensureDropboxFolder(accessToken, saveFolder);

    const baseName = (String(proof.formal_name || proof.name || 'proof').replace(/\.pdf$/i, '').trim() || 'proof')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ');
    const outputName = `${baseName}-greyscale.pdf`;
    const uploadedFile = await uploadDropboxFile(accessToken, `${saveFolder}/${outputName}`, outputBytes);

    await base44.asServiceRole.entities.Proof.update(proofId, {
      greyscale_dropbox_file_id: uploadedFile.id,
      greyscale_dropbox_path: uploadedFile.path_display,
      greyscale_dropbox_file_name: uploadedFile.name,
    });

    return Response.json({
      proof_id: proofId,
      greyscale_dropbox_file_id: uploadedFile.id,
      greyscale_dropbox_path: uploadedFile.path_display,
      greyscale_dropbox_file_name: uploadedFile.name,
    });
  } catch (error) {
    console.error('createGreyscalePdf failed', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});