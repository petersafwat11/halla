/**
 * Coarse error categorization used by both web's `parseError` and the
 * mobile equivalent. Pure constants — no runtime dependencies.
 */
export const ErrorTypes = {
  NETWORK: "NETWORK",
  VALIDATION: "VALIDATION",
  AUTH: "AUTH",
  NOT_FOUND: "NOT_FOUND",
  SERVER: "SERVER",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

export const STATUS_CODE_MESSAGES = {
  400: "errors.bad_request",
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.not_found",
  408: "errors.timeout",
  410: "errors.session_expired",
  422: "errors.validation_failed",
  429: "errors.rate_limit",
  500: "errors.server_error",
  502: "errors.bad_gateway",
  503: "errors.service_unavailable",
  504: "errors.gateway_timeout",
};

export const errorTypeFromStatus = (status) => {
  if (status >= 400 && status < 500) {
    if (status === 401 || status === 403) return ErrorTypes.AUTH;
    if (status === 404) return ErrorTypes.NOT_FOUND;
    if (status === 422) return ErrorTypes.VALIDATION;
    return ErrorTypes.VALIDATION;
  }
  if (status >= 500) return ErrorTypes.SERVER;
  return ErrorTypes.UNKNOWN;
};
