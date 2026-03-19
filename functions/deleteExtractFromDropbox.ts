import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const dropboxPath = payload.dropboxPath;

    if (!dropboxPath) {
      return Response.json({ error: 'Dropbox path is required.' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');

    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: dropboxPath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Failed to delete Dropbox file:', errorText);
      // Don't throw - file might already be deleted, but we still want to remove the record
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteExtractFromDropbox failed', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});