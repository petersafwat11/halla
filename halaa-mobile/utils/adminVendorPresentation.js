// The query hook already unwraps the HTTP response's outer data object.
// Support legacy callers as well as the canonical { vendor } payload.
export const resolveAdminVendor = (response) =>
  response?.vendor || response?.data?.vendor || response?.data || response || null;

export const vendorApplicationStatus = (vendor) =>
  vendor?.vendorData?.vendorStatus || vendor?.roleData?.vendorStatus ||
  vendor?.profile?.vendorData?.vendorStatus || vendor?.vendorStatus || vendor?.status || "pending";

export const isVendorDocument = (url) => /\.(pdf|docx?)(?:[?#]|$)/i.test(url || "");
