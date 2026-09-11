import { getStaticAssetBaseUrl, resolveImageUrl } from '@halaa/shared/utils/media';

export const postEventMediaUrl = (value) => resolveImageUrl(value, {
  backendUrl: getStaticAssetBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'),
});
