import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import PDFServicesSdk from 'npm:@adobe/pdfservices-node-sdk@4.1.0';
import { createReadStream } from 'node:fs';

const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  PageRanges,
  DeletePagesJob,
  DeletePagesParams,
  DeletePagesResult,
  OCRJob,
  OCRParams,
  OCRResult,
} = PDFServicesSdk;

function sortUniquePages(pages = []) {
  return [...new Set((pages || [])
    .map((page) => Number(page))
    .filter((page) => Number.isInteger(page) && page > 0))].sort((a, b) => a - b);
}

function formatPageSelection(pages = []) {
  if (!pages.length) return '';

  const ranges = [];
  let start = pages[0];
  let end = pages[0];

  for (let i = 1; i < pages.length; i += 1) {
    const page = pages[i];
    if (page === end + 1) {
      end = page;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = page;
      end = page;
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

function buildDeletionRanges(totalPages, selectedPages) {
  const pageRanges = new PageRanges();
  let hasDeletedPages = false;

  for (let page = 1; page <= totalPages; page += 1) {
    if (!selectedPages.includes(page)) {
      pageRanges.addSinglePage(page);
      hasDeletedPages = true;
    }
  }

  return { pageRanges, hasDeletedPages };
}

function sanitizeFileName(name = 'Extract') {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'Extract';
}

async function streamToUint8Array(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    if (chunk instanceof Uint8Array) {
      chunks.push(chunk);
    } else if (typeof chunk === 'string') {
      chunks.push(new TextEncoder().encode(chunk));
    } else {
      chunks.push(new Uint8Array(chunk));
    }
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function writeTempFile(path, bytes) {
  await Deno.writeFile(path, bytes);
  return path;
}

async function runDeletePages(pdfServices, inputPath, pageRanges) {
  const inputAsset = await pdfServices.upload({
    readStream: createReadStream(inputPath),
    mimeType: MimeType.PDF,
  });

  const params = new DeletePagesParams({ pageRanges });
  const job = new DeletePagesJob({ inputAsset, params });
  const pollingURL = await pdfServices.submit({ job });
  const response = await pdfServices.getJobResult({
    pollingURL,
    resultType: DeletePagesResult,
  });
  const streamAsset = await pdfServices.getContent({ asset: response.result.asset });
  return streamToUint8Array(streamAsset.readStream);
}

async function runOcr(pdfServices, inputPath) {
  const inputAsset = await pdfServices.upload({
    readStream: createReadStream(inputPath),
    mimeType: MimeType.PDF,
  });

  const params = new OCRParams({});
  const job = new OCRJob({ inputAsset, params });
  const pollingURL = await pdfServices.submit({ job });
  const response = await pdfServices.getJobResult({
    pollingURL,
    resultType: OCRResult,
  });
  const streamAsset = await pdfServices.getContent({ asset: response.result.asset });
  return streamToUint8Array(streamAsset.readStream);
}

async function uploadToDropbox(base44, bytes, fileName, rootPath) {
  if (!rootPath) {
    return { status: 'skipped', dropbox_file_id: null, dropbox_file_path: null };
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
  const cleanRoot = `/${rootPath.replace(/^\/+|\/+$/g, '')}`;
  const requestedPath = `${cleanRoot}/${fileName}`;

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: requestedPath,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false,
      }),
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new Error(`Dropbox upload failed: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    status: 'uploaded',
    dropbox_file_id: data.id || null,
    dropbox_file_path: data.path_display || data.path_lower || requestedPath,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceFileUrl, selectedPages, totalPages, fileName } = await req.json();
    const normalizedPages = sortUniquePages(selectedPages);

    if (!sourceFileUrl) {
      return Response.json({ error: 'sourceFileUrl is required' }, { status: 400 });
    }

    if (!normalizedPages.length) {
      return Response.json({ error: 'selectedPages is required' }, { status: 400 });
    }

    if (!Number.isInteger(totalPages) || totalPages < normalizedPages[normalizedPages.length - 1]) {
      return Response.json({ error: 'totalPages must include all selected pages' }, { status: 400 });
    }

    const adobeClientId = Deno.env.get('ADOBE_CLIENT_ID');
    const adobeClientSecret = Deno.env.get('ADOBE_CLIENT_SECRET');

    if (!adobeClientId || !adobeClientSecret) {
      return Response.json({ error: 'Adobe credentials are missing' }, { status: 500 });
    }

    const sourceResponse = await fetch(sourceFileUrl);
    if (!sourceResponse.ok) {
      return Response.json({ error: 'Could not download source PDF' }, { status: 400 });
    }

    const sourceBytes = new Uint8Array(await sourceResponse.arrayBuffer());
    const inputPath = '/tmp/source-extract.pdf';
    const selectedPath = '/tmp/selected-pages.pdf';
    const ocrInputPath = '/tmp/ocr-input.pdf';

    await writeTempFile(inputPath, sourceBytes);

    const credentials = new ServicePrincipalCredentials({
      clientId: adobeClientId,
      clientSecret: adobeClientSecret,
    });
    const pdfServices = new PDFServices({ credentials });

    const { pageRanges, hasDeletedPages } = buildDeletionRanges(totalPages, normalizedPages);
    let selectedBytes = sourceBytes;

    if (hasDeletedPages) {
      selectedBytes = await runDeletePages(pdfServices, inputPath, pageRanges);
    }

    await writeTempFile(selectedPath, selectedBytes);
    await writeTempFile(ocrInputPath, selectedBytes);

    const ocrBytes = await runOcr(pdfServices, ocrInputPath);
    const cleanName = `${sanitizeFileName(fileName)}-${Date.now()}.pdf`;
    const file = new File([ocrBytes], cleanName, { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    const appSettings = await base44.asServiceRole.entities.AppSettings.list();
    const dropboxRootPath = appSettings[0]?.dropbox_root_path || '';

    let dropboxResult = {
      status: 'skipped',
      dropbox_file_id: null,
      dropbox_file_path: null,
      error: null,
    };

    if (dropboxRootPath) {
      try {
        const uploaded = await uploadToDropbox(base44, ocrBytes, cleanName, dropboxRootPath);
        dropboxResult = { ...uploaded, error: null };
      } catch (error) {
        dropboxResult = {
          status: 'error',
          dropbox_file_id: null,
          dropbox_file_path: null,
          error: error.message,
        };
      }
    }

    return Response.json({
      file_url: uploadResult.file_url,
      extract_pages: formatPageSelection(normalizedPages),
      page_list: normalizedPages,
      dropbox_file_id: dropboxResult.dropbox_file_id,
      dropbox_file_path: dropboxResult.dropbox_file_path,
      dropbox_upload_status: dropboxResult.status,
      dropbox_error: dropboxResult.error,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});