import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CLIENT_ID = Deno.env.get('ADOBE_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('ADOBE_CLIENT_SECRET');

async function getAdobeToken() {
  const res = await fetch('https://pdf-services-ue1.adobe.io/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Adobe auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function checkPdfHasText(fileUrl) {
  try {
    const { getDocument } = await import('npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs');
    const pdf = await getDocument(fileUrl).promise;
    const page = await pdf.getPage(1);
    const tc = await page.getTextContent();
    const text = tc.items.map((i) => i.str).join('').trim();
    return text.length > 20;
  } catch {
    return false;
  }
}

async function uploadToAdobe(token, fileUrl) {
  // Fetch the file
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error('Failed to fetch PDF file');
  const fileBuffer = await fileRes.arrayBuffer();

  // Get upload URI
  const uploadRes = await fetch('https://pdf-services-ue1.adobe.io/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': CLIENT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mediaType: 'application/pdf' }),
  });
  if (!uploadRes.ok) throw new Error(`Adobe upload URI failed: ${await uploadRes.text()}`);
  const { uploadUri, assetID } = await uploadRes.json();

  // Upload file bytes
  const putRes = await fetch(uploadUri, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: fileBuffer,
  });
  if (!putRes.ok) throw new Error(`Adobe PUT upload failed: ${putRes.status}`);

  return assetID;
}

async function runOcr(token, assetID) {
  const res = await fetch('https://pdf-services-ue1.adobe.io/operation/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': CLIENT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetID,
      ocrLang: 'en-US',
    }),
  });
  if (!res.ok) throw new Error(`OCR job failed: ${await res.text()}`);
  const location = res.headers.get('location');
  if (!location) throw new Error('No job location returned');
  return location;
}

async function pollJob(token, location) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(location, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': CLIENT_ID,
      },
    });
    const data = await res.json();
    if (data.status === 'done') return data.asset.assetID;
    if (data.status === 'failed') throw new Error('OCR job failed on Adobe side');
  }
  throw new Error('OCR job timed out');
}

async function downloadOcrResult(token, assetID) {
  const res = await fetch(`https://pdf-services-ue1.adobe.io/assets/${assetID}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': CLIENT_ID,
    },
  });
  if (!res.ok) throw new Error('Failed to get asset download URI');
  const { downloadUri } = await res.json();
  const fileRes = await fetch(downloadUri);
  if (!fileRes.ok) throw new Error('Failed to download OCR result');
  return await fileRes.arrayBuffer();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Check if PDF already has text
    const hasText = await checkPdfHasText(file_url);
    if (hasText) {
      return Response.json({ file_url, ocr_applied: false });
    }

    // Run Adobe OCR
    const token = await getAdobeToken();
    const assetID = await uploadToAdobe(token, file_url);
    const jobLocation = await runOcr(token, assetID);
    const resultAssetID = await pollJob(token, jobLocation);
    const ocrBuffer = await downloadOcrResult(token, resultAssetID);

    // Upload OCR'd PDF back to Base44
    const blob = new Blob([ocrBuffer], { type: 'application/pdf' });
    const { file_url: ocr_file_url } = await base44.integrations.Core.UploadFile({ file: blob });

    return Response.json({ file_url: ocr_file_url, ocr_applied: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});