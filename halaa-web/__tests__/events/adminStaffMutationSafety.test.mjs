import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

test("EVT-13: AdminEventHeader uses dedicated staff mutations instead of generic updateEvent", () => {
  const source = read("components", "event-detail", "AdminEventHeader.jsx");

  // Must import and use useEventMutation
  assert.match(
    source,
    /useEventMutation\(["']addStaff["']\)/,
    "AdminEventHeader must instantiate addStaff mutation"
  );
  assert.match(
    source,
    /useEventMutation\(["']updateStaff["']\)/,
    "AdminEventHeader must instantiate updateStaff mutation"
  );
  assert.match(
    source,
    /useEventMutation\(["']deleteStaff["']\)/,
    "AdminEventHeader must instantiate deleteStaff mutation"
  );

  // Handlers must call addStaffMutation, updateStaffMutation, deleteStaffMutation
  assert.match(
    source,
    /await\s+addStaffMutation\.mutateAsync/,
    "handleAddStaff must call addStaffMutation.mutateAsync"
  );
  assert.match(
    source,
    /await\s+updateStaffMutation\.mutateAsync/,
    "handleEditStaff must call updateStaffMutation.mutateAsync"
  );
  assert.match(
    source,
    /await\s+deleteStaffMutation\.mutateAsync/,
    "handleDeleteStaff must call deleteStaffMutation.mutateAsync"
  );

  // Must NOT mutate staffList via updateEvent
  assert.doesNotMatch(
    source,
    /updateEvent\.mutateAsync\(\s*\{[\s\S]*?staffList/,
    "AdminEventHeader must not call updateEvent with staffList"
  );
});

test("EVT-14: StaffTokensList supports TanStack Query v5 isPending on revoke mutation", () => {
  const source = read("components", "event-detail", "StaffTokensList.jsx");

  assert.match(
    source,
    /revokeMutation\.isPending\s*\|\|\s*revokeMutation\.isLoading/,
    "StaffTokensList revoke button must check isPending || isLoading"
  );
});

test("EVT-15: live-event update wizard uses dedicated staff mutations", () => {
  const source = read(
    "app", "[lang]", "host", "update-event", "_components", "UpdateEventWizard.jsx"
  );

  for (const action of ["addStaff", "updateStaff", "deleteStaff"]) {
    assert.match(
      source,
      new RegExp(`useEventMutation\\(["']${action}["']\\)`),
      `UpdateEventWizard must instantiate ${action}`
    );
  }
  assert.match(source, /if \(!isEventLive\)/);
  assert.match(source, /await\s+addStaffMutation\.mutateAsync/);
  assert.match(source, /await\s+updateStaffMutation\.mutateAsync/);
  assert.match(source, /await\s+deleteStaffMutation\.mutateAsync/);
});

test("EVT-16: send-message dropdown is layered above event content", () => {
  const headerCss = read("components", "event-detail", "EventHeader.module.css");
  const menuCss = read(
    "components", "event-detail", "sendActions", "SendMessagesMenu.module.css"
  );

  assert.match(headerCss, /\.header\s*\{[^}]*position:\s*relative;/);
  assert.match(headerCss, /\.header\s*\{[^}]*z-index:\s*20;/);
  assert.match(menuCss, /\.dropdown\s*\{[^}]*z-index:\s*1000;/s);
});

test("EVT-17: web template customization offers continue or destructive discard", () => {
  const form = read(
    "app", "[lang]", "host", "create-event", "_components", "templateForm", "DynamicTemplateForm.jsx"
  );
  const step = read(
    "app", "[lang]", "host", "create-event", "_components", "stepThree", "StepThree.js"
  );

  assert.match(form, /if \(isDirty\)/);
  assert.match(form, /template_continue_editing/);
  assert.match(form, /template_discard/);
  assert.match(form, /onDiscard\?\.\(\)/);
  assert.match(step, /onDiscard=\{handleRemoveSelection\}/);
});
