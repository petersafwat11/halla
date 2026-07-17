/**
 * Invitation-type helper tests (create-event Step 4). DB-free.
 *
 * Guards the reply × QR truth table. Helpers are strict: every event created
 * through the app carries an explicit invitationType (the Mongoose schema
 * default fills it in), so there is no legacy-unset case to handle.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INVITATION_TYPE,
  invitationAllowsReply,
  invitationIncludesQr,
} = require("../src/shared/constants");

test("truth table: reply × QR per type", () => {
  const cases = [
    // [type, allowsReply, includesQr]
    [INVITATION_TYPE.REPLY_AND_QR, true, true],
    [INVITATION_TYPE.REPLY_ONLY, true, false],
    [INVITATION_TYPE.QR_ONLY, false, true],
    [INVITATION_TYPE.NONE, false, false],
  ];
  for (const [type, allowsReply, includesQr] of cases) {
    assert.equal(invitationAllowsReply(type), allowsReply, `allowsReply(${type})`);
    assert.equal(invitationIncludesQr(type), includesQr, `includesQr(${type})`);
  }
});

test("newly-created events always get the schema default (no unset case)", () => {
  const Event = require("../models/EventModel");
  const doc = new Event({ eventDetails: { title: "t" }, host: undefined });
  assert.equal(doc.invitationType, INVITATION_TYPE.REPLY_AND_QR);
});

test("EventModel exposes invitationType with the right enum + default", () => {
  const Event = require("../models/EventModel");
  const path = Event.schema.path("invitationType");
  assert.equal(path.instance, "String");
  assert.equal(path.defaultValue, INVITATION_TYPE.REPLY_AND_QR);
  assert.deepEqual(
    [...path.enumValues].sort(),
    Object.values(INVITATION_TYPE).sort()
  );
});
