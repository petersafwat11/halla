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
