export const plansKeys = {
  all: ["plans"],
  list: () => [...plansKeys.all, "all"],
  host: () => [...plansKeys.all, "host"],
  business: () => [...plansKeys.all, "business"],
  byCode: (code) => [...plansKeys.all, "code", code],
  byId: (id) => [...plansKeys.all, id],
};
