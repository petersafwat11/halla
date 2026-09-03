/**
 * Session 5 & 6 Verification Suite:
 * API Contract Parity, Response Envelopes, Authoritative Statistics & Filtered Aggregations
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Ensure models are registered with Mongoose
require('../models/UserModel');
require('../models/DiscountModel');
require('../models/PaymentModel');
require('../models/EventModel');
require('../models/GuestModel');

let mongoServer;

describe('Session 5 & 6: Backend API Contracts, Response Envelopes & Statistics Correctness', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('1. DiscountsService.getAll computes authoritative stats across full multi-page dataset (WEB-12)', async () => {
    const Discount = require('../models/DiscountModel');
    const discountsService = require('../src/modules/discounts/discounts.service');

    const adminId = new mongoose.Types.ObjectId();
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Seed 15 discounts: 10 active (unexpired), 3 expired, 2 inactive
    const docs = [];
    for (let i = 1; i <= 10; i++) {
      docs.push({
        code: `ACTIVE_${i}`,
        descriptionEn: `Active discount ${i}`,
        descriptionAr: `كود نشط ${i}`,
        discountType: 'percentage',
        value: 10,
        isActive: true,
        validFrom: past,
        validUntil: future,
        usedCount: 2,
        createdBy: adminId,
      });
    }
    for (let i = 1; i <= 3; i++) {
      docs.push({
        code: `EXPIRED_${i}`,
        descriptionEn: `Expired discount ${i}`,
        descriptionAr: `كود منتهي ${i}`,
        discountType: 'fixed',
        value: 50,
        isActive: true,
        validFrom: new Date(past.getTime() - 100000),
        validUntil: past,
        usedCount: 5,
        createdBy: adminId,
      });
    }
    for (let i = 1; i <= 2; i++) {
      docs.push({
        code: `INACTIVE_${i}`,
        descriptionEn: `Inactive discount ${i}`,
        descriptionAr: `كود معطل ${i}`,
        discountType: 'percentage',
        value: 15,
        isActive: false,
        validFrom: past,
        validUntil: future,
        usedCount: 0,
        createdBy: adminId,
      });
    }
    await Discount.insertMany(docs);

    // Query page 1 with limit 5 (only 5 rows returned in discounts array)
    const result = await discountsService.getAll({ page: 1, limit: 5 });

    // Envelop assertions (WEB-10)
    assert.equal(result.discounts.length, 5);
    assert.equal(result.pagination.total, 15);
    assert.equal(result.pagination.pages, 3);
    assert.equal(result.pagination.page, 1);
    assert.equal(result.pagination.limit, 5);

    // Statistics assertions (WEB-12): must reflect all 15 items, not just the 5 on page 1
    assert.ok(result.stats, 'Stats object must exist');
    assert.equal(result.stats.total, 15);
    assert.equal(result.stats.active, 13); // 10 active unexpired + 3 active expired (isActive: true)
    assert.equal(result.stats.expired, 3);
    assert.equal(result.stats.totalUsed, (10 * 2) + (3 * 5)); // 20 + 15 = 35 usages
  });

  it('2. AdminPaymentsService.getPayments statistics reflect filtered subsets and date/search queries (WEB-13)', async () => {
    const Payment = require('../models/PaymentModel');
    const User = require('../models/UserModel');
    const adminPaymentsService = require('../src/modules/admin/admin.payments.service');

    const hostUser = await User.create({
      email: 'payhost@example.com',
      phoneNumber: '+966500000001',
      role: 'host',
      accountType: 'personal',
      name: 'Payment Host User',
    });

    const juneDate = new Date('2026-06-15T12:00:00.000Z');
    const julyDate = new Date('2026-07-15T12:00:00.000Z');

    await Payment.insertMany([
      {
        userId: hostUser._id,
        amount: 500,
        currency: 'SAR',
        status: 'paid',
        moyasarPaymentId: 'pay_june_01',
        createdAt: juneDate,
      },
      {
        userId: hostUser._id,
        amount: 300,
        currency: 'SAR',
        status: 'pending',
        moyasarPaymentId: 'pay_june_02',
        createdAt: juneDate,
      },
      {
        userId: hostUser._id,
        amount: 1000,
        currency: 'SAR',
        status: 'paid',
        moyasarPaymentId: 'pay_july_01',
        createdAt: julyDate,
      },
    ]);

    // Unfiltered query
    const allResult = await adminPaymentsService.getPayments({ page: 1, limit: 10 });
    assert.equal(allResult.pagination.total, 3);
    assert.equal(allResult.stats.completed, 2);
    assert.equal(allResult.stats.pending, 1);
    assert.equal(allResult.stats.totalRevenue, 1500);

    // Filtered by June date range: stats must reflect ONLY June payments (revenue: 500, completed: 1, pending: 1)
    const juneResult = await adminPaymentsService.getPayments({
      page: 1,
      limit: 10,
      from: '2026-06-01',
      to: '2026-06-30',
    });
    assert.equal(juneResult.pagination.total, 2);
    assert.equal(juneResult.stats.completed, 1);
    assert.equal(juneResult.stats.pending, 1);
    assert.equal(juneResult.stats.totalRevenue, 500);
  });

  it('3. Admin Events getAllEvents returns statusCounts and pagination envelope (WEB-10, WEB-11)', async () => {
    const Event = require('../models/EventModel');
    const User = require('../models/UserModel');
    const eventsService = require('../src/modules/events/events.service');

    const host = await User.create({
      email: 'eventhost@example.com',
      phoneNumber: '+966500000002',
      role: 'host',
      accountType: 'personal',
    });

    await Event.insertMany([
      {
        host: host._id,
        status: 'live',
        eventDetails: {
          title: 'Live Gala',
          type: 'wedding',
          date: new Date(),
          time: '20:00',
          location: { address: 'Riyadh Ballroom', latitude: 24.7136, longitude: 46.6753 },
        },
      },
      {
        host: host._id,
        status: 'scheduled',
        eventDetails: {
          title: 'Scheduled Meet',
          type: 'conference',
          date: new Date(),
          time: '10:00',
          location: { address: 'Jeddah Center', latitude: 21.5433, longitude: 39.1728 },
        },
      },
      {
        host: host._id,
        status: 'completed',
        eventDetails: {
          title: 'Completed Expo',
          type: 'graduation',
          date: new Date(),
          time: '18:00',
          location: { address: 'Dammam Hall', latitude: 26.4207, longitude: 50.0888 },
        },
      },
    ]);

    const result = await eventsService.getAllEvents({}, { page: 1, limit: 10 });

    assert.equal(result.data.length, 3);
    assert.equal(result.pagination.total, 3);
    assert.ok(result.statusCounts, 'statusCounts must be defined');
    assert.equal(result.statusCounts.live, 1);
    assert.equal(result.statusCounts.scheduled, 1);
    assert.equal(result.statusCounts.completed, 1);
    assert.equal(result.statusCounts.active, 2); // live + scheduled
    assert.equal(result.statusCounts.total, 3);
  });

  it('4. Host statusCounts return zero-fallbacks without nulls or NaN on empty database', async () => {
    const adminHostsService = require('../src/modules/admin/admin.hosts.service');

    const result = await adminHostsService.getHosts({ page: 1, limit: 10 });
    assert.equal(result.hosts.length, 0);
    assert.equal(result.pagination.total, 0);
    assert.deepEqual(result.statusCounts, {
      active: 0,
      pending: 0,
      suspended: 0,
    });
  });
});
