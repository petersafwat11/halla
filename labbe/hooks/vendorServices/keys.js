export const vendorServicesKeys = {
  all: ["vendor-services"],
  publicList: (params) => [...vendorServicesKeys.all, "public", params],
  myList: () => [...vendorServicesKeys.all, "my-services"],
  stats: () => [...vendorServicesKeys.all, "stats"],
  detail: (serviceId) => [...vendorServicesKeys.all, serviceId],
};
