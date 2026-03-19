import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isDropboxProof } from '@/components/proofVault/proofAssetUtils';

export default function useResolvedProofAsset(proof) {
  const isDropbox = isDropboxProof(proof);
  
  // For extracts, use the extract's own processed file, not the parent's
  const isExtract = proof?.proof_child_type === 'Extract';
  const fileIdToUse = isExtract ? proof?.dropbox_file_id : proof?.dropbox_file_id;
  const pathToUse = isExtract ? proof?.dropbox_path : proof?.dropbox_path;

  const query = useQuery({
    queryKey: ['resolvedProofAsset', proof?.id, fileIdToUse, pathToUse, proof?.updated_date],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDropboxTemporaryLink', {
        fileId: fileIdToUse,
        path: pathToUse,
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