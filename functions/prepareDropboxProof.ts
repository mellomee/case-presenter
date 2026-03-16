import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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
} = AdobePdfServicesSdk;

const SEARCHABLE_TEXT_THRESHOLD = 20;

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

async function isSearchablePdf(pdfBytes) {
  try {
    const parsed = await pdfParse(Buffer.from(pdfBytes));
    const normalizedText = (parsed.text || '').replace(/\s+/g, '');
    return normalizedText.length > SEARCHABLE_TEXT_THRESHOLD;
  } catch {
    return false;
  }
}

async function runAdobeOcr(pdfBytes) {
  const clientId = Deno.env.get('ADOBE_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Adobe PDF credentials are missing.');
  }

  const credentials = new ServicePrincipalCredentials({ clientId, clientSecret });
  const pdfServices = new PDFServices({ credentials });
  const inputAsset = await pdfServices.upload({
    readStream: Readable.from([pdfBytes]),
    mimeType: MimeType.PDF,
  });

  const job = new OCRJob({ inputAsset });
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({ pollingURL, resultType: OCRResult });
  const streamAsset = await pdfServices.getContent({ asset: pdfServicesResponse.result.asset });

  return await streamToUint8Array(streamAsset.readStream);
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
    throw new Error(data?.error_summary || 'Failed to upload OCR PDF back to Dropbox.');
  }

  return data;
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

    if (!fileId && !originalPath) {
      return Response.json({ error: 'A Dropbox file is required.' }, { status: 400 });
    }

    const sourceReference = fileId ? `id:${fileId}` : originalPath;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');

    if (!fileName?.toLowerCase().endsWith('.pdf')) {
      return Response.json({
        file_source: 'dropbox',
        dropbox_file_id: fileId || null,
        dropbox_path: originalPath || null,
        dropbox_file_name: fileName || null,
        already_searchable: null,
        ocr_applied: false,
      });
    }

    const originalBytes = await downloadDropboxFile(accessToken, sourceReference);
    const alreadySearchable = await isSearchablePdf(originalBytes);

    if (alreadySearchable) {
      return Response.json({
        file_source: 'dropbox',
        dropbox_file_id: fileId || null,
        dropbox_path: originalPath || null,
        dropbox_file_name: fileName || null,
        already_searchable: true,
        ocr_applied: false,
      });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const saveFolder = normalizePath(settings[0]?.dropbox_save_folder || '/Case Presenter/OCR');
    await ensureDropboxFolder(accessToken, saveFolder);

    const outputBytes = await runAdobeOcr(originalBytes);
    const outputName = fileName.replace(/\.pdf$/i, '') + '-ocr.pdf';
    const uploadedFile = await uploadDropboxFile(accessToken, `${saveFolder}/${outputName}`, outputBytes);

    return Response.json({
      file_source: 'dropbox',
      dropbox_file_id: uploadedFile.id,
      dropbox_path: uploadedFile.path_display,
      dropbox_file_name: uploadedFile.name,
      already_searchable: false,
      ocr_applied: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});