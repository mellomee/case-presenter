export function isDropboxProof(proof) {
  return proof?.file_source === 'dropbox' && Boolean(proof?.dropbox_file_id || proof?.dropbox_path);
}

export function proofHasLinkedFile(proof) {
  return Boolean(proof?.file_url || proof?.video_url || isDropboxProof(proof));
}

export function proofDisplayFileName(proof) {
  return proof?.dropbox_file_name || proof?.formal_name || proof?.file_url?.split('/').pop() || proof?.video_url?.split('/').pop() || '';
}