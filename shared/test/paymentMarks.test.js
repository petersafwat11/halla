import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAYMENT_MARKS,
  CARD_NETWORK_ORDER,
  getPaymentMark,
} from "../src/brand/paymentMarks.js";

const REPO = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ARTWORK = path.join(REPO, "halaa-web/public/svg/payment");

test("every card network has a mark, and the order matches", () => {
  assert.deepEqual(CARD_NETWORK_ORDER, ["visa", "mastercard", "mada"]);
  for (const brand of CARD_NETWORK_ORDER) {
    const mark = getPaymentMark(brand);
    assert.equal(mark.kind, "vector", brand);
    assert.ok(mark.shapes.length > 0, `${brand} has shapes`);
  }
});

test("vector marks are renderable: parseable viewBox, non-empty paths, real fills", () => {
  for (const [key, mark] of Object.entries(PAYMENT_MARKS)) {
    if (mark.kind !== "vector") continue;
    const box = mark.viewBox.split(/\s+/).map(Number);
    assert.equal(box.length, 4, `${key} viewBox has 4 numbers`);
    assert.ok(box.every(Number.isFinite), `${key} viewBox is numeric`);
    assert.ok(box[2] > 0 && box[3] > 0, `${key} viewBox has positive extent`);

    for (const [index, shape] of mark.shapes.entries()) {
      // A truncated extraction shows up as a path that no longer starts with a
      // move command or has collapsed to a few characters.
      assert.match(shape.d, /^[Mm]/, `${key} shape ${index} starts with a move`);
      assert.ok(shape.d.length > 5, `${key} shape ${index} is not truncated`);
      assert.match(shape.fill, /^#[0-9a-fA-F]{3,8}$/, `${key} shape ${index} fill`);
    }
  }
});

test("wordmarks carry the fields both renderers need", () => {
  for (const [key, mark] of Object.entries(PAYMENT_MARKS)) {
    if (mark.kind !== "wordmark") continue;
    assert.match(mark.color, /^#[0-9a-fA-F]{3,8}$/, `${key} color`);
    assert.ok(mark.words.length > 0, `${key} has words`);
    for (const word of mark.words) {
      assert.ok(word.text.length > 0, `${key} word text`);
      assert.ok(
        ["bold", "regular", "light"].includes(word.weight),
        `${key} weight "${word.weight}" is one the renderers map`
      );
    }
    if (mark.glyph) {
      assert.match(mark.glyph.d, /^[Mm]/, `${key} glyph path`);
      assert.equal(mark.glyph.viewBox.split(/\s+/).length, 4, `${key} glyph viewBox`);
    }
  }
});

test("every mark has a human label for alt text", () => {
  for (const [key, mark] of Object.entries(PAYMENT_MARKS)) {
    assert.ok(mark.label && mark.label.length > 0, `${key} label`);
  }
});

test("getPaymentMark is total — unknown keys return null, never throw", () => {
  assert.equal(getPaymentMark("not-a-brand"), null);
  assert.equal(getPaymentMark(undefined), null);
  assert.equal(getPaymentMark(""), null);
});

test("card-network marks stay in step with the artwork web serves", () => {
  // Web serves the .svg files while mobile renders the extracted paths. If
  // someone replaces a vendor file without re-extracting, the two platforms
  // would silently diverge — catch that by comparing the viewBox.
  for (const brand of CARD_NETWORK_ORDER) {
    const file = path.join(ARTWORK, `${brand}.svg`);
    assert.ok(fs.existsSync(file), `${brand}.svg is still served by web`);
    const svg = fs.readFileSync(file, "utf8");
    const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/)?.[1];
    assert.equal(
      viewBox,
      PAYMENT_MARKS[brand].viewBox,
      `${brand}: artwork viewBox changed — re-extract the shared mark data`
    );
  }
});
