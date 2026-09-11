/**
 * Admin payment-links money parsing.
 *
 * Accepts `amountSar` as a normalized decimal string and converts by string
 * parsing to integer halalas. Rejects grouping ambiguity, exponents, signs,
 * extra decimals, and out-of-range values before any provider I/O.
 *
 * Normalizes Arabic-Indic digits (٠-٩, ۰-۹) to Western digits and the Arabic
 * decimal separator (٫ U+066B, also ،-adjacent variants) to '.'.
 */

const { ValidationError } = require("../../shared/errors/errorTypes");

const { normalizeDigits: normalizeSharedDigits } = require("../../shared/utils/phone");

const normalizeDigits = (raw) => {
  let s = String(raw ?? "").trim();
  s = normalizeSharedDigits(s);
  // Arabic decimal separator U+066B and Arabic thousands U+066C handling:
  // allow '٫' as decimal point; reject '٬' (thousands) outright.
  if (/٬/.test(s)) {
    throw new ValidationError("amountSar must not contain grouping separators");
  }
  s = s.replace(/٫/g, ".");
  // Also normalize Arabic comma used as decimal by some keyboards.
  // Only when there is no '.' already and exactly one '،'/'٬'-like comma.
  // We are strict: reject commas to avoid grouping ambiguity.
  if (/[،,]/.test(s)) {
    throw new ValidationError("amountSar must not contain grouping separators");
  }
  return s;
};

const parseAmountSarToHalalas = (amountSar, { minSar = 1, maxSar = 50000 } = {}) => {
  if (amountSar === undefined || amountSar === null || String(amountSar).trim() === "") {
    throw new ValidationError("amountSar is required");
  }
  const s = normalizeDigits(amountSar);

  // Strict shape: digits with optional . + 1-2 decimals. No signs, exponents,
  // spaces, underscores, or grouping.
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new ValidationError(
      "amountSar must be a positive decimal with at most two fractional digits (e.g. 250, 250.5, 250.50)"
    );
  }
  const [whole, fracRaw = ""] = s.split(".");
  if (whole.length > 7) {
    throw new ValidationError("amountSar is out of range");
  }
  const frac = (fracRaw + "00").slice(0, 2);
  const halalas = Number(whole) * 100 + Number(frac);
  if (!Number.isSafeInteger(halalas) || halalas <= 0) {
    throw new ValidationError("amountSar must be greater than 0");
  }
  const minHalalas = Math.round(Number(minSar) * 100);
  const maxHalalas = Math.round(Number(maxSar) * 100);
  if (halalas < minHalalas) {
    throw new ValidationError(`amountSar must be at least ${minSar} SAR`);
  }
  if (halalas > maxHalalas) {
    throw new ValidationError(`amountSar must not exceed ${maxSar} SAR`);
  }
  return halalas;
};

const formatHalalasToSar = (halalas) => (halalas / 100).toFixed(2);

module.exports = { parseAmountSarToHalalas, formatHalalasToSar, normalizeDigits };
