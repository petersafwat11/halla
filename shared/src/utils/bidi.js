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

export default {
  LRI,
  RLI,
  FSI,
  PDI,
  isolateLtr,
  isolateRtl,
  isolateAuto,
};
