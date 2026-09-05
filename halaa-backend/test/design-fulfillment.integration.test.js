const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const {
  ADDON_TYPES,
  DESIGN_FULFILLMENT_STATUS,
  isValidDesignFulfillmentTransition,
  getNextFulfillmentStatus,
  deriveExpectedDeliveryDate,
} = require("../src/shared/constants/addons");
const { ROLES } = require("../src/shared/constants/roles");
const { ConflictError, ValidationError, NotFoundError } = require("../src/shared/errors");

let mongod;
let User;
let Addon;
let AuditLog;
let Notification;
let addonsService;
const { runBackfill } = require("../scripts/backfill-design-fulfillment");

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  User = require("../models/UserModel");
  Addon = require("../models/AddonModel");
  AuditLog = require("../models/AuditLogModel");
  Notification = require("../models/NotificationModel");
  addonsService = require("../src/modules/addons/addons.service");
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("PR6 / F-12: Fulfillment state machine constants and helpers", () => {
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.QUEUED), true);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), true);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS, DESIGN_FULFILLMENT_STATUS.FULFILLED), true);

  // Idempotency
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.PAID), true);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.QUEUED), true);

  // Skipped
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.FULFILLED), false);

  // Reversed
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.FULFILLED, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS, DESIGN_FULFILLMENT_STATUS.QUEUED), false);

  // Next valid action
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.PAID), DESIGN_FULFILLMENT_STATUS.QUEUED);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.QUEUED), DESIGN_FULFILLMENT_STATUS.IN_PROGRESS);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), DESIGN_FULFILLMENT_STATUS.FULFILLED);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.FULFILLED), null);
});

test("PR6 / F-12: Store grant and paid creation initialize fulfillment with requestedAt and SLA expectedDeliveryAt", async () => {
  const host = await User.create({
    name: "Design Host One",
    phone: "+966501112233",
    email: "host1@example.com",
    role: ROLES.HOST,
    accountType: "personal",
  });

  const addon = await addonsService.grantAddonFromStore({
    userId: host._id,
    addonType: ADDON_TYPES.DESIGN_TEMPLATE,
    templateType: "custom_themed",
    catalogCode: "design_template_custom_themed",
    providerTransactionId: "txn-design-store-01",
  });

  assert.equal(addon.status, DESIGN_FULFILLMENT_STATUS.PAID);
  assert.ok(addon.fulfillment);
  assert.ok(addon.fulfillment.requestedAt);
  assert.ok(addon.fulfillment.expectedDeliveryAt);

  // SLA for custom_themed is 72 hours
  const requested = new Date(addon.fulfillment.requestedAt).getTime();
  const expected = new Date(addon.fulfillment.expectedDeliveryAt).getTime();
  const diffHours = Math.round((expected - requested) / (3600 * 1000));
  assert.equal(diffHours, 72);

  // Does not invent progress on creation
  assert.equal(addon.fulfillment.queuedAt, null);
  assert.equal(addon.fulfillment.inProgressAt, null);
  assert.equal(addon.fulfillment.fulfilledAt, null);
});

