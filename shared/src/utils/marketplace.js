/**
 * Marketplace-specific media helpers. Thin wrapper around `getMediaUrl`
 * that derives the static-asset origin from an API base URL and returns
 * `null` (rather than an empty string) for missing inputs so consumers
 * can render a placeholder via `image ?? <Placeholder />` idioms.
 */

import { getMediaUrl, getStaticAssetBaseUrl } from "./media.js";

/**
 * @param {string|null|undefined} imagePath
 * @param {string|null|undefined} apiBaseUrl
 * @returns {string|null}
 */
export function getMarketplaceImageUrl(imagePath, apiBaseUrl) {
  if (!imagePath) return null;
  const resolved = getMediaUrl(imagePath, {
    fallback: null,
    staticAssetBaseUrl: getStaticAssetBaseUrl(apiBaseUrl),
  });
  return resolved || null;
}
