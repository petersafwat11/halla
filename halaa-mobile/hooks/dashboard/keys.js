export const dashboardKeys = {
  all: ["dashboard"],
  host: () => [...dashboardKeys.all, "host"],
  admin: (period) => [...dashboardKeys.all, "admin", period],
};
