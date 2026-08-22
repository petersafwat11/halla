/**
 * Live Event Guest Gating and Normalization Test (Session 1.3 · EVT-03 & EVT-15)
 *
 * Verifies:
 * 1. StepTwo / GuestFormSection / ListOfGuestsORModerators component chain passes allowAddOnly.
 * 2. toGuestDTO and classifyRsvpBucket handle diverse guest shapes in mobile components.
 * 3. Live event immutable-guest rules prevent editing/deleting existing guests while permitting additions.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { toGuestDTO } from "@halaa/shared/utils";
import { classifyRsvpBucket } from "@halaa/shared/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("EVT-03: StepTwo component accepts allowAddOnly and passes to GuestFormSection", () => {
  const stepTwoPath = path.join(mobileRoot, "components/createEvent/StepTwo.js");
  const content = fs.readFileSync(stepTwoPath, "utf8");

  assert.ok(
    content.includes("allowAddOnly = false"),
    "StepTwo.js must accept allowAddOnly in its props"
  );
  assert.ok(
    content.includes("allowAddOnly={allowAddOnly}"),
    "StepTwo.js must pass allowAddOnly to GuestFormSection"
  );
});

test("EVT-03: GuestFormSection passes allowAddOnly to ListOfGuestsORModerators", () => {
  const sectionPath = path.join(mobileRoot, "components/createEvent/_components/GuestFormSection.js");
  const content = fs.readFileSync(sectionPath, "utf8");

  assert.ok(
    content.includes("allowAddOnly = false"),
    "GuestFormSection.js must accept allowAddOnly in its props"
  );
  assert.ok(
    content.includes("allowAddOnly={allowAddOnly}"),
    "GuestFormSection.js must pass allowAddOnly to ListOfGuestsORModerators"
  );
});

test("EVT-03: ListOfGuestsORModerators hides edit/delete actions when allowAddOnly is true", () => {
  const listModalPath = path.join(mobileRoot, "components/createEvent/ListOfGuestsORModerators.js");
  const content = fs.readFileSync(listModalPath, "utf8");

  assert.ok(
    content.includes("allowAddOnly = false"),
    "ListOfGuestsORModerators.js must accept allowAddOnly prop"
  );
  assert.ok(
    content.includes("!allowAddOnly"),
    "ListOfGuestsORModerators.js must guard edit/delete actions with !allowAddOnly"
  );
});

test("EVT-03: GuestListItem safely guards onEdit and onDelete handlers", () => {
  const itemPath = path.join(mobileRoot, "components/events/GuestListItem.js");
  const content = fs.readFileSync(itemPath, "utf8");

  assert.ok(
    content.includes('typeof onEdit === "function"') || content.includes("typeof onEdit === 'function'"),
    "GuestListItem.js must guard onEdit rendering"
  );
  assert.ok(
    content.includes('typeof onDelete === "function"') || content.includes("typeof onDelete === 'function'"),
    "GuestListItem.js must guard onDelete rendering"
  );
});

test("EVT-15: toGuestDTO normalizes guest IDs and RSVP statuses across diverse payload shapes", () => {
  // Shape 1: MongoDB document with _id and status
  const rawMongo = {
    _id: "mongo_g_101",
    name: "Fahad Al-Otaibi",
    phone: "0501112233",
    status: "confirmed",
    category: "VIP",
  };
  const dto1 = toGuestDTO(rawMongo);
  assert.equal(dto1.id, "mongo_g_101");
  assert.equal(dto1._id, "mongo_g_101");
  assert.equal(dto1.name, "Fahad Al-Otaibi");
  assert.equal(dto1.phone, "0501112233");
  assert.equal(dto1.mobile, "0501112233");
  assert.equal(dto1.status, "confirmed");
  assert.equal(dto1.rsvpStatus, "confirmed");

  // Shape 2: Frontend item with guestId and rsvpStatus
  const rawFrontend = {
    guestId: "fe_g_202",
    name: "Noura Khalid",
    mobile: "0554445566",
    rsvpStatus: "declined",
  };
  const dto2 = toGuestDTO(rawFrontend);
  assert.equal(dto2.id, "fe_g_202");
  assert.equal(dto2._id, "fe_g_202");
  assert.equal(dto2.name, "Noura Khalid");
  assert.equal(dto2.phone, "0554445566");
  assert.equal(dto2.status, "declined");
  assert.equal(dto2.rsvpStatus, "declined");

  // Shape 3: Status invited maps to rsvpStatus pending
  const rawInvited = {
    id: "g_303",
    name: "Reem",
    phone: "0567778899",
    status: "invited",
  };
  const dto3 = toGuestDTO(rawInvited);
  assert.equal(dto3.status, "invited");
  assert.equal(dto3.rsvpStatus, "pending");
  assert.equal(classifyRsvpBucket(dto3.status), "pending");
});
