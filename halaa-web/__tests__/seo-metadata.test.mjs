/**
 * Metadata builder + hreflang reciprocity + JSON-LD safety tests
 * (SEO-ASO-METADATA-PLAN §3.2, §4, §10).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMetadata,
  ROUTE_CLASS,
  canonicalUrl,
  hreflangAlternates,
  CANONICAL_ORIGIN,
  safeJsonLd,
  pruneEmpty,
  BRAND_NAME,
} from "@halaa/shared/brand";

test("canonical origin is the infra-confirmed halaa.com.sa host", () => {
  assert.equal(CANONICAL_ORIGIN, "https://halaa.com.sa");
});

test("canonical URL builds locale-prefixed absolute URLs", () => {
  assert.equal(canonicalUrl("ar", ""), "https://halaa.com.sa/ar");
  assert.equal(canonicalUrl("en", "market-place"), "https://halaa.com.sa/en/market-place");
  assert.equal(canonicalUrl("en", "/market-place"), "https://halaa.com.sa/en/market-place");
});

test("hreflang alternates are reciprocal (ar, en, x-default->ar)", () => {
  const alt = hreflangAlternates("market-place");
  assert.equal(alt.ar, "https://halaa.com.sa/ar/market-place");
  assert.equal(alt.en, "https://halaa.com.sa/en/market-place");
  assert.equal(alt["x-default"], alt.ar, "x-default must point to the default locale (ar)");
});

test("buildMetadata: self-canonical matches the current locale", () => {
  const ar = buildMetadata({ lang: "ar", path: "market-place", title: "T", description: "D", routeClass: ROUTE_CLASS.MARKETPLACE });
  const en = buildMetadata({ lang: "en", path: "market-place", title: "T", description: "D", routeClass: ROUTE_CLASS.MARKETPLACE });
  assert.equal(ar.alternates.canonical, "https://halaa.com.sa/ar/market-place");
  assert.equal(en.alternates.canonical, "https://halaa.com.sa/en/market-place");
  // Reciprocal: each version lists itself + the other (no cross-canonicalization).
  assert.equal(ar.alternates.languages.en, en.alternates.canonical);
  assert.equal(en.alternates.languages.ar, ar.alternates.canonical);
});

test("buildMetadata: indexable route gets index:true, OG + twitter, brand siteName", () => {
  const m = buildMetadata({ lang: "en", path: "", title: "Landing", description: "Desc", routeClass: ROUTE_CLASS.LANDING });
  assert.equal(m.robots.index, true);
  assert.equal(m.openGraph.siteName, BRAND_NAME.siteName);
  assert.equal(m.openGraph.locale, "en_US");
  assert.equal(m.twitter.card, "summary_large_image");
  assert.ok(Array.isArray(m.openGraph.images) && m.openGraph.images.length > 0, "must have an OG image fallback");
});

test("buildMetadata: unknown route class defaults to noindex (default-deny)", () => {
  const m = buildMetadata({ lang: "ar", path: "secret", title: "X", description: "Y", routeClass: "unknown" });
  assert.equal(m.robots.index, false);
  assert.equal(m.robots.follow, false);
});

test("buildMetadata: brand siteName is 'Halaa' (never 'Halla')", () => {
  assert.equal(BRAND_NAME.siteName, "Halaa");
  const m = buildMetadata({ lang: "en", path: "", title: "T", description: "D", routeClass: ROUTE_CLASS.LANDING });
  assert.equal(m.openGraph.siteName, "Halaa");
});

// ---- JSON-LD attack-safe serialization ----

test("safeJsonLd escapes </script> injection via vendor-controlled strings", () => {
  const payload = { name: "Evil</script><script>alert(1)</script>", about: "a & b" };
  const out = safeJsonLd(payload);
  assert.equal(out.includes("</script>"), false, "must not contain a literal </script>");
  assert.ok(out.includes("\\u003c"), "< must be escaped to \\u003c");
  assert.ok(out.includes("\\u0026"), "& must be escaped to \\u0026");
  // Still valid JSON after unescaping the unicode.
  const parsed = JSON.parse(out);
  assert.equal(parsed.name, "Evil</script><script>alert(1)</script>");
});

test("safeJsonLd escapes U+2028/U+2029 (valid JSON, invalid JS)", () => {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const out = safeJsonLd({ x: `line${LS}sep${PS}end` });
  assert.equal(out.includes(LS), false, "raw U+2028 must not survive");
  assert.equal(out.includes(PS), false, "raw U+2029 must not survive");
  assert.ok(out.includes("\\u2028") && out.includes("\\u2029"));
});

test("pruneEmpty drops null/undefined/empty and keeps real values", () => {
  const pruned = pruneEmpty({
    a: "x",
    b: null,
    c: undefined,
    d: "",
    e: { f: null, g: "y" },
    h: {},
    arr: [1, null, ""],
  });
  assert.deepEqual(pruned, { a: "x", e: { g: "y" }, arr: [1] });
});
