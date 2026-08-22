const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const db = require('./helpers/memoryDb');

const User = require('../models/UserModel');
const Event = require('../models/EventModel');
const Subscription = require('../models/SubscriptionModel');
const Plan = require('../models/PlanModel');

const adminHostsService = require('../src/modules/admin/admin.hosts.service');
const adminVendorsService = require('../src/modules/admin/admin.vendors.service');
const adminModeratorsService = require('../src/modules/admin/admin.moderators.service');
const eventsService = require('../src/modules/events/events.crud.service');

const {
  bulkIdsSchema,
  bulkVendorStatusSchema,
  bulkModeratorStatusSchema,
  bulkEventStatusSchema,
} = require('../src/modules/admin/admin.validation');
const { bulkDeleteSchema } = require('../src/modules/events/events.validation');

const { EVENT_STATUS, USER_STATUS, ROLES, VENDOR_STATUS } = require('../src/shared/constants');

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();
});

test('bulk validation schemas: standard { ids } envelope, deduplication, alias support, and bounds', () => {
  const id1 = new mongoose.Types.ObjectId().toString();
  const id2 = new mongoose.Types.ObjectId().toString();

  // 1. Standard { ids } payload with deduplication
  const parsed = bulkIdsSchema.parse({ ids: [id1, id2, id1] });
  assert.deepEqual(parsed.ids, [id1, id2]);

  // 2. Alias keys support (hostIds, vendorIds, moderatorIds, eventIds, ticketIds)
  const parsedHost = bulkIdsSchema.parse({ hostIds: [id1, id2] });
  assert.deepEqual(parsedHost.ids, [id1, id2]);

  const parsedVendor = bulkIdsSchema.parse({ vendorIds: [id1] });
  assert.deepEqual(parsedVendor.ids, [id1]);

  const parsedMod = bulkIdsSchema.parse({ moderatorIds: [id2] });
  assert.deepEqual(parsedMod.ids, [id2]);

  // 3. Bounds: empty array fails
  assert.throws(() => bulkIdsSchema.parse({ ids: [] }));
  assert.throws(() => bulkIdsSchema.parse({}));

  // 4. Bounds: oversized array (>200) fails
  const oversized = Array.from({ length: 201 }, () => new mongoose.Types.ObjectId().toString());
  assert.throws(() => bulkIdsSchema.parse({ ids: oversized }));

  // 5. Invalid ObjectId format fails
  assert.throws(() => bulkIdsSchema.parse({ ids: ['invalid-id'] }));

  // 6. Vendor status schema with alias & deduplication
  const vendorStatusParsed = bulkVendorStatusSchema.parse({
    vendorIds: [id1, id1, id2],
    status: 'approved',
  });
  assert.deepEqual(vendorStatusParsed.ids, [id1, id2]);
  assert.equal(vendorStatusParsed.status, 'approved');

  // 7. Moderator status schema
  const modStatusParsed = bulkModeratorStatusSchema.parse({
    ids: [id1],
    status: 'suspended',
  });
  assert.deepEqual(modStatusParsed.ids, [id1]);
  assert.equal(modStatusParsed.status, 'suspended');

  // 8. Event status schema
  const eventStatusParsed = bulkEventStatusSchema.parse({
    eventIds: [id1],
    status: EVENT_STATUS.CANCELLED,
  });
  assert.deepEqual(eventStatusParsed.ids, [id1]);
  assert.equal(eventStatusParsed.status, EVENT_STATUS.CANCELLED);

  // 9. Host events bulkDeleteSchema
  const eventDeleteParsed = bulkDeleteSchema.parse({
    ids: [id1, id2, id1],
  });
  assert.deepEqual(eventDeleteParsed.ids, [id1, id2]);
});

