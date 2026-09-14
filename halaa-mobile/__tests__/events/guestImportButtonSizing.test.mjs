import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Step 2 import actions use compact accessible touch targets", async () => {
  const [bulk, sources] = await Promise.all([
    read("../../components/createEvent/_components/ImportExportSection.js"),
    read("../../components/createEvent/_components/GuestFormSection.js"),
  ]);
  assert.match(bulk, /importExportBtn:\s*\{[\s\S]*?height:\s*44/);
  assert.match(bulk, /paddingVertical:\s*4/);
  assert.match(sources, /sourceBtn:\s*\{[\s\S]*?height:\s*44/);
  assert.match(sources, /paddingVertical:\s*6/);
});
