import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const fileReference = payload.fileId
      ? (String(payload.fileId).startsWith('id:') ? payload.fileId : `id:${payload.fileId}`)
      : payload.path;

    if (!fileReference) {
      return Response.json({ error: 'A Dropbox file reference is required.' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fileReference }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error_summary || 'Failed to create a Dropbox file link.');
    }

    return Response.json({ url: data.link, metadata: data.metadata || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});