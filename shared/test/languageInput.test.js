import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeArabicText,
  sanitizeEnglishText,
  containsOnlyArabicText,
  containsOnlyEnglishText,
} from "../src/utils/languageInput.js";

test("language input guards preserve the requested script and neutral characters", () => {
  assert.equal(sanitizeArabicText("Hello مرحبا 123!"), " مرحبا 123!");
  assert.equal(sanitizeEnglishText("Hello مرحبا 123!"), "Hello  123!");
  assert.equal(containsOnlyArabicText("خدمات مميزة 2026"), true);
  assert.equal(containsOnlyArabicText("خدمات premium"), false);
  assert.equal(containsOnlyEnglishText("Premium services 2026"), true);
  assert.equal(containsOnlyEnglishText("Premium خدمات"), false);
});
