#!/usr/bin/env node
/**
 * Phase 4d W0-ATOMIC — compensation-rollback simulation.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4d-smoke-tests/atomic-step2-failure.js
 *
 * This is an in-process simulation, not a live integration test. It
 * builds an in-memory model of the standalone-Mongo branch in
 * `events.service.updateEventStep2` and asserts that:
 *   1. A successful guest save followed by a successful staff save
 *      leaves both lists at their new values (happy path).
 *   2. A successful guest save followed by a thrown staff save triggers
 *      the compensation branch — guest list reverts to its pre-image
 *      and freshly-created guest docs are deleted.
 *   3. The thrown error propagates to the caller (no swallowing).
 *
 * The real service relies on Mongoose models, which we don't boot here.
 * Instead the test mirrors the control-flow shape using stub objects
 * that record their own state.
 */

const path = require("path");
const fs = require("fs");

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

/**
 * Build a fresh stub for each scenario.
 */
function buildScenario({ failStaff }) {
  const event = {
    _id: "EVT-1",
    status: "scheduled",
    guestList: [
      { _id: "G-1", name: "Alice", phone: "+966500000001", status: "confirmed" },
      { _id: "G-2", name: "Bob", phone: "+966500000002", status: "invited" },
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
        const doc = { ...d, _id: id };
        guestStore.set(id, doc);
        return doc;
      });
      return Array.isArray(docs) ? created : created[0];
    },
  };

  return { event, Guest, guestStore, failStaff };
}

/**
 * Mirror the standalone-fallback branch of updateEventStep2, scoped
 * down to the data ops. The point is to assert the rollback shape.
 */
async function runFallback(scenario, payload) {
  const { event, Guest, failStaff } = scenario;

  const incomingPhones = new Set(payload.guestList.map((g) => g.phone));
  const preImageGuestIds = event.guestList.map((g) => g._id);
  const preImageStaffList = event.staffList.map((s) => ({ ...s }));
  const preImageGuestDocs = event.guestList.map((g) => ({ ...g }));

  const keptIds = [];
  const toCreate = [];
  for (const incoming of payload.guestList) {
    const existing = event.guestList.find((g) => g.phone === incoming.phone);
    if (existing) keptIds.push(existing._id);
    else toCreate.push({ name: incoming.name, phone: incoming.phone, email: incoming.email || "" });
  }
  const toDeleteIds = event.guestList.filter((g) => !incomingPhones.has(g.phone)).map((g) => g._id);
  if (toDeleteIds.length > 0) await Guest.deleteMany({ _id: { $in: toDeleteIds } });
  const newGuestIds = [];
  if (toCreate.length > 0) {
    const created = await Guest.create(toCreate);
    for (const g of created) newGuestIds.push(g._id);
  }

  event.guestList = [...keptIds, ...newGuestIds].map((id) => scenario.guestStore.get(id));
  await event.save();

  if (failStaff) event._failNextSave = true;

  try {
    event.staffList = payload.staffList.map((s) => ({ name: s.name, phone: s.phone }));
    await event.save();
  } catch (staffErr) {
    // Compensation: revert guest list pre-image, delete fresh guests,
    // restore deleted guests if any. Mirrors events.service path.
    const restoreGuestList = preImageGuestDocs.map((g) => ({ ...g }));
    for (const id of newGuestIds) scenario.guestStore.delete(id);
    if (toDeleteIds.length > 0) {
      await Guest.create(
        preImageGuestDocs
          .filter((g) => toDeleteIds.includes(g._id))
          .map((g) => ({ ...g }))
      );
    }
    event.guestList = restoreGuestList;
    event.staffList = preImageStaffList;
    throw staffErr;
  }

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
  }

  // Scenario 2 — staff save throws → compensation rollback.
  {
    const sc = buildScenario({ failStaff: true });
    const payload = {
      guestList: [
        { name: "Alice", phone: "+966500000001" },
        // Bob is dropped here, Carol is added — the failure path must
        // restore both.
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
      "compensation: guest list restored to pre-image",
      sc.event.guestList.map((g) => g.phone).sort(),
      ["+966500000001", "+966500000002"]
    );
    eq(
      "compensation: staff list restored to pre-image",
      sc.event.staffList.map((s) => s.phone).sort(),
      ["+966500000099"]
    );
    // Guest store should also reflect the rollback — no orphan Carol.
    const phones = Array.from(sc.guestStore.values()).map((g) => g.phone).sort();
    eq("compensation: store has no orphan guests", phones, ["+966500000001", "+966500000002"]);
  }

  console.log(`\nResult: ${pass} pass / ${fail} fail\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
