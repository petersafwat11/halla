/**
 * Canonical error surface for both apps.
 *
 * - `ApiError`: structured error class thrown by both transport adapters.
 * - `apiErrorFromResponse` / `apiErrorFromTransport`: factory helpers.
 * - `authErrorMessage`: resolver for auth-namespace i18n keys.
 * - `ErrorTypes` / `STATUS_CODE_MESSAGES`: coarse categorization.
 */
export { ApiError, apiErrorFromResponse, apiErrorFromTransport } from "./ApiError.js";
export { authErrorMessage } from "./authErrorMessage.js";
export { ErrorTypes, STATUS_CODE_MESSAGES, errorTypeFromStatus } from "./errorTypes.js";
export { deriveSupportReference, presentError, formatErrorDisplay } from "./errorPresenter.js";