test('admin hosts bulk delete: mixed valid, non-existent, and active-event hosts reporting', async () => {
  // Host 1: eligible for deletion
  const host1 = await User.create({
    name: 'Host One',
    username: `host1_${Date.now()}`,
    email: `host1_${Date.now()}@example.com`,
    phoneNumber: '+966551110001',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });

  // Host 2: has an active published event
  const host2 = await User.create({
    name: 'Host Two',
    username: `host2_${Date.now()}`,
    email: `host2_${Date.now()}@example.com`,
    phoneNumber: '+966551110002',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });

  await Event.create({
    host: host2._id,
    eventDetails: { title: 'Active Live Gala', type: 'wedding', location: { address: 'Riyadh', latitude: 24.7136, longitude: 46.6753 }, date: new Date(), time: '20:00' },
    status: EVENT_STATUS.PUBLISHED,
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  const result = await adminHostsService.bulkDeleteHosts([
    host1._id.toString(),
    host2._id.toString(),
    nonExistentId,
  ]);

  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.deletedCount, 1);
  assert.deepEqual(result.succeeded, [host1._id.toString()]);
  assert.equal(result.failed.length, 2);

  const failedHost2 = result.failed.find((f) => f.id === host2._id.toString());
  assert.ok(failedHost2);
  assert.match(failedHost2.error, /active events/i);

  const failedNonExistent = result.failed.find((f) => f.id === nonExistentId);
  assert.ok(failedNonExistent);
  assert.match(failedNonExistent.error, /not found/i);

  // Verify DB state
  const updatedHost1 = await User.findOne({ _id: host1._id, deletedAt: { $exists: true } });
  assert.ok(updatedHost1);
  assert.equal(updatedHost1.status, USER_STATUS.DELETED);

  const updatedHost2 = await User.findById(host2._id);
  assert.ok(updatedHost2);
  assert.equal(updatedHost2.status, USER_STATUS.ACTIVE);
});

test('admin vendors bulk operations: delete and status update with mixed results', async () => {
  const vendor1 = await User.create({
    name: 'Vendor One',
    username: `v1_${Date.now()}`,
    email: `v1_${Date.now()}@example.com`,
    phoneNumber: '+966552220001',
    role: ROLES.VENDOR,
    status: USER_STATUS.PENDING,
    profile: { vendorData: { brandName: 'Brand 1', vendorStatus: VENDOR_STATUS.PENDING } },
  });

  const vendor2 = await User.create({
    name: 'Vendor Two',
    username: `v2_${Date.now()}`,
    email: `v2_${Date.now()}@example.com`,
    phoneNumber: '+966552220002',
    role: ROLES.VENDOR,
    status: USER_STATUS.PENDING,
    profile: { vendorData: { brandName: 'Brand 2', vendorStatus: VENDOR_STATUS.PENDING } },
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  // Test bulkUpdateVendorStatus
  const statusResult = await adminVendorsService.bulkUpdateVendorStatus(
    [vendor1._id.toString(), vendor2._id.toString(), nonExistentId],
    VENDOR_STATUS.APPROVED
  );

  assert.equal(statusResult.success, true);
  assert.equal(statusResult.count, 2);
  assert.equal(statusResult.updatedCount, 2);
  assert.deepEqual(statusResult.succeeded, [vendor1._id.toString(), vendor2._id.toString()]);
  assert.equal(statusResult.failed.length, 1);
  assert.equal(statusResult.failed[0].id, nonExistentId);

  const updatedV1 = await User.findById(vendor1._id);
  assert.ok(updatedV1);
  assert.equal(updatedV1.status, USER_STATUS.ACTIVE);
  assert.equal(updatedV1.profile.vendorData.vendorStatus, VENDOR_STATUS.APPROVED);

  // Test bulkDeleteVendors
  const deleteResult = await adminVendorsService.bulkDeleteVendors([
    vendor1._id.toString(),
    nonExistentId,
  ]);

  assert.equal(deleteResult.success, true);
  assert.equal(deleteResult.count, 1);
  assert.equal(deleteResult.deletedCount, 1);
  assert.deepEqual(deleteResult.succeeded, [vendor1._id.toString()]);
  assert.equal(deleteResult.failed.length, 1);

  const deletedV1 = await User.findOne({ _id: vendor1._id, deletedAt: { $exists: true } });
  assert.ok(deletedV1);
  assert.equal(deletedV1.status, USER_STATUS.DELETED);
});

test('admin moderators bulk operations: delete and status update with mixed results', async () => {
  const mod1 = await User.create({
    name: 'Moderator One',
    username: `m1_${Date.now()}`,
    email: `m1_${Date.now()}@example.com`,
    phoneNumber: '+966553330001',
    role: ROLES.MODERATOR,
    status: USER_STATUS.ACTIVE,
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  // Bulk status update
  const statusResult = await adminModeratorsService.bulkUpdateModeratorStatus(
    [mod1._id.toString(), nonExistentId],
    USER_STATUS.SUSPENDED
  );

  assert.equal(statusResult.success, true);
  assert.equal(statusResult.count, 1);
  assert.deepEqual(statusResult.succeeded, [mod1._id.toString()]);
  assert.equal(statusResult.failed.length, 1);

  const updatedMod1 = await User.findById(mod1._id);
  assert.ok(updatedMod1);
  assert.equal(updatedMod1.status, USER_STATUS.SUSPENDED);

  // Bulk delete
  const deleteResult = await adminModeratorsService.bulkDeleteModerators([
    mod1._id.toString(),
    nonExistentId,
  ]);

  assert.equal(deleteResult.success, true);
  assert.equal(deleteResult.count, 1);
  assert.deepEqual(deleteResult.succeeded, [mod1._id.toString()]);
  assert.equal(deleteResult.failed.length, 1);

  const deletedMod1 = await User.findOne({ _id: mod1._id, deletedAt: { $exists: true } });
  assert.ok(deletedMod1);
  assert.equal(deletedMod1.status, USER_STATUS.DELETED);
});

test('host events bulkDeleteEvents: returns standard per-item result envelope', async () => {
  const host = await User.create({
    name: 'Host User',
    username: `h_${Date.now()}`,
    email: `h_${Date.now()}@example.com`,
    phoneNumber: '+966554440001',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });

  const otherHost = await User.create({
    name: 'Other Host',
    username: `oh_${Date.now()}`,
    email: `oh_${Date.now()}@example.com`,
    phoneNumber: '+966554440002',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });

  const event1 = await Event.create({
    host: host._id,
    eventDetails: { title: 'Party 1', type: 'wedding', location: { address: 'Riyadh', latitude: 24.7136, longitude: 46.6753 }, date: new Date(), time: '18:00' },
    status: EVENT_STATUS.PENDING_SCHEDULING,
  });

  const eventOtherHost = await Event.create({
    host: otherHost._id,
    eventDetails: { title: 'Other Party', type: 'wedding', location: { address: 'Riyadh', latitude: 24.7136, longitude: 46.6753 }, date: new Date(), time: '18:00' },
    status: EVENT_STATUS.PENDING_SCHEDULING,
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  const result = await eventsService.bulkDeleteEvents(
    [event1._id.toString(), eventOtherHost._id.toString(), nonExistentId],
    host._id
  );

  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.deletedCount, 1);
  assert.deepEqual(result.succeeded, [event1._id.toString()]);
  assert.equal(result.failed.length, 2);

  const updatedEvent1 = await Event.findById(event1._id);
  assert.ok(updatedEvent1);
  assert.equal(updatedEvent1.status, EVENT_STATUS.DELETED);

  const untouchedOtherEvent = await Event.findById(eventOtherHost._id);
  assert.ok(untouchedOtherEvent);
  assert.equal(untouchedOtherEvent.status, EVENT_STATUS.PENDING_SCHEDULING);
});
