/**
 * Server-side UGC text filter (SHIP §6).
 *
 * A modest, high-precision prohibited-term list as the first line of defense on
 * user-submitted text (comments, etc.). This is a PLUGGABLE hook — swap in a
 * managed moderation service later without changing call sites. Matching is
 * normalized for case, Arabic diacritics/letter-variants, and elongation so
 * trivial obfuscation doesn't slip through. Keep the lists short + precise to
 * avoid false positives; expand via the moderation owner's review (EXTERNAL §6).
 */

// Starter lists — clearly-prohibited slurs / explicit terms. Intentionally
// small; the moderation owner curates the production list.
const EN_TERMS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "nigger",
  "faggot",
  "whore",
  "rape",
  "kike",
  "retard",
];

const AR_TERMS = [
  "كلب",
  "حقير",
  "عاهرة",
  "شرموط",
  "خنزير",
  "لعنة",
];

const stripDiacritics = (s) =>
  s.replace(/[ؐ-ًؚ-ٰٟ]/g, "");

const normalize = (s = "") =>
  stripDiacritics(String(s).toLowerCase())
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/(.)\1{2,}/g, "$1$1") // collapse elongation (e.g. "baaaad")
    // Treat punctuation/separators as word boundaries so "shit!" still matches
    // but "grape" never matches "rape".
    .replace(/[\s_\-.*!?,؛،"'()[\]{}:;/\\|@#]+/g, " ")
    .trim();

const NORMALIZED_TERMS = [...EN_TERMS, ...AR_TERMS].map(normalize);

/**
 * Word-boundary match only (no unbounded substring) so benign words containing
 * a banned substring (grape⊃rape, therapist⊃…) are NOT false-positived.
 * @param {string} text
 * @returns {{ blocked: boolean, matches: string[] }}
 */
const containsProhibited = (text) => {
  if (!text) return { blocked: false, matches: [] };
  const n = ` ${normalize(text)} `;
  const matches = NORMALIZED_TERMS.filter(
    (term) => term && n.includes(` ${term} `)
  );
  return { blocked: matches.length > 0, matches };
};

module.exports = { containsProhibited, normalizeForFilter: normalize };
