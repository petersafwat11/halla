// Checkout has no queryable cache today — only the bundled-checkout
// mutation. Factory for symmetry.
export const checkoutKeys = {
  all: ["checkout"],
  quote: ({ planCode, addons, discountCode }) => [
    "checkout",
    "quote",
    planCode || null,
    addons || [],
    discountCode || null,
  ],
};
