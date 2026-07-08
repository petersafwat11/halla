export const discountsKeys = {
  all: ["discounts"],
  adminList: (filters) => [...discountsKeys.all, "admin", filters],
  detail: (id) => [...discountsKeys.all, "detail", id],
};
