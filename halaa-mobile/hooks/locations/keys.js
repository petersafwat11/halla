export const locationsKeys = {
  all: ["locations"],
  regions: () => [...locationsKeys.all, "regions"],
  cities: (regionId) => [...locationsKeys.all, "cities", regionId],
  districts: (cityId) => [...locationsKeys.all, "districts", cityId],
  allList: () => [...locationsKeys.all, "all"],
  search: (q) => [...locationsKeys.all, "search", q],
};
