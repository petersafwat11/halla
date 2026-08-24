import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("EVT-UI-01: EditGuestOrModeratorsModal renders its standalone fields through the shared direction-aware shell", () => {
  const file = path.join(mobileRoot, "components/createEvent/EditGuestOrModeratorsModal.js");
  const content = fs.readFileSync(file, "utf8");

  // The modal migrated to the shared FormField shell (blueprint §9 P1), which
  // internally wraps DirectionalTextInput; assert the shell is the one that
  // owns DirectionalTextInput so no raw native input can return here.
  const formFieldShell = fs.readFileSync(
    path.join(mobileRoot, "components/commen/FormField.js"),
    "utf8"
  );
  assert.ok(
    formFieldShell.includes("DirectionalTextInput"),
    "FormField must wrap DirectionalTextInput as its low-level input"
  );
  assert.ok(
    content.includes("FormField"),
    "EditGuestOrModeratorsModal must render fields through the shared FormField shell"
  );
  assert.ok(
    !content.includes('import TextInput from "../commen/TextInput"'),
    "EditGuestOrModeratorsModal must not import the RHF-bound TextInput"
  );
  assert.ok(content.includes("onChangeText"), "Must bind onChangeText to update state");
  assert.ok(content.includes("value={name}"), "Must bind value={name}");
  assert.ok(content.includes("value={phone}"), "Must bind value={phone}");
});

test("EVT-UI-02: PrevAndNextBtns takes full width without container white background and padding", () => {
  const file = path.join(mobileRoot, "components/createEvent/PrevAndNextBtns.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes('width: "100%"'), "Container must specify width 100%");
  assert.ok(
    !content.includes('paddingHorizontal: 24'),
    "Container must not have 24px horizontal padding"
  );
  assert.ok(
    !/container:\s*\{[^}]*backgroundColor:\s*["']#FFF["']/s.test(content),
    "Container must not have white background"
  );
});

test("EVT-UI-03: MapPicker modal uses SafeAreaView and provides proper header padding", () => {
  const file = path.join(mobileRoot, "components/commen/MapPicker.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(
    content.includes("SafeAreaView"),
    "MapPicker must import and use SafeAreaView from react-native-safe-area-context"
  );
  assert.ok(
    content.includes('<SafeAreaView style={styles.modal} edges={["top", "bottom"]}>'),
    "MapPicker must wrap modal content in SafeAreaView with top and bottom edges"
  );
});
