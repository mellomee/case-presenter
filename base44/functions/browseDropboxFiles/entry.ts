import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FILE_EXTENSIONS = {
  PDF: ['pdf'],
  Image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'],
  Video: ['mp4', 'mov', 'avi', 'm4v', 'webm', 'mpeg', 'mpg', 'wmv', 'mkv'],
};

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const currentPath = normalizePath(payload.path || '');
    const fileType = payload.fileType;
    const allowedExtensions = FILE_EXTENSIONS[fileType] || null;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: currentPath,
        recursive: false,
        include_mounted_folders: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error_summary || 'Failed to browse Dropbox files.');
    }

    const entries = (data.entries || [])
      .filter((entry) => {
        if (entry['.tag'] === 'folder') return true;
        if (!allowedExtensions) return true;
        const extension = (entry.name.split('.').pop() || '').toLowerCase();
        return allowedExtensions.includes(extension);
      })
      .sort((a, b) => {
        if (a['.tag'] === 'folder' && b['.tag'] !== 'folder') return -1;
        if (a['.tag'] !== 'folder' && b['.tag'] === 'folder') return 1;
        return a.name.localeCompare(b.name);
      })
      .map((entry) => ({
        id: entry.id || entry.path_display,
        type: entry['.tag'],
        name: entry.name,
        path_display: entry.path_display,
        path_lower: entry.path_lower,
        size: entry.size || null,
      }));

    return Response.json({ currentPath, entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});