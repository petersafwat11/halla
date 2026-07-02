/**
 * Sitemap + robots offline-safety tests (SEO-ASO-METADATA-PLAN §3.3, §10).
 * Verifies the offline build contract: sitemap always emits the static public
 * set with reciprocal alternates and never throws when the backend is absent.
 */
import test from "node:test";
import assert from "node:assert/strict";

// Ensure no backend is configured so vendorEntries() takes the offline branch.
delete process.env.INTERNAL_API_URL;

import sitemap from "../app/sitemap.js";
import robots from "../app/robots.js";
import { ROUTE_INVENTORY, isIndexable } from "@halla/shared/brand";

test("sitemap() resolves without a backend and never throws (offline build)", async () => {
  const entries = await sitemap();
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length > 0, "sitemap must always emit static entries offline");
});

test("sitemap includes every static-indexable route × ar+en with reciprocal alternates", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((e) => e.url));
  const staticIndexable = ROUTE_INVENTORY.filter((r) => isIndexable(r.routeClass) && r.sitemap === true);
  for (const row of staticIndexable) {
    const path = row.path.replace(/^\/\[lang\]/, "");
    const suffix = path ? path : "";
    const ar = `https://halaa.com.sa/ar${suffix}`;
    const en = `https://halaa.com.sa/en${suffix}`;
    assert.ok(urls.has(ar), `sitemap missing ${ar}`);
    assert.ok(urls.has(en), `sitemap missing ${en}`);
  }
  // Every entry advertises both language alternates.
  for (const e of entries) {
    assert.ok(e.alternates?.languages?.ar && e.alternates?.languages?.en, `entry ${e.url} missing hreflang alternates`);
  }
});

test("sitemap contains NO private/token/dashboard URLs", async () => {
  const entries = await sitemap();
  const banned = ["/host", "/admin-dash", "/vendor-dashboard", "/login", "/signup", "/post-event", "/checkout", "/ticket-rating", "/reset-password", "/payments"];
  for (const e of entries) {
    for (const b of banned) {
      assert.equal(e.url.includes(b), false, `sitemap leaked a private URL: ${e.url}`);
    }
  }
});

test("robots() disallows private prefixes and points to the absolute sitemap", () => {
  const r = robots();
  assert.equal(r.sitemap, "https://halaa.com.sa/sitemap.xml");
  assert.equal(r.host, "https://halaa.com.sa");
  const rule = r.rules[0];
  assert.equal(rule.allow, "/");
  const disallowJoined = rule.disallow.join(" ");
  for (const frag of ["host", "admin-dash", "vendor-dashboard", "post-event", "checkout", "ticket-rating", "reset-password", "login", "signup"]) {
    assert.ok(disallowJoined.includes(frag), `robots must disallow ${frag}`);
  }
});
