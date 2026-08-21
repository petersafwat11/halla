/**
 * Cross-app media URL helpers.
 *
 * Both apps need to resolve a stored media reference (S3/CloudFront URL,
 * backend-relative `/uploads/...` path, or a hand-uploaded `File`/`Blob`)
 * to something the platform's image renderer can consume. Web reads from
 * `NEXT_PUBLIC_BACKEND_URL`; mobile strips the `/api/v2` suffix from its
 * `API_BASE_URL`. To keep this module platform-agnostic, callers pass
 * the resolved static-asset origin in via `staticAssetBaseUrl`.
 */

/**
 * Derive the static-asset origin from an API base URL by stripping the
 * versioned API suffix (`/api/v2`, `/api/v3`, ...). Returns the empty
 * string for falsy input.
 *
 * @param {string|undefined|null} apiBaseUrl
 * @returns {string}
 */
export function getStaticAssetBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) return "";
  return apiBaseUrl.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
}

/**
 * Resolve a media reference to a renderable URL.
 *
 * - Fully-qualified URLs pass through.
 * - Backend-relative paths (`/uploads/...`) are joined with
 *   `staticAssetBaseUrl` when one is provided; otherwise returned as-is.
 * - `File` / `Blob` instances are NOT converted to object URLs (caller
 *   must do so explicitly so they can `URL.revokeObjectURL` later).
 *
 * @param {string|File|Blob|null|undefined} pathOrUrl
 * @param {{ fallback?: string|null, staticAssetBaseUrl?: string }} [opts]
 * @returns {string|null}
 */
export function getMediaUrl(pathOrUrl, opts = {}) {
  const { fallback = "", staticAssetBaseUrl = "" } = opts;
  if (!pathOrUrl) return fallback;
  if (typeof pathOrUrl !== "string") return fallback;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) {
    const origin = staticAssetBaseUrl.replace(/\/$/, "");
    return origin ? `${origin}${pathOrUrl}` : pathOrUrl;
  }
  return pathOrUrl;
}

export function keyFromSignedUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const path = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    return path ? decodeURIComponent(path) : null;
  } catch {
    // If it's not a full URL, strip leading slash and query
    const clean = url.split("?")[0].replace(/^\//, "");
    return clean || null;
  }
}

/**
 * Resolve an image value to a renderable URL with an optional fallback.
 *
 * @param {string|null|undefined} imagePath
 * @param {{ fallback?: string, backendUrl?: string }} [opts]
 * @returns {string|null}
 */
export function resolveImageUrl(imagePath, opts = {}) {
  const { fallback = null, backendUrl = "" } = opts;
  if (!imagePath || typeof imagePath !== "string") return fallback;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/uploads/")) {
    const origin = (backendUrl || "").replace(/\/$/, "");
    return origin ? `${origin}${imagePath}` : imagePath;
  }
  if (imagePath.startsWith("uploads/")) {
    const origin = (backendUrl || "").replace(/\/$/, "");
    return origin ? `${origin}/${imagePath}` : `/${imagePath}`;
  }
  return fallback;
}

