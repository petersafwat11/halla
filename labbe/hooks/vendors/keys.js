export const vendorsKeys = {
  all: ["vendors"],
  categories: () => [...vendorsKeys.all, "categories"],
  publicList: (filters) => [...vendorsKeys.all, "public", filters],
};
