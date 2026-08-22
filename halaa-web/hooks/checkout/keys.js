export const checkoutKeys = {
  all: ["checkout"],
  quotes: () => [...checkoutKeys.all, "quotes"],
  quote: (params = {}) => [...checkoutKeys.quotes(), params],
};
