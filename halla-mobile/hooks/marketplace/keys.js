export const marketplaceKeys = {
  all: ["marketplace"],
  vendors: (filters) => [...marketplaceKeys.all, "vendors", filters],
  categories: () => [...marketplaceKeys.all, "categories"],
};
