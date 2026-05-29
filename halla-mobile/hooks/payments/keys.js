// `usePaymentPoll` is a useState-based hook (not React Query), so it
// doesn't use a queryKey. Factory exists for symmetry + future query hooks.
export const paymentsKeys = {
  all: ["payments"],
};
