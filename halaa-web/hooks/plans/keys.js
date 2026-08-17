export const plansKeys = {
  all: ["plans"],
  list: () => [...plansKeys.all, "all"],
  host: () => [...plansKeys.all, "host"],
  landing: () => [...plansKeys.all, "landing"],
  business: () => [...plansKeys.all, "business"],
};
