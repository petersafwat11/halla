// Placeholder — Phase 1+ moves locale/date/direction/xlsx utils here.
export const sharedPing = () => "@halla/shared:ok";

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
