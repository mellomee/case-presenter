import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isDropboxProof } from '@/components/proofVault/proofAssetUtils';

const prefetchedAssetUrls = new Set();

function preloadProofAsset(url, fileType) {
  if (!url || typeof window === 'undefined' || prefetchedAssetUrls.has(url)) return;

  prefetchedAssetUrls.add(url);

  if (fileType === 'Image') {
    const image = new Image();
    image.src = url;
    return;
  }

  fetch(url, { cache: 'force-cache' }).catch(() => {
    prefetchedAssetUrls.delete(url);
  });
}

export function getResolvedProofAssetQueryOptions(proof) {
  return {
    queryKey: ['resolvedProofAsset', proof?.id, proof?.dropbox_file_id, proof?.dropbox_path, proof?.updated_date],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDropboxTemporaryLink', {
        fileId: proof?.dropbox_file_id,
        path: proof?.dropbox_path,
      });

      const url = response.data?.url || '';
      preloadProofAsset(url, proof?.file_type);
      return url;
    },
    enabled: isDropboxProof(proof),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  };
}

export async function prefetchResolvedProofAsset(queryClient, proof) {
  if (!proof) return '';

  if (!isDropboxProof(proof)) {
    const directUrl = proof?.file_type === 'Video'
      ? (proof?.video_url || proof?.file_url || '')
      : (proof?.file_url || proof?.video_url || '');

    preloadProofAsset(directUrl, proof?.file_type);
    return directUrl;
  }

  const url = await queryClient.fetchQuery(getResolvedProofAssetQueryOptions(proof));
  preloadProofAsset(url, proof?.file_type);
  return url;
}

export default function useResolvedProofAsset(proof) {
  const isDropbox = isDropboxProof(proof);
  const directUrl = proof?.file_type === 'Video'
    ? (proof?.video_url || proof?.file_url || '')
    : (proof?.file_url || proof?.video_url || '');

  const query = useQuery(getResolvedProofAssetQueryOptions(proof));

  useEffect(() => {
    if (!isDropbox && directUrl) {
      preloadProofAsset(directUrl, proof?.file_type);
    }
  }, [isDropbox, directUrl, proof?.file_type]);

  return {
    url: isDropbox ? (query.data || '') : directUrl,
    isLoading: isDropbox ? query.isLoading : false,
    isDropbox,
    error: query.error,
  };
}