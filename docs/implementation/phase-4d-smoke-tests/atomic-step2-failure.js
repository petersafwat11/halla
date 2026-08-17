#!/usr/bin/env node
/**
 * Phase 4d W0-ATOMIC — compensation-rollback simulation.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4d-smoke-tests/atomic-step2-failure.js
 *
 * In-process simulation that mirrors the standalone (no-replica-set)
 * branch of `events.service.updateEventStep2`. Asserts that:
 *
 *   1. Happy path: kept + new guests land, staff list replaces.
 *      `addedCount` == count of brand-new guests.
 *   2. Compensation: when the staff save throws AFTER the guest save
 *      committed, the rollback restores the pre-image. Specifically:
 *        a. event.guestList is back to pre-image.
 *        b. event.staffList is back to pre-image.
 *        c. Freshly-created guest docs are deleted.
 *        d. Guests slated for removal are STILL in the Guest store —
 *           the deferred-delete sequencing (Phase 4d hardening) means
 *           we never deleted them in the first place, so their `qrcode`
 *           and `rsvp` and `checkIn` fields are preserved verbatim.
 *        e. The thrown error propagates to the caller.
 *
 * The simulation does NOT boot Mongoose; it stubs the model methods
 * with a Map-backed store.
 */

let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
    fail++;
  }
}

function buildScenario({ failStaff }) {
  // Each existing guest carries a `qrcode` field that the production
  // pre-save hook would regenerate on re-create. The test asserts the
  // qrcode is preserved verbatim through the rollback.
  const event = {
    _id: "EVT-1",
    status: "scheduled",
    guestList: [
      { _id: "G-1", name: "Alice", phone: "+966500000001", status: "confirmed", qrcode: "guest_G-1_111", email: "a@x.com" },
      { _id: "G-2", name: "Bob", phone: "+966500000002", status: "invited", qrcode: "guest_G-2_222", email: "b@x.com" },
    ],
    staffList: [
      { name: "Sam", phone: "+966500000099" },
    ],
    save: async function () {
      if (this._failNextSave) {
        this._failNextSave = false;
        throw new Error("forced staff save failure");
      }
    },
  };

  const guestStore = new Map(event.guestList.map((g) => [g._id, { ...g }]));
  let nextId = 1000;

  const Guest = {
    deleteMany: async (filter) => {
      for (const id of filter._id?.$in || []) guestStore.delete(id);
    },
    findByIdAndUpdate: async (id, update) => {
      if (guestStore.has(id)) Object.assign(guestStore.get(id), update);
    },
    create: async (docs) => {
      const list = Array.isArray(docs) ? docs : [docs];
      const created = list.map((d) => {
        const id = d._id || `G-${nextId++}`;
        // Mirror the production pre-save hook: set qrcode if missing
        // and the doc is new.
        const qrcode = d.qrcode || `guest_${id}_${Date.now()}`;
        const doc = { ...d, _id: id, qrcode };
        guestStore.set(id, doc);
        return doc;
      });
      return Array.isArray(docs) ? created : created[0];
    },
  };

  return { event, Guest, guestStore, failStaff };
}

/**
 * Mirror the standalone branch of `updateEventStep2` (post-hardening
 * deferred-delete sequencing).
 */
