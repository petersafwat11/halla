export const sharedPing = () => "@halaa/shared:ok";

export {
  getMarketplaceImageUrl,
  normalizeWhatsAppNumber,
  buildVendorContactMessage,
  buildWhatsAppUrl,
} from "./marketplace.js";
export { getMediaUrl, getStaticAssetBaseUrl, keyFromSignedUrl, resolveImageUrl } from "./media.js";
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
  normalizeDigits,
  normalizeDigitsOnly,
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
  toInvitationSettingsDTO,
  toPlanPresentationDTO,
} from "./adapters.js";
export {
  eventKeys,
  guestKeys,
  ticketKeys,
  planKeys,
  vendorServiceKeys,
  subscriptionKeys,
  hostKeys,
  businessKeys,
  vendorKeys,
  moderatorKeys,
  adminQueryKeys,
  publicVendorKeys,
  marketplaceKeys,
} from "./queryKeys.js";
export {
  EVENT_UPDATE_SECTION_TO_STEP,
  parseUpdateEventStep,
  buildUpdateEventUrl,
  buildSettingsUrl,
  buildDashboardUrl,
  buildEventsUrl,
  buildMarketplaceUrl,
  buildMarketplaceVendorUrl,
} from "./routes.js";
export {
  normalizePhoneNumber,
  toE164,
  validateAndFormatPhone,
  isValidPhone,
  formatPhoneDisplay,
} from "./phone.js";
export {
  round2,
  toHalalas,
  halalasToSar,
  formatSar,
  allocateDiscount,
  buildCheckoutQuote,
} from "./money.js";
export {
  formatExpiryInput,
  parseCardExpiry,
  validateCardExpiry,
  checkLuhn,
  detectCardBrand,
  buildCreditCardSource,
} from "./card.js";

