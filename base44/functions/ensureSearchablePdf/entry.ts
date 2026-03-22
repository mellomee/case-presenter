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

  const credentials = new ServicePrincipalCredentials({
    clientId,
    clientSecret,
  });

  const pdfServices = new PDFServices({ credentials });
  const readStream = Readable.from([pdfBytes]);

  const inputAsset = await pdfServices.upload({
    readStream,
    mimeType: MimeType.PDF,
  });

  const job = new OCRJob({ inputAsset });
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: OCRResult,
  });

  const resultAsset = pdfServicesResponse.result.asset;
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });

  return await streamToUint8Array(streamAsset.readStream);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'A PDF file upload is required.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return Response.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const alreadySearchable = await isSearchablePdf(originalBytes);
    const outputBytes = alreadySearchable ? originalBytes : await runAdobeOcr(originalBytes);

    const outputFile = new File(
      [outputBytes],
      alreadySearchable ? file.name : file.name.replace(/\.pdf$/i, '') + '-ocr.pdf',
      { type: 'application/pdf' }
    );

    const uploadResult = await base44.integrations.Core.UploadFile({ file: outputFile });

    return Response.json({
      file_url: uploadResult.file_url,
      already_searchable: alreadySearchable,
      ocr_applied: !alreadySearchable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});