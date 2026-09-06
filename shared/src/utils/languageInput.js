const ARABIC_CHARS = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const LATIN_CHARS = /[A-Za-z]/;

// Keep whitespace, numbers and common punctuation, but remove letters from
// the other writing system. These are UI guards; the schema below remains the
// authoritative validation boundary.
export const sanitizeArabicText = (value = "") =>
  String(value).replace(/[A-Za-z]/g, "");

export const sanitizeEnglishText = (value = "") =>
  String(value).replace(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g, "");

export const containsOnlyArabicText = (value = "") => {
  const text = String(value).trim();
  return !text || (ARABIC_CHARS.test(text) && !LATIN_CHARS.test(text));
};

export const containsOnlyEnglishText = (value = "") => {
  const text = String(value).trim();
  return !text || (LATIN_CHARS.test(text) && !ARABIC_CHARS.test(text));
};