test("PR6 / F-12: Authorized transitions execute sequence with atomic timestamps, audit logs, and notifications", async () => {
  const host = await User.create({
    name: "Design Host Two",
    phone: "+966502223344",
    email: "host2@example.com",
    role: ROLES.HOST,
    accountType: "personal",
  });

  const admin = await User.create({
    name: "Design Ops Admin",
    phone: "+966503334455",
    email: "admin-ops@example.com",
    role: ROLES.SUPER_ADMIN,
  });

  const addon = await Addon.create({
    userId: host._id,
    addonType: ADDON_TYPES.DESIGN_TEMPLATE,
    templateType: "animated",
    price: 350,
    status: DESIGN_FULFILLMENT_STATUS.PAID,
    fulfillment: {
      requestedAt: new Date(),
      expectedDeliveryAt: deriveExpectedDeliveryDate("animated", new Date()),
    },
  });

  // Step 1: paid -> queued
  const step1 = await addonsService.transitionDesignFulfillment(admin, addon._id, {
    toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
    customerNote: "We received your order and queued it for the design team.",
  });
  assert.equal(step1.status, DESIGN_FULFILLMENT_STATUS.QUEUED);
  assert.ok(step1.fulfillment.queuedAt);
  assert.equal(step1.fulfillment.customerNote, "We received your order and queued it for the design team.");
  assert.equal(String(step1.fulfillment.updatedBy), String(admin._id));

  // Step 2: Idempotent same-state call
  const idempotent = await addonsService.transitionDesignFulfillment(admin, addon._id, {
    toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
    customerNote: "Updated note while still queued.",
  });
  assert.equal(idempotent.status, DESIGN_FULFILLMENT_STATUS.QUEUED);
  assert.equal(idempotent.fulfillment.customerNote, "Updated note while still queued.");

  // Step 3: queued -> in_progress
  const step2 = await addonsService.transitionDesignFulfillment(admin, addon._id, {
    toStatus: DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
    internalNotes: "Designer Sarah assigned.",
  });
  assert.equal(step2.status, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS);
  assert.ok(step2.fulfillment.inProgressAt);
  assert.equal(step2.fulfillment.internalNotes, "Designer Sarah assigned.");

  // Step 4: in_progress -> fulfilled
  const step3 = await addonsService.transitionDesignFulfillment(admin, addon._id, {
    toStatus: DESIGN_FULFILLMENT_STATUS.FULFILLED,
    customerNote: "Design delivered via WhatsApp.",
  });
  assert.equal(step3.status, DESIGN_FULFILLMENT_STATUS.FULFILLED);
  assert.ok(step3.fulfillment.fulfilledAt);

  // Verify Audit Log records exist
  const auditEntries = await AuditLog.find({
    action: "addon.fulfillment_transition",
    targetId: addon._id,
  });
  assert.ok(auditEntries.length >= 3);

  // Verify In-App Notification records exist for the host
  const notifs = await Notification.find({
    userId: host._id,
    "data.metadata.addonId": String(addon._id),
  });
  assert.ok(notifs.length >= 3);
});

