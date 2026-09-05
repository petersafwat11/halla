export const addonsKeys = {
  all: ["addons"],
  catalog: () => [...addonsKeys.all, "catalog"],
  my: (params) => [...addonsKeys.all, "my", params],
  adminFulfillment: (params) => [...addonsKeys.all, "adminFulfillment", params],
};
