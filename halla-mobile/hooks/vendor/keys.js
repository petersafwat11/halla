export const vendorKeys = {
  all: ["vendor"],
  profile: () => [...vendorKeys.all, "profile"],
  stats: () => [...vendorKeys.all, "stats"],
  services: () => [...vendorKeys.all, "services"],
  tickets: (params) => [...vendorKeys.all, "tickets", params],
};
