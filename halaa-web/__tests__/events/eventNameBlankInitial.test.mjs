import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initialFormState } from "../../hooks/events/useEventForm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..", "..");

const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

test("F-18 Web: initial event form state has blank eventName", () => {
  assert.equal(initialFormState.eventName, "", "initialFormState.eventName must be empty string");
  assert.equal(initialFormState.eventType, "", "initialFormState.eventType must be empty string");
});

test("F-18 Web: selecting eventType does not mutate or prefill eventName", () => {
  const stepOneSource = read(
    "app",
    "[lang]",
    "host",
    "create-event",
    "_components",
    "stepOne",
    "StepOne.js"
  );

  assert.doesNotMatch(
    stepOneSource,
    /setValue\(["']eventName["']/i,
    "StepOne must not automatically set eventName on eventType selection"
  );
  assert.doesNotMatch(
    stepOneSource,
    /eventName.*=.*(Wedding|حفل زفاف)/i,
    "StepOne must not prefill wedding into eventName"
  );
});
