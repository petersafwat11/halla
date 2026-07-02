/**
 * @halla/shared/brand/jsonld — attack-safe JSON-LD serialization
 * (SEO-ASO-METADATA-PLAN §4 "safely serialize JSON-LD by escaping
 * `<`/script-breaking sequences").
 *
 * `JSON.stringify` alone is NOT safe to inject via `dangerouslySetInnerHTML`
 * into a `<script>` block: a value containing `</script>` (e.g. a vendor's
 * `brandName`/`about`) closes the tag early and enables XSS. `<!--` can also
 * start an HTML comment inside the script. We escape:
 *   - `<`  -> <  (breaks `</script>` and `<!--`)
 *   - `>`  -> >  (defense in depth)
 *   - `&`  -> &
 *   - U+2028 / U+2029 line/paragraph separators (valid JSON, invalid JS string)
 *
 * The separator code points are built via `String.fromCharCode` so no literal
 * U+2028/U+2029 ever appears in this source file (a literal U+2028 is itself a
 * JS line terminator and would corrupt the module).
 *
 * Consumers must use the returned string verbatim as the script's innerHTML.
 */

const LS = String.fromCharCode(0x2028); // U+2028 line separator
const PS = String.fromCharCode(0x2029); // U+2029 paragraph separator

const REPLACERS = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LS]: "\\u2028",
  [PS]: "\\u2029",
};

const UNSAFE_RE = new RegExp(`[<>&${LS}${PS}]`, "g");

/**
 * Serialize a value to a JSON string safe for inline `<script type="application/ld+json">`.
 * @param {unknown} value plain object (already restricted to public fields)
 * @returns {string}
 */
export function safeJsonLd(value) {
  return JSON.stringify(value).replace(UNSAFE_RE, (ch) => REPLACERS[ch]);
}

/** Recursively drop null/undefined/empty-string keys so JSON-LD stays clean. */
export function pruneEmpty(obj) {
  if (Array.isArray(obj)) {
    const arr = obj.map(pruneEmpty).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const pv = pruneEmpty(v);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (obj === null || obj === "") return undefined;
  return obj;
}

export default { safeJsonLd, pruneEmpty };
