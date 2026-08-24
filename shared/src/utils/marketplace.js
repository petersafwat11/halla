/**
 * Marketplace-specific media helpers. Thin wrapper around `getMediaUrl`
 * that derives the static-asset origin from an API base URL and returns
 * `null` (rather than an empty string) for missing inputs so consumers
 * can render a placeholder via `image ?? <Placeholder />` idioms.
 */

import { getMediaUrl, getStaticAssetBaseUrl } from "./media.js";
import { normalizePhoneNumber } from "./phone.js";

/**
 * @param {string|null|undefined} imagePath
 * @param {string|null|undefined} apiBaseUrl
 * @returns {string|null}
 */
export function getMarketplaceImageUrl(imagePath, apiBaseUrl) {
  if (!imagePath) return null;
  const resolved = getMediaUrl(imagePath, {
    fallback: null,
    staticAssetBaseUrl: getStaticAssetBaseUrl(apiBaseUrl),
  });
  return resolved || null;
}

export function normalizeWhatsAppNumber(value) {
  if (!value) return "";
  return normalizePhoneNumber(value);
}

export function buildVendorContactMessage({ language = "ar", vendorName, serviceName, price, currency, vendorUrl } = {}) {
  const isEnglish = String(language).toLowerCase().startsWith("en");
  const priceText = price != null ? ` (${price} ${currency || "SAR"})` : "";
  if (serviceName) {
    return isEnglish
      ? `Hello, I would like to ask about “${serviceName}”${priceText} from ${vendorName}. I found the service on Halaa: ${vendorUrl}`
      : `مرحباً، أرغب في الاستفسار عن خدمة «${serviceName}»${priceText} لدى ${vendorName}. شاهدت الخدمة عبر منصة هلا: ${vendorUrl}`;
  }
  return isEnglish
    ? `Hello, I would like to ask about the services offered by ${vendorName}. I found you on Halaa: ${vendorUrl}`
    : `مرحباً، أرغب في الاستفسار عن خدمات ${vendorName}. وجدتك عبر منصة هلا: ${vendorUrl}`;
}

export function buildWhatsAppUrl(number, message) {
  const normalized = normalizeWhatsAppNumber(number);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message || "")}` : null;
}
