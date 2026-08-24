import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LRI, PDI } from "../src/utils/bidi.js";
import {
  LEGAL_LTR_TOKEN_REGEX,
  isolateLegalLtrTokens,
} from "../src/legal/tokens.js";

const ISOLATED_SPAN = new RegExp(`${LRI}[^${PDI}]*${PDI}`, "g");

function stripIsolates(text) {
  return text.replace(ISOLATED_SPAN, "");
}

test("legal matcher: emails, phones and URLs are isolated as whole tokens", () => {
  const out = isolateLegalLtrTokens(
    "راسلنا عبر support@halaa.com.sa. أو واتساب +966 55 261 9282.",
    true
  );
  assert.ok(out.includes(`${LRI}support@halaa.com.sa${PDI}`));
  assert.ok(out.includes(`${LRI}+966 55 261 9282${PDI}`));

  const url = isolateLegalLtrTokens("اقرأ السياسة على https://halaa.com.sa/privacy.", true);
  assert.ok(url.includes(`${LRI}https://halaa.com.sa/privacy${PDI}`));
});

test("legal matcher: official company name and store names stay atomic", () => {
  const out = isolateLegalLtrTokens(
    "المشغّل هو Afaq hala Company For Communications and Information، والتطبيق متاح على App Store و Google Play.",
    true
  );
  assert.ok(out.includes(`${LRI}Afaq hala Company For Communications and Information${PDI}`));
  assert.ok(out.includes(`${LRI}App Store${PDI}`));
  assert.ok(out.includes(`${LRI}Google Play${PDI}`));
});

test("legal matcher: proven vendor brand runs are isolated (blueprint §4.5 expansion)", () => {
  const body =
    "نستخدم MongoDB Atlas وAWS/S3 وMoyasar وApple/Google وRevenueCat وSentry وTaqnyat وGoogle Maps وMeta/WhatsApp وExpo وAPNs وFCM لتشغيل المنصة.";
  const out = isolateLegalLtrTokens(body, true);
  for (const token of [
    "MongoDB Atlas",
    "AWS/S3",
    "Moyasar",
    "Apple/Google",
    "RevenueCat",
    "Sentry",
    "Taqnyat",
    "Google Maps",
    "Meta/WhatsApp",
    "Expo",
    "APNs",
    "FCM",
  ]) {
    assert.ok(out.includes(`${LRI}${token}${PDI}`), `missing isolate for ${token}`);
  }
  // Standalone technical abbreviations like IP are covered by the same run.
  assert.ok(isolateLegalLtrTokens("نجمع عنوان IP لمنع الاحتيال.", true).includes(`${LRI}IP${PDI}`));
});

test("legal matcher: percentages isolated; sentence punctuation stays outside", () => {
  const out = isolateLegalLtrTokens("عمولة المنصة 15% من قيمة التذكرة.", true);
  assert.ok(out.includes(`${LRI}15%${PDI}`));

  // The Arabic full stop after a Latin brand must NOT be swallowed into the
  // isolate — it belongs to the RTL sentence and keeps its paragraph-side
  // placement.
  const punct = isolateLegalLtrTokens("نستخدم خدمات إضافية مثل Sentry وTaqnyat.", true);
  assert.ok(punct.includes(`${LRI}Sentry${PDI}`));
  assert.ok(punct.includes(`${LRI}Taqnyat${PDI}`));
  assert.equal(punct.replace(/\u2066[^\u2069]*\u2069/g, "").includes("."), true);
  assert.ok(!punct.includes(`${LRI}Taqnyat.${PDI}`));
});

test("legal matcher: LTR copy passes through unchanged; Arabic-only copy untouched", () => {
  const en = "Support email: support@halaa.com.sa. Phone: +966 55 261 9282.";
  assert.equal(isolateLegalLtrTokens(en, false), en);

  const ar = "لا يحتوي هذا النص على أي رموز لاتينية على الإطلاق.";
  assert.equal(isolateLegalLtrTokens(ar, true), ar);
});

test("every canonical AR legal paragraph leaves no Latin run outside isolates", () => {
  const docsDir = path.resolve(import.meta.dirname, "../src/legal/documents");
  const files = [
    "privacy.json",
    "terms.json",
    "communityRules.json",
    "refund.json",
    "deletion.json",
    "support.json",
  ];

  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(docsDir, file), "utf8"));
    for (const section of doc.ar.sections) {
      for (const paragraph of String(section.body).split("\n\n")) {
        const isolated = isolateLegalLtrTokens(paragraph, true);
        const remainder = stripIsolates(isolated);
        assert.ok(
          !/[A-Za-z]/.test(remainder),
          `${file} #${section.id}: un-isolated Latin content remains: ${JSON.stringify(remainder)}`
        );
      }
    }
  }
});

test("every visible AR header field is fully isolated by the same matcher", () => {
  // LegalScreen renders badge/subtitle/title through LocalizedText and section
  // label/title through the same shared matcher as body paragraphs. Proven
  // content case: refund §11 title embeds "App Store و Google Play".
  const docsDir = path.resolve(import.meta.dirname, "../src/legal/documents");
  const files = [
    "privacy.json",
    "terms.json",
    "communityRules.json",
    "refund.json",
    "deletion.json",
    "support.json",
  ];

  const fields = [
    ["badge", (d) => d.badge],
    ["subtitle", (d) => d.subtitle],
    ["title", (d) => d.title],
  ];

  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(docsDir, file), "utf8"));
    for (const [name, pick] of fields) {
      const value = pick(doc.ar);
      if (!value) continue;
      const remainder = stripIsolates(isolateLegalLtrTokens(value, true));
      assert.ok(
        !/[A-Za-z]/.test(remainder),
        `${file} ${name}: un-isolated Latin content remains: ${JSON.stringify(remainder)}`
      );
    }
    for (const section of doc.ar.sections) {
      for (const name of ["label", "title"]) {
        const value = section[name];
        if (!value) continue;
        const remainder = stripIsolates(isolateLegalLtrTokens(value, true));
        assert.ok(
          !/[A-Za-z]/.test(remainder),
          `${file} #${section.id} ${name}: un-isolated Latin content remains: ${JSON.stringify(remainder)}`
        );
      }
    }
  }

  // The concrete proven case stays atomic end to end.
  const refund = JSON.parse(
    fs.readFileSync(path.join(docsDir, "refund.json"), "utf8")
  );
  const heading = refund.ar.sections.find((s) => s.id === "article-11").title;
  const out = isolateLegalLtrTokens(heading, true);
  assert.ok(out.includes(`${LRI}App Store${PDI}`));
  assert.ok(out.includes(`${LRI}Google Play${PDI}`));
});

test("EN documents never receive isolation marks from the screen contract", () => {
  const docsDir = path.resolve(import.meta.dirname, "../src/legal/documents");
  const doc = JSON.parse(fs.readFileSync(path.join(docsDir, "privacy.json"), "utf8"));
  for (const section of doc.en.sections) {
    const out = isolateLegalLtrTokens(section.body, false);
    assert.equal(out, section.body);
    assert.ok(!out.includes(LRI) && !out.includes(PDI));
  }
});

test("regex is global so repeated paragraphs isolate every occurrence", () => {
  assert.ok(LEGAL_LTR_TOKEN_REGEX.flags.includes("g"));
});
