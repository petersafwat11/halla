/**
 * @deprecated Phase 3 of the unification removed the fetch-based client.
 * Import the canonical axios pipeline from `./new-backend/apiClient`
 * (or the shape-compat `./new-backend/legacyAdapter` while migrating).
 *
 * This file now re-exports the legacy-shaped adapter so any straggler
 * import keeps working. Phase 8 will physically delete it.
 */
export {
  legacyClientAdapter as default,
  APIError,
} from "./new-backend/legacyAdapter";

// Legacy callers may import `getAuthToken` for display purposes. The
// HttpOnly cookie cannot be read from JS — this returns null.
export const getAuthToken = () => null;
export const makeAuthenticatedRequest = async (url, options = {}) => {
  const { legacyClientAdapter } = await import("./new-backend/legacyAdapter");
  return legacyClientAdapter[options.method?.toLowerCase?.() || "get"](
    url,
    options.body,
    options
  );
};
