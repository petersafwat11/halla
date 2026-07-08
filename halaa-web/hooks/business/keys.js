export const businessKeys = {
  all: ["business"],
  checkoutSummary: (token) => [...businessKeys.all, "checkout-summary", token],
};
