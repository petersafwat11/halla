export const sharedPing = () => "@halaa/shared:ok";

export {
  getMarketplaceImageUrl,
  normalizeWhatsAppNumber,
  buildVendorContactMessage,
  buildWhatsAppUrl,
} from "./marketplace.js";
export { getMediaUrl, getStaticAssetBaseUrl } from "./media.js";
export { useDebounce } from "./useDebounce.js";
export {
  formatTimeAgo,
  getNotificationIcon,
  getPriorityColor,
} from "./notification.js";
export {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
} from "./resolveTaqnyatPlaceholders.js";
export {
  LRI,
  RLI,
  FSI,
  PDI,
  isolateLtr,
  isolateRtl,
  isolateAuto,
} from "./bidi.js";
export {
  formatNumber,
  formatCount,
  formatPercent,
  formatCurrency,
  localizeDigits,
  formatDate,
  formatTime,
  formatDateTime,
  formatLocation,
  formatGuestCount,
  getLocalized,
} from "./locale.js";
export { resolveDirectionalIconName } from "./directionalIcons.js";
export {
  normalizeId,
  toGuestDTO,
  toTicketDTO,
  normalizeSubscriptionResponse,
  toSubscriptionDTO,
  toBulkIdsPayload,
} from "./adapters.js";
export {
  eventKeys,
  guestKeys,
  ticketKeys,
  planKeys,
  vendorServiceKeys,
  subscriptionKeys,
} from "./queryKeys.js";
