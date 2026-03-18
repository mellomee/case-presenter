import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isDropboxProof } from '@/components/proofVault/proofAssetUtils';

export default function useResolvedProofAsset(proof) {
  const preferredDropboxFileId = proof?.greyscale_dropbox_file_id || proof?.dropbox_file_id;
  const preferredDropboxPath = proof?.greyscale_dropbox_path || proof?.dropbox_path;
  const isDropbox = Boolean(preferredDropboxFileId || preferredDropboxPath || isDropboxProof(proof));

  const query = useQuery({
    queryKey: ['resolvedProofAsset', proof?.id, preferredDropboxFileId, preferredDropboxPath, proof?.updated_date],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDropboxTemporaryLink', {
        fileId: preferredDropboxFileId,
        path: preferredDropboxPath,
      });
      return response.data?.url || '';
    },
    enabled: isDropbox,
    staleTime: 1000 * 60 * 3,
  });

  return {
    url: isDropbox ? (query.data || '') : (proof?.video_url || proof?.file_url || ''),
    isLoading: isDropbox ? query.isLoading : false,
    isDropbox,
    error: query.error,
  };
}