// @halla/shared — barrel.
// Re-exports the per-domain subpaths. Prefer subpath imports
// (`@halla/shared/api/paths`, `@halla/shared/schemas/events`) over this
// barrel in app code so bundlers can tree-shake.

export * as api from "./api/paths.js";
export * as errors from "./errors/index.js";
export * as constants from "./constants/index.js";
export * as utils from "./utils/index.js";
