import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("template capture is bounded, binary on native and web, and never base64", async () => {
  const bake = await read("../../utils/canvasBake.js");
  assert.match(bake, /boundInvitationDimensions\(/);
  assert.match(bake, /result: "tmpfile"/);
  assert.match(bake, /format: "jpg"/);
  assert.match(bake, /skipIfBounded: true/);
  assert.match(bake, /ownsSource: true/);
  assert.match(bake, /InteractionManager\.runAfterInteractions/);
  assert.match(bake, /Platform\.OS === "web"/);
  assert.match(bake, /import\("html-to-image"\)/);
  assert.match(bake, /canvas\.toBlob/);
  assert.match(bake, /URL\.createObjectURL/);
  assert.doesNotMatch(bake, /base64/i);
});

test("normalization skips a fitting capture, deletes rejected passes and keeps the upload shape", async () => {
  const image = await read("../../utils/invitationImage.js");
  assert.match(image, /if \(image\.skipIfBounded\)/);
  assert.match(image, /canSkipInvitationReencode\(/);
  assert.match(image, /deleteAsync\(uri, \{ idempotent: true \}\)/);
  assert.match(image, /name,\s*fileName: name,\s*type: "image\/jpeg"/);
  assert.doesNotMatch(image, /base64/i);
});

test("template modal guards duplicate saves, keeps values on failure and hides placeholders for capture", async () => {
  const step = await read("../../components/createEvent/StepThree.js");
  assert.match(step, /createSingleFlight/);
  assert.equal(step.match(/if \(saveFlight\.busy\) return;/g)?.length, 2, "submit and close are both guarded");
  assert.match(step, /templateBakeErrorKey\(bakeError\)/);
  assert.match(step, /t\("template_retry"\)/);
  assert.match(step, /showPlaceholders=\{!baking\}/);
  assert.match(step, /template_\$\{bakePhase\}/);
  assert.match(step, /discardReplacedBake\(previousImage, baked\)/);
});

test("template colour fields offer only the custom picker", async () => {
  const [renderer, picker] = await Promise.all([
    read("../../components/createEvent/_components/TemplateFieldRenderer.js"),
    read("../../components/commen/colorPicker.js"),
  ]);
  assert.doesNotMatch(renderer, /showPresets/);
  assert.doesNotMatch(picker, /presetColors|showPresets/);
});

test("template fields enforce authored limits and English examples stay LTR", async () => {
  const renderer = await read("../../components/createEvent/_components/TemplateFieldRenderer.js");
  assert.match(renderer, /maxLength=\{field\.maxLength\}/);
  assert.match(renderer, /showCounter=\{Boolean\(field\.maxLength\)\}/);
  assert.match(renderer, /locale === "en" \? "ltr" : "rtl"/);
});

test("mobile artwork fits complete text and never line-clamps it", async () => {
  const canvas = await read("../../components/shared/TemplatePreviewCanvas.js");
  assert.match(canvas, /estimateFittedFontSize/);
  assert.match(canvas, /onTextLayout/);
  assert.doesNotMatch(canvas, /numberOfLines=\{overlay\.maxLines/);
  assert.doesNotMatch(canvas, /ellipsizeMode/);
});

test("template forms derive field limits from authored artwork geometry", async () => {
  const step = await read("../../components/createEvent/StepThree.js");
  assert.match(step, /withTemplateTextLimits\(template\)/);
  assert.match(step, /const fields = limitedTemplate\?\.fields \|\| \[\]/);
});

test("template save states exist in both languages", async () => {
  const keys = [
    "template_failed",
    "template_preparing",
    "template_generating",
    "template_optimizing",
    "template_background_failed",
    "template_capture_failed",
    "template_encode_failed",
    "template_image_too_large",
    "template_retry",
  ];
  for (const lang of ["ar", "en"]) {
    const json = JSON.parse(await read(`../../localization/locales/${lang}/createEvent.json`));
    for (const key of keys) assert.ok(json[key], `${lang}:${key}`);
  }
});
