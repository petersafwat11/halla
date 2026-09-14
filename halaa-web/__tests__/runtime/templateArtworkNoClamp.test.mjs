import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("template form enforces authored field limits", async () => {
  const renderer = await read("../../app/[lang]/host/create-event/_components/templateForm/renderField.jsx");
  assert.match(renderer, /maxLength=\{field\.maxLength\}/);
});

test("web artwork fits complete invitation text without CSS clamping", async () => {
  const overlay = await read("../../components/shared/OverlayItem.jsx");
  assert.match(overlay, /Measure the full text, then fit within the authored line budget/);
  assert.doesNotMatch(overlay, /WebkitLineClamp:\s*overlay\.maxLines/);
  assert.doesNotMatch(overlay, /textOverflow/);
});

test("web template form applies overlay-derived input limits", async () => {
  const form = await read("../../app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx");
  assert.match(form, /withTemplateTextLimits/);
  assert.match(form, /template=\{template\}/);
});
