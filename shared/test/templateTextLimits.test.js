import test from "node:test";
import assert from "node:assert/strict";
import {
  getTemplateFieldCapacity,
  withTemplateTextLimits,
} from "../src/utils/templateTextLimits.js";

const royalGroom = {
  naturalWidth: 1152,
  naturalHeight: 2048,
  fields: [
    { key: "invitationTitle", type: "text", maxLength: 30 },
    { key: "invitationMessage", type: "textarea", maxLength: 150 },
    { key: "primaryColor", type: "color" },
  ],
  overlays: [
    { fieldKey: "invitationTitle", widthPct: 42, fontSizeVh: 6.2, maxLines: 1 },
    { fieldKey: "invitationMessage", widthPct: 66, fontSizeVh: 2.2, maxLines: 3 },
  ],
};

test("derives a readable character budget from the authored overlay", () => {
  assert.equal(getTemplateFieldCapacity(royalGroom, "invitationTitle"), 11);
  assert.equal(getTemplateFieldCapacity(royalGroom, "invitationMessage"), 148);
});

test("only tightens an authored field limit and leaves style fields unchanged", () => {
  const limited = withTemplateTextLimits(royalGroom);
  assert.equal(limited.fields[0].maxLength, 11);
  assert.equal(limited.fields[1].maxLength, 148);
  assert.equal(limited.fields[2], royalGroom.fields[2]);
  assert.equal(royalGroom.fields[0].maxLength, 30);
});

