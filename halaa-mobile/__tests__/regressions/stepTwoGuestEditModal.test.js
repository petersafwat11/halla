import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

const read = (rel) => fs.readFileSync(path.join(mobileRoot, rel), "utf8");

/**
 * Guest editing died on real iOS/Android devices because Step 2 stacked
 * native Modal windows: the guest-list sheet stayed presented while the
 * edit sheet (and then the category sheet) opened additional windows over
 * it. Stacked modal windows misroute touches, Android back-button handling
 * and keyboard events (each RN Modal is its own window/Dialog), which left
 * the editor unusable even though every JS-level test stayed green.
 *
 * Contract: in this flow only ONE native modal window is ever presented.
 * A sheet suspends (`visible` → false) while a child sheet takes over and
 * re-presents automatically when that child closes.
 */

test("GUEST-EDIT-01: list sheet suspends its own Modal while the editor or bulk category sheet is presented", () => {
  const source = read("components/createEvent/ListOfGuestsORModerators.js");

  assert.match(
    source,
    /const\s+listVisible\s*=\s*visible\s*&&\s*!showEditModal\s*&&\s*!showCategoryPicker/,
    "list visibility must be gated on both child sheets"
  );
  // The raw list Modal must render with the gated visibility, not the prop.
  assert.match(
    source,
    /<Modal[\s\S]{0,200}visible=\{listVisible\}/,
    "the native list Modal must present only when no child sheet owns presentation"
  );
});

test("GUEST-EDIT-02: editor sheet suspends while its CategoryPickerSheet is presented", () => {
  const source = read("components/createEvent/EditGuestOrModeratorsModal.js");

  assert.match(
    source,
    /pickerPresented/,
    "editor must track when its nested category picker owns presentation"
  );
  assert.match(
    source,
    /<KeyboardSafeModalSheet[\s\S]{0,200}visible=\{visible && !pickerPresented\}/,
    "the editor sheet must suspend while the category picker is up"
  );
  // The suspension must reset between opens so a stale picker state can
  // never swallow the next edit session.
  assert.match(
    source,
    /if \(!visible\) setPickerPresented\(false\)/,
    "picker suspension must reset when the editor closes"
  );
  assert.match(
    source,
    /onPickerVisibleChange=\{setPickerPresented\}/,
    "editor must receive picker presentation changes from CategorySelect"
  );
});

test("GUEST-EDIT-03: CategorySelect reports picker presentation to hosting sheets", () => {
  const source = read("components/commen/CategorySelect.js");

  assert.match(
    source,
    /onPickerVisibleChange/,
    "CategorySelect must expose an optional presentation-change callback"
  );
  assert.match(
    source,
    /setIsOpen\(true\);[\s\S]{0,80}onPickerVisibleChange\?\.\(true\)/,
    "opening the picker must report visible=true"
  );
  assert.match(
    source,
    /setIsOpen\(false\);[\s\S]{0,80}onPickerVisibleChange\?\.\(false\)/,
    "closing the picker must report visible=false so the host re-presents"
  );
});

test("GUEST-EDIT-04: edit save path keeps validation + form persistence intact", () => {
  const section = read("components/createEvent/_components/GuestFormSection.js");

  // Editing must persist through EventsService.editListItem into RHF state —
  // this is the data path behind the dialog and must not regress while the
  // presentation layer changes.
  assert.match(section, /EventsService\.editListItem\(id, updatedGuest, formData\.guestList, "guest"\)/);
  assert.match(section, /setValue\("guestList", result\.list, \{ shouldValidate: true \}\)/);
  assert.match(
    section,
    /<ListOfGuestsORModerators[\s\S]{0,400}onEdit=\{handleEditGuest\}/,
    "guest list rows must wire the edit handler"
  );
});
