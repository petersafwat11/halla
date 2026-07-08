export const discountsKeys = {
  all: ["discounts"],
  adminList: (params) => [...discountsKeys.all, "admin", params],
};
