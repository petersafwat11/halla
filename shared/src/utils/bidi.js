/**
 * Unicode BiDi directional isolation helpers.
 * Platform-independent (safe for Node, React Native, Web).
 */

export const LRI = "\u2066"; // Left-to-Right Isolate
export const RLI = "\u2067"; // Right-to-Left Isolate
export const FSI = "\u2068"; // First Strong Isolate
export const PDI = "\u2069"; // Pop Directional Isolate

/**
 * Wraps text with Left-to-Right Isolate marks.
 * Protects intrinsically LTR text (emails, phones, numbers, English tokens)
 * embedded inside Arabic/RTL copy from neutral character / punctuation BiDi spill.
 *
 * @param {string|number} text
 * @returns {string}
 */
export const isolateLtr = (text) => {
  if (text == null || text === "") return "";
  return `${LRI}${text}${PDI}`;
};

/**
 * Wraps text with Right-to-Left Isolate marks.
 *
 * @param {string|number} text
 * @returns {string}
 */
export const isolateRtl = (text) => {
  if (text == null || text === "") return "";
  return `${RLI}${text}${PDI}`;
};

/**
 * Wraps text with First Strong Isolate marks.
 *
 * @param {string|number} text
 * @returns {string}
 */
export const isolateAuto = (text) => {
  if (text == null || text === "") return "";
  return `${FSI}${text}${PDI}`;
};

// Arabic script ranges (base + supplements + presentation forms).
const ARABIC_STRONG_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
// Latin letter ranges (ASCII letters + Latin-1 supplement + extended).
const LATIN_STRONG_RE = /[A-Za-z\u00C0-\u024F]/;

/**
 * Pure first-strong direction resolver (remediation blueprint §5.1).
 *
 * Scans for the first strong Arabic or Latin character, ignoring whitespace,
 * digits, punctuation, emoji and symbols. Returns "rtl" for Arabic-script,
 * "ltr" for Latin-script, and the locale fallback when no strong character
 * exists (empty strings, digits-only input, emoji-only input).
 *
 * Platform-pure — safe for Node tests, React Native and web.
 *
 * @param {string} value - arbitrary user/backend content
 * @param {boolean} [fallbackIsRTL=true] - locale direction when no strong char
 * @returns {"rtl" | "ltr"}
 */
export const resolveStrongDirection = (value, fallbackIsRTL = true) => {
  const text = String(value ?? "");
  if (ARABIC_STRONG_RE.test(text)) return "rtl";
  if (LATIN_STRONG_RE.test(text)) return "ltr";
  return fallbackIsRTL ? "rtl" : "ltr";
};

/**
 * Wraps every match of an LTR-token regex with LTR isolates inside RTL copy.
 * Mirrors the legal renderer's approach for store names / URLs / emails that
 * appear inside translated Arabic sentences (blueprint §6).
 *
 * When `isRtl` is false (or there is nothing to protect) the text is returned
 * unchanged — Latin UI copy never needs inline isolation.
 *
 * @param {string} text
 * @param {RegExp} tokenRegex - global regex describing intrinsically LTR tokens
 * @param {boolean} [isRtl=true]
 * @returns {string}
 */
export const isolateLtrTokens = (text, tokenRegex, isRtl = true) => {
  const source = String(text ?? "");
  if (!source || !isRtl) return source;
  const flags = tokenRegex.flags.includes("g")
    ? tokenRegex.flags
    : `${tokenRegex.flags}g`;
  const globalRe = new RegExp(tokenRegex.source, flags);
  const parts = source.split(globalRe);
  const matches = source.match(globalRe);
  if (!matches) return source;
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(parts[i]);
    if (matches[i]) result.push(isolateLtr(matches[i]));
  }
  return result.join("");
};

export default {
  LRI,
  RLI,
  FSI,
  PDI,
  isolateLtr,
  isolateRtl,
  isolateAuto,
  resolveStrongDirection,
  isolateLtrTokens,
};
