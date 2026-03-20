import { base44 } from '@/api/base44Client';

export function isOptimizableDropboxPdf(proof) {
  return proof?.file_source === 'dropbox' && proof?.file_type === 'PDF' && !proof?.proof_child_type;
}

export function getPrimaryExhibitNumber(proof = {}) {
  if (!proof) return '';
  return proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.draft_exhibit_num || '';
}

export function buildProcessDropboxPdfPayload({ proof = null, file = null, options = {}, metadata = {} }) {
  const sourceFileId = file?.id || proof?.original_dropbox_file_id || proof?.dropbox_file_id || '';
  const sourcePath = file?.path_display || proof?.original_dropbox_path || proof?.dropbox_path || '';
  const sourceName = file?.name || proof?.original_dropbox_file_name || proof?.dropbox_file_name || metadata.proofName || 'document.pdf';

  return {
    fileId: sourceFileId,
    path: sourcePath,
    name: sourceName,
    addCoverPage: Boolean(options.addCoverPage),
    addPageNumbers: Boolean(options.addPageNumbers),
    optimizePdf: Boolean(options.optimizePdf),
    isExtract: Boolean(metadata.isExtract),
    proofName: metadata.proofName || proof?.name || sourceName.replace(/\.[^/.]+$/, ''),
    formalName: metadata.formalName || proof?.formal_name || '',
    proofCategory: metadata.proofCategory || proof?.proof_category || 'Exhibit',
    exhibitNumber: metadata.exhibitNumber || getPrimaryExhibitNumber(proof),
    // Pass comma-separated 1-based page numbers to extract from the source PDF
    extractPages: metadata.extractPages || null,
  };
}

export async function processDropboxPdf(payload) {
  const response = await base44.functions.invoke('processDropboxPdf', payload);
  return response.data;
}