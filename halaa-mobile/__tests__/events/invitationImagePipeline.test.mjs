import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Step 3 normalizes gallery uploads and every template bake before multipart submission", async () => {
  const [stepThree, canvasBake, packageJson] = await Promise.all([
    read("../../components/createEvent/StepThree.js"),
    read("../../utils/canvasBake.js"),
    read("../../package.json"),
  ]);

  assert.match(stepThree, /normalizeInvitationImage\(\{/);
  assert.match(stepThree, /if \(template\) \{\s*setShowFormModal\(true\)/);
  assert.match(canvasBake, /format: "jpg"/);
  assert.match(canvasBake, /normalizeInvitationImage\(\{/);
  assert.ok(JSON.parse(packageJson).dependencies["expo-image-manipulator"]);
});