async function runFallback(scenario, payload) {
  const { event, Guest, failStaff } = scenario;

  const incomingPhones = new Set(payload.guestList.map((g) => g.phone));
  const preImageGuestIds = event.guestList.map((g) => g._id);
  const preImageStaffList = event.staffList.map((s) => ({ ...s }));

  const guestById = new Map(event.guestList.map((g) => [g._id, g]));
  const keptIds = [];
  const toUpdate = [];
  const toCreate = [];
  for (const incoming of payload.guestList) {
    const existing = event.guestList.find((g) => g.phone === incoming.phone);
    if (existing) {
      if (existing.name !== incoming.name) {
        toUpdate.push({ _id: existing._id, name: incoming.name });
      }
      keptIds.push(existing._id);
    } else {
      toCreate.push({ name: incoming.name, phone: incoming.phone, email: incoming.email || "" });
    }
  }
  const toDeleteIds = event.guestList.filter((g) => !incomingPhones.has(g.phone)).map((g) => g._id);

  // Step 1: in-place updates with pre-image stash
  const updatePreImages = new Map();
  for (const u of toUpdate) {
    const existing = guestById.get(u._id);
    if (existing) updatePreImages.set(u._id, { name: existing.name, email: existing.email });
    await Guest.findByIdAndUpdate(u._id, { name: u.name });
  }

  // Step 2: create new guests
  const newGuestIds = [];
  if (toCreate.length > 0) {
    const created = await Guest.create(toCreate);
    for (const g of created) newGuestIds.push(g._id);
  }

  // Step 3: save event with [kept, new] (toDelete still in store, just not referenced)
  event.guestList = [...keptIds, ...newGuestIds].map((id) => scenario.guestStore.get(id));
  await event.save();

  // Step 4: save event with new staffList; rollback on failure
  if (failStaff) event._failNextSave = true;
  try {
    event.staffList = payload.staffList.map((s) => ({ name: s.name, phone: s.phone }));
    await event.save();
  } catch (staffErr) {
    // Restore event guest+staff to pre-image
    event.guestList = preImageGuestIds.map((id) => scenario.guestStore.get(id));
    event.staffList = preImageStaffList;
    // Delete freshly-created guests
    if (newGuestIds.length > 0) await Guest.deleteMany({ _id: { $in: newGuestIds } });
    // Restore name on in-place updates (best-effort)
    for (const [id, pre] of updatePreImages.entries()) {
      await Guest.findByIdAndUpdate(id, { name: pre.name });
    }
    // toDeleteIds were never deleted in the first place — nothing to restore.
    throw staffErr;
  }

  // Step 5: post-commit delete of toDeleteIds
  if (toDeleteIds.length > 0) await Guest.deleteMany({ _id: { $in: toDeleteIds } });

  return { event, addedCount: newGuestIds.length };
}

(async () => {
  console.log("\nPhase 4d atomic-step2 failure-injection simulation\n");

  // Scenario 1 — happy path.
  {
    const sc = buildScenario({ failStaff: false });
    const payload = {
      guestList: [
        { name: "Alice", phone: "+966500000001" },
        { name: "Bob (renamed)", phone: "+966500000002" },
        { name: "Carol", phone: "+966500000003" },
      ],
      staffList: [
        { name: "Sam", phone: "+966500000099" },
        { name: "Tina", phone: "+966500000098" },
      ],
    };
    const out = await runFallback(sc, payload);
    eq("happy path: guest count after save", out.event.guestList.length, 3);
    eq("happy path: staff count after save", out.event.staffList.length, 2);
    eq("happy path: addedCount tracks new rows", out.addedCount, 1);
    // Bob was renamed in place — qrcode preserved (no regeneration).
    eq("happy path: in-place update preserves qrcode", sc.guestStore.get("G-2").qrcode, "guest_G-2_222");
  }

  // Scenario 2 — staff save throws → compensation rollback (deferred-delete).
  {
    const sc = buildScenario({ failStaff: true });
    const payload = {
      guestList: [
        // Drop Bob (G-2), keep Alice, add Carol.
        { name: "Alice (new name)", phone: "+966500000001" },
        { name: "Carol", phone: "+966500000003" },
      ],
      staffList: [
        { name: "BrokenStaff", phone: "" }, // contents irrelevant; save throws
      ],
    };
    let threw = null;
    try {
      await runFallback(sc, payload);
    } catch (e) {
      threw = e;
    }
    eq("compensation: error propagates", threw && threw.message, "forced staff save failure");
    eq(
      "compensation: event guest list restored to pre-image",
      sc.event.guestList.map((g) => g.phone).sort(),
      ["+966500000001", "+966500000002"]
    );
    eq(
      "compensation: event staff list restored to pre-image",
      sc.event.staffList.map((s) => s.phone).sort(),
      ["+966500000099"]
    );
    // Critical assertion — the dropped guest (G-2) was never deleted in
    // the first place, so its qrcode is still the original.
    eq("compensation: dropped guest's qrcode preserved verbatim", sc.guestStore.get("G-2").qrcode, "guest_G-2_222");
    eq("compensation: dropped guest's email preserved verbatim", sc.guestStore.get("G-2").email, "b@x.com");
    // Alice's name was reverted on rollback.
    eq("compensation: in-place update reverted on rollback", sc.guestStore.get("G-1").name, "Alice");
    // No orphan Carol in the store.
    const phones = Array.from(sc.guestStore.values()).map((g) => g.phone).sort();
    eq("compensation: no orphan freshly-created guests", phones, ["+966500000001", "+966500000002"]);
  }

  console.log(`\nResult: ${pass} pass / ${fail} fail\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