test("PR6 / F-12: Invalid transitions return ConflictError (409)", async () => {
  const admin = await User.create({
    name: "Super Admin 3",
    email: "admin3@example.com",
    role: ROLES.SUPER_ADMIN,
  });

  const addon = await Addon.create({
    userId: new mongoose.Types.ObjectId(),
    addonType: ADDON_TYPES.DESIGN_TEMPLATE,
    templateType: "3d",
    price: 500,
    status: DESIGN_FULFILLMENT_STATUS.PAID,
    fulfillment: { requestedAt: new Date() },
  });

  // Attempt to skip from paid directly to in_progress -> must throw ConflictError
  await assert.rejects(
    async () => {
      await addonsService.transitionDesignFulfillment(admin, addon._id, {
        toStatus: DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
      });
    },
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Cannot transition design fulfillment from 'paid' to 'in_progress'/);
      return true;
    }
  );

  // Attempt to skip directly to fulfilled -> must throw ConflictError
  await assert.rejects(
    async () => {
      await addonsService.transitionDesignFulfillment(admin, addon._id, {
        toStatus: DESIGN_FULFILLMENT_STATUS.FULFILLED,
      });
    },
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test("PR6 / F-12: concurrent identical transitions commit and notify exactly once", async () => {
  const host = await User.create({
    name: "Concurrent Queue Host",
    email: "concurrent-queue@example.com",
    role: ROLES.HOST,
    accountType: "personal",
  });
  const admin = await User.create({
    name: "Concurrent Queue Admin",
    email: "concurrent-admin@example.com",
    role: ROLES.ADMIN,
  });
  const addon = await Addon.create({
    userId: host._id,
    addonType: ADDON_TYPES.DESIGN_TEMPLATE,
    templateType: "ready_made",
    price: 200,
    status: DESIGN_FULFILLMENT_STATUS.PAID,
    fulfillment: { requestedAt: new Date() },
  });

  const results = await Promise.all([
    addonsService.transitionDesignFulfillment(admin, addon._id, { toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED }),
    addonsService.transitionDesignFulfillment(admin, addon._id, { toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED }),
  ]);
  assert.ok(results.every((item) => item.status === DESIGN_FULFILLMENT_STATUS.QUEUED));
  assert.equal(await AuditLog.countDocuments({ action: "addon.fulfillment_transition", targetId: addon._id }), 1);
  assert.equal(await Notification.countDocuments({
    userId: host._id,
    "data.metadata.addonId": String(addon._id),
    "data.metadata.status": DESIGN_FULFILLMENT_STATUS.QUEUED,
  }), 1);
});

test("PR6 / F-12: service rejects non-admin callers even when invoked outside the route", async () => {
  const host = await User.create({
    name: "Host Caller",
    email: "host-caller@example.com",
    role: ROLES.HOST,
    accountType: "personal",
  });
  await assert.rejects(
    addonsService.transitionDesignFulfillment(host, new mongoose.Types.ObjectId(), {
      toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
    }),
    (err) => err.statusCode === 403 && err.code === "FORBIDDEN"
  );
});

test("PR6 / F-12: Non-design addons are rejected from fulfillment workflow", async () => {
  const admin = await User.create({
    name: "Super Admin 4",
    email: "admin4@example.com",
    role: ROLES.SUPER_ADMIN,
  });

  const inviteAddon = await Addon.create({
    userId: new mongoose.Types.ObjectId(),
    addonType: ADDON_TYPES.EXTRA_INVITES,
    quantity: 50,
    price: 200,
    status: "active",
  });

  await assert.rejects(
    async () => {
      await addonsService.transitionDesignFulfillment(admin, inviteAddon._id, {
        toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Only design_template addons participate in fulfillment workflow/);
      return true;
    }
  );
});

test("PR6 / F-12: Admin list and filterable fulfillment queue", async () => {
  const host = await User.create({
    name: "Queue Host",
    email: "queuehost@example.com",
    phone: "+966504445566",
    role: ROLES.HOST,
    accountType: "personal",
  });

  await Addon.create([
    {
      userId: host._id,
      addonType: ADDON_TYPES.DESIGN_TEMPLATE,
      templateType: "ready_made",
      price: 200,
      status: DESIGN_FULFILLMENT_STATUS.PAID,
      fulfillment: { requestedAt: new Date(Date.now() - 10000) },
    },
    {
      userId: host._id,
      addonType: ADDON_TYPES.DESIGN_TEMPLATE,
      templateType: "custom_male",
      price: 200,
      status: DESIGN_FULFILLMENT_STATUS.QUEUED,
      fulfillment: { requestedAt: new Date(Date.now() - 5000), queuedAt: new Date() },
    },
  ]);

  // List all
  const resAll = await addonsService.listAdminDesignFulfillment({ status: "all", limit: 10 });
  assert.ok(resAll.items.length >= 2);
  assert.ok(resAll.pagination);
  const hostItem = resAll.items.find((i) => i.userId && String(i.userId._id) === String(host._id));
  assert.ok(hostItem);
  assert.equal(hostItem.userId.name, "Queue Host");

  // Filter by status
  const resQueued = await addonsService.listAdminDesignFulfillment({ status: "queued" });
  assert.ok(resQueued.items.every((i) => i.status === "queued"));

  // Filter by templateType
  const resReady = await addonsService.listAdminDesignFulfillment({ templateType: "ready_made" });
  assert.ok(resReady.items.every((i) => i.templateType === "ready_made"));

  // Search by host name
  const resSearch = await addonsService.listAdminDesignFulfillment({ search: "Queue Host" });
  assert.ok(resSearch.items.length >= 1);
});

test("PR6 / F-12: Repeatable dry-run and execute backfill script", async () => {
  const oldAddon = await Addon.create({
    userId: new mongoose.Types.ObjectId(),
    addonType: ADDON_TYPES.DESIGN_TEMPLATE,
    templateType: "3d",
    price: 500,
    status: DESIGN_FULFILLMENT_STATUS.PAID,
    // missing fulfillment
  });

  // Dry-run mode
  const dryRun = await runBackfill({ execute: false });
  assert.ok(dryRun.scanned >= 1);
  assert.ok(dryRun.updated >= 1);

  // Addon in DB should still NOT be modified after dry-run
  const postDry = await Addon.findById(oldAddon._id);
  assert.equal(postDry.fulfillment?.requestedAt, null);

  // Execute mode
  const executed = await runBackfill({ execute: true });
  assert.ok(executed.updated >= 1);

  // Addon in DB should now have requestedAt and expectedDeliveryAt
  const postExecute = await Addon.findById(oldAddon._id);
  assert.ok(postExecute.fulfillment?.requestedAt);
  assert.ok(postExecute.fulfillment?.expectedDeliveryAt);

  // Second execute: idempotent (alreadyValid increases, updated = 0)
  const replay = await runBackfill({ execute: true });
  assert.ok(replay.alreadyValid >= 1);
});
