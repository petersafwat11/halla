/**
 * Live-event Guest Invariants Test Suite (Session 1.3 · EVT-03 & EVT-15)
 *
 * Tests the complete state matrix (draft, scheduled, live, completed, cancelled)
 * for guest addition, modification, deletion, and step2 atomic updates.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const Event = require("../models/EventModel");
const Guest = require("../models/GuestModel");

const eventsService = require("../src/modules/events/events.service");
const guestsService = require("../src/modules/guests/guests.service");
const { ValidationError } = require("../src/shared/errors");

let hostUser;
let poolSub;

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();

  hostUser = await User.create({
    name: "Host User",
    email: "host@example.com",
    phone: "+966500000001",
    password: "password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  poolSub = await Subscription.create({
    userId: hostUser._id,
    planId: plan._id,
    status: "active",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
});

async function createEventWithGuests(status, guestCount = 2) {
  const event = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status,
    eventDetails: {
      title: `${status} Event`,
      type: "wedding",
      date: new Date(Date.now() + 7 * 86400000),
      time: "20:00",
      location: {
        address: "Riyadh Hall",
        city: "Riyadh",
        latitude: 24.7136,
        longitude: 46.6753,
      },
    },
    guestLimit: -1,
    guestList: [],
    staffList: [],
  });

  const guests = [];
  for (let i = 1; i <= guestCount; i++) {
    const g = await Guest.create({
      name: `Guest ${i}`,
      phone: `050000000${i}`,
      category: "Family",
      event: event._id,
      status: i === 1 ? "confirmed" : "invited",
      addedBy: hostUser._id,
      rsvp: i === 1 ? { response: "confirmed", respondedAt: new Date() } : undefined,
    });
    guests.push(g);
  }

  event.guestList = guests.map((g) => g._id);
  await event.save();
  return { event, guests };
}

// ── 1. Live Event Tests ────────────────────────────────────────────────────────

test("Live Event: addGuest allows adding new guests", async () => {
  const { event } = await createEventWithGuests("live", 2);

  const res = await guestsService.addGuest(
    event._id.toString(),
    { name: "New Live Guest", phone: "0500000099", category: "Friends" },
    hostUser
  );

  assert.ok(res.guest);
  assert.equal(res.guest.name, "New Live Guest");
  assert.equal(res.guest.status, "invited");

  const updatedEvent = await Event.findById(event._id);
  assert.equal(updatedEvent.guestList.length, 3);
});

test("Live Event: updateGuest rejects editing existing guests", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);
  const targetGuest = guests[0];

  await assert.rejects(
    async () => {
      await guestsService.updateGuest(
        event._id.toString(),
        targetGuest._id.toString(),
        { name: "Modified Name" },
        hostUser
      );
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Cannot modify existing guests on a live event/);
      return true;
    }
  );
});

test("Live Event: deleteGuest rejects deleting existing guests", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);
  const targetGuest = guests[0];

  await assert.rejects(
    async () => {
      await guestsService.deleteGuest(
        event._id.toString(),
        targetGuest._id.toString(),
        hostUser
      );
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Cannot delete guests from a live event/);
      return true;
    }
  );
});

test("Live Event: step2 allows adding new guests while preserving existing guests and their RSVP data", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);

  const payload = {
    guestList: [
      { name: guests[0].name, phone: guests[0].phone, category: guests[0].category },
      { name: guests[1].name, phone: guests[1].phone, category: guests[1].category },
      { name: "Brand New Guest", phone: "0500000088", category: "VIP" },
    ],
    staffList: [],
  };

  const result = await eventsService.updateEventStep2(event._id.toString(), payload, hostUser);
  assert.equal(result.addedCount, 1);

  // Assert existing guest 0 still has confirmed status and RSVP preserved
  const reloadedGuest0 = await Guest.findById(guests[0]._id);
  assert.equal(reloadedGuest0.status, "confirmed");
  assert.equal(reloadedGuest0.rsvp?.response, "confirmed");
  assert.equal(reloadedGuest0.name, "Guest 1");

  const reloadedEvent = await Event.findById(event._id);
  assert.equal(reloadedEvent.guestList.length, 3);
});

test("Live Event: step2 rejects modifying existing guest details", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);

  const payload = {
    guestList: [
      { name: "Changed Name", phone: guests[0].phone, category: guests[0].category },
      { name: guests[1].name, phone: guests[1].phone, category: guests[1].category },
    ],
    staffList: [],
  };

  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(event._id.toString(), payload, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify existing guests on a live event/i);
      return true;
    }
  );
});

test("Live Event: step2 rejects dropping/removing an existing guest", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);

  // Only send guest 0, omitting guest 1
  const payload = {
    guestList: [
      { name: guests[0].name, phone: guests[0].phone, category: guests[0].category },
    ],
    staffList: [],
  };

  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(event._id.toString(), payload, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot remove existing guests from a live event/i);
      return true;
    }
  );
});

test("Live Event: updateGuestList rejects modifying existing guest or removing existing guest", async () => {
  const { event, guests } = await createEventWithGuests("live", 2);

  // Attempting to remove guest 1
  await assert.rejects(
    async () => {
      await eventsService.updateGuestList(
        event._id.toString(),
        [{ name: guests[0].name, phone: guests[0].phone, category: guests[0].category }],
        hostUser
      );
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot remove existing guests from a live event/i);
      return true;
    }
  );

  // Attempting to edit guest 0 name
  await assert.rejects(
    async () => {
      await eventsService.updateGuestList(
        event._id.toString(),
        [
          { name: "Edited Name", phone: guests[0].phone, category: guests[0].category },
          { name: guests[1].name, phone: guests[1].phone, category: guests[1].category },
        ],
        hostUser
      );
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify existing guests on a live event/i);
      return true;
    }
  );
});

// ── 2. Completed / Cancelled Event Tests ────────────────────────────────────────

test("Completed Event: rejects all guest additions and modifications", async () => {
  const { event, guests } = await createEventWithGuests("completed", 2);

  await assert.rejects(
    async () => {
      await guestsService.addGuest(event._id.toString(), { name: "Guest", phone: "0500000099" }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot add guests to a completed event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await guestsService.updateGuest(event._id.toString(), guests[0]._id.toString(), { name: "New" }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify guests of a completed event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await guestsService.deleteGuest(event._id.toString(), guests[0]._id.toString(), hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot delete guests from a completed event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(event._id.toString(), { guestList: [] }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify.*event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await eventsService.updateGuestList(event._id.toString(), [], hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify.*event/i);
      return true;
    }
  );
});

test("Cancelled Event: rejects all guest additions and modifications", async () => {
  const { event, guests } = await createEventWithGuests("cancelled", 2);

  await assert.rejects(
    async () => {
      await guestsService.addGuest(event._id.toString(), { name: "Guest", phone: "0500000099" }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot add guests to a cancelled event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await guestsService.updateGuest(event._id.toString(), guests[0]._id.toString(), { name: "New" }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify guests of a cancelled event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await guestsService.deleteGuest(event._id.toString(), guests[0]._id.toString(), hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot delete guests from a cancelled event/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(event._id.toString(), { guestList: [] }, hostUser);
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 409 || err.isOperational);
      assert.match(err.message, /Cannot modify.*event/i);
      return true;
    }
  );
});

// ── 3. Draft / Scheduled Event Tests ───────────────────────────────────────────

test("Scheduled Event: allows full CRUD on guests", async () => {
  const { event, guests } = await createEventWithGuests("scheduled", 2);

  // 1. Update guest name
  const updated = await guestsService.updateGuest(
    event._id.toString(),
    guests[0]._id.toString(),
    { name: "Updated Guest 1" },
    hostUser
  );
  assert.equal(updated.guest.name, "Updated Guest 1");

  // 2. Add guest
  const added = await guestsService.addGuest(
    event._id.toString(),
    { name: "Scheduled New Guest", phone: "0500000055" },
    hostUser
  );
  assert.equal(added.guest.name, "Scheduled New Guest");

  // 3. Delete guest
  await guestsService.deleteGuest(
    event._id.toString(),
    guests[1]._id.toString(),
    hostUser
  );

  const reloaded = await Event.findById(event._id);
  assert.equal(reloaded.guestList.length, 2);
});


test("Canonical pool: concurrent quick-add cannot exceed capacity", async () => {
  const { event } = await createEventWithGuests("scheduled", 2);
  await Subscription.updateOne({ _id: poolSub._id }, { $set: { invitePool: 3 } });
  const results = await Promise.allSettled([
    guestsService.addGuest(event.id, { name: "A", phone: "0500000091" }, hostUser),
    guestsService.addGuest(event.id, { name: "B", phone: "0500000092" }, hostUser),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await Guest.countDocuments({ event: event._id, deleted: { $ne: true } }), 3);
  assert.equal((await Event.findById(event._id)).guestList.length, 3);
});

test("Canonical pool: normalized concurrent duplicates create one guest", async () => {
  const { event } = await createEventWithGuests("scheduled", 0);
  const results = await Promise.allSettled([
    guestsService.addGuest(event.id, { name: "A", phone: "0500000091" }, hostUser),
    guestsService.addGuest(event.id, { name: "A", phone: "+966500000091" }, hostUser),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.code, "GUEST_ALREADY_EXISTS");
  assert.equal(await Guest.countDocuments({ event: event._id }), 1);
});

test("Guest removal preserves history and excludes tombstones from list and stats", async () => {
  const { event, guests } = await createEventWithGuests("scheduled", 2);
  await guestsService.deleteGuest(event.id, guests[1].id, hostUser);
  assert.equal((await Guest.findById(guests[1]._id)).deleted, true);
  assert.equal((await guestsService.getEventGuests(event.id, hostUser)).pagination.total, 1);
  assert.equal((await Guest.getEventStats(event.id)).total, 1);
});

test("Failed and archived events reject quick-add", async () => {
  for (const status of ["failed", "archived"]) {
    const { event } = await createEventWithGuests(status, 0);
    await assert.rejects(guestsService.addGuest(event.id, { name: "A", phone: "0500000091" }, hostUser), /Cannot add/);
  }
});


test("Bulk changes are scoped, preserve history and reject live edits", async () => {
  const { event, guests } = await createEventWithGuests("scheduled", 2);
  const result = await guestsService.bulkUpdate(event.id, { action: "category", category: "VIP", guestIds: guests.map(g => g.id) }, hostUser);
  assert.equal(result.updated, 2);
  assert.equal(await Guest.countDocuments({ event: event._id, category: "VIP" }), 2);
  await Event.updateOne({ _id: event._id }, { $set: { status: "live" } });
  await assert.rejects(guestsService.bulkUpdate(event.id, { action: "remove", guestIds: guests.map(g => g.id) }, hostUser), /Cannot bulk/);
  assert.equal(await Guest.countDocuments({ event: event._id, deleted: false }), 2);
});

test("Pagination and authoritative audience retain guests beyond page 50", async () => {
  const { event } = await createEventWithGuests("live", 0);
  await Guest.insertMany(Array.from({ length: 201 }, (_, i) => ({
    name: 'Guest ' + String(i).padStart(3, '0'), phone: '+9665' + String(10000000 + i),
    event: event._id, status: 'invited', addedBy: hostUser._id,
  })));
  const page = await guestsService.getEventGuests(event.id, hostUser, {}, { page: 2, limit: 50 });
  assert.equal(page.data.length, 50);
  assert.equal(page.data[0].name, 'Guest 050');
  assert.equal(page.pagination.total, 201);
  const found = await guestsService.getEventGuests(event.id, hostUser, { search: 'Guest 200' });
  assert.equal(found.data.length, 1);
  const preview = await guestsService.previewAudience(event.id, hostUser);
  assert.equal(preview.audiences.newGuests.count, 201);
  const { guestAudienceFilter } = require('../src/modules/guests/guestAudience');
  assert.equal(await Guest.countDocuments(guestAudienceFilter(event.id, 'newGuests', [])), 0);
});

test("Unique active-phone index rejects insertion races but permits tombstone history", async () => {
  await Guest.collection.createIndex({ event: 1, phone: 1 }, { name: 'active_event_phone_unique', unique: true, partialFilterExpression: { deleted: false } });
  const { event } = await createEventWithGuests("scheduled", 0);
  const make = phone => Guest.create({ event: event._id, name: 'Guest', phone });
  const results = await Promise.allSettled([make('0500000091'), make('+966500000091')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 11000);
  await Guest.updateMany({ event: event._id }, { $set: { deleted: true } });
  await make('0500000091');
  assert.equal(await Guest.countDocuments({ event: event._id }), 2);
});


test("Unchanged event date survives the moving creation floor", async () => {
  const { event } = await createEventWithGuests('pending_scheduling', 0);
  const stored = new Date(Date.now() + 86400000);
  await Event.updateOne({ _id: event._id }, { $set: { 'eventDetails.date': stored } });
  const saved = await eventsService.updateEventDetails(event.id, { title: 'Renamed', date: stored.toISOString(), time: '20:00' }, hostUser);
  assert.equal(saved.event.eventDetails.title, 'Renamed');
});

test("Invalid changed date does not unschedule an event", async () => {
  const { event } = await createEventWithGuests('scheduled', 0);
  await assert.rejects(eventsService.updateEventDetails(event.id, { date: new Date(Date.now() + 86400000) }, hostUser), /too soon/);
  assert.equal((await Event.findById(event._id)).status, 'scheduled');
});


test("Changed template fields require a fresh image before unscheduling", async () => {
  const { event } = await createEventWithGuests('scheduled', 0);
  await assert.rejects(eventsService.updateInvitationSettings(event.id,
    { visualTemplate: { fieldValues: { title: 'Changed' }, isCustomUpload: false } }, hostUser),
    error => error.code === 'EVENT_IMAGE_REQUIRED');
  assert.equal((await Event.findById(event._id)).status, 'scheduled');
});
