"use client";

import { parseError, ErrorTypes } from "@/services/errorHandlingService";

// Default retry configuration shared by all event mutation sub-hooks.
export const DEFAULT_RETRY_CONFIG = {
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

// Determine if an error should trigger a retry. Retries fire on network
// errors, timeouts and 5xx server errors only — 4xx client errors fail fast.
export const shouldRetry = (failureCount, error) => {
  if (failureCount >= 3) return false;
  const parsed = parseError(error);
  return (
    parsed.type === ErrorTypes.NETWORK ||
    parsed.type === ErrorTypes.TIMEOUT ||
    (parsed.status && parsed.status >= 500)
  );
};

// Build the final useMutation options object from a per-action config.
// Centralised so every sub-mutation gets the same retry/error contract.
export const buildMutationOptions = (mutationConfig) => ({
  ...mutationConfig,
  ...DEFAULT_RETRY_CONFIG,
  retry: shouldRetry,
  onError: () => {
    // Errors are surfaced to callers via mutateAsync rejection;
    // handleError() in each call-site provides user-facing feedback.
  },
});
