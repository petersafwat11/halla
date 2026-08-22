const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const eventsService = require('../src/modules/events/events.service');
const ticketsService = require('../src/modules/tickets/tickets.service');
const adminVendorsService = require('../src/modules/admin/admin.vendors.service');
const adminModeratorsService = require('../src/modules/admin/admin.moderators.service');
const adminHostsService = require('../src/modules/admin/admin.hosts.service');
const adminBusinessesService = require('../src/modules/admin/admin.businesses.service');
const adminPaymentsService = require('../src/modules/admin/admin.payments.service');

const Event = require('../models/EventModel');
const Ticket = require('../models/TicketModel');
const User = require('../models/UserModel');
const Guest = require('../models/GuestModel');
const Payment = require('../models/PaymentModel');

describe('Session 2.2 Backend: Admin List Aggregations & Status Counts (ADM-03)', () => {
  test('getAllEvents returns aggregate statusCounts across full dataset', async () => {
    const origFind = Event.find;
    const origCount = Event.countDocuments;
    const origAgg = Event.aggregate;
    const origGuestAgg = Guest.aggregate;

    Event.find = () => ({
      populate: () => ({
        select: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () => Promise.resolve([
                  { _id: new mongoose.Types.ObjectId(), status: 'live', eventDetails: { title: 'E1' } },
                  { _id: new mongoose.Types.ObjectId(), status: 'scheduled', eventDetails: { title: 'E2' } },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    Event.countDocuments = () => Promise.resolve(50);
    Event.aggregate = () => Promise.resolve([
      { _id: 'live', count: 10 },
      { _id: 'scheduled', count: 20 },
      { _id: 'completed', count: 15 },
      { _id: 'cancelled', count: 5 },
    ]);
    Guest.aggregate = () => Promise.resolve([]);

    try {
      const result = await eventsService.getAllEvents({}, { page: 1, limit: 2 });
      assert.equal(result.data.length, 2);
      assert.equal(result.pagination.total, 50);
      assert.ok(result.statusCounts, 'Must return statusCounts object');
      assert.equal(result.statusCounts.total, 50);
      assert.equal(result.statusCounts.live, 10);
      assert.equal(result.statusCounts.scheduled, 20);
      assert.equal(result.statusCounts.active, 30);
      assert.equal(result.statusCounts.completed, 15);
      assert.equal(result.statusCounts.cancelled, 5);
    } finally {
      Event.find = origFind;
      Event.countDocuments = origCount;
      Event.aggregate = origAgg;
      Guest.aggregate = origGuestAgg;
    }
  });

  test('getTickets returns aggregate statusCounts and priorityCounts across full dataset', async () => {
    const origFind = Ticket.find;
    const origCount = Ticket.countDocuments;
    const origAgg = Ticket.aggregate;

    Ticket.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              populate: () => ({
                lean: () => Promise.resolve([
                  { _id: new mongoose.Types.ObjectId(), subject: 'T1', status: 'open', priority: 'high' },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    Ticket.countDocuments = () => Promise.resolve(100);
    let aggCallCount = 0;
    Ticket.aggregate = () => {
      aggCallCount++;
      if (aggCallCount % 2 === 1) {
        // Status aggregation
        return Promise.resolve([
          { _id: 'open', count: 40 },
          { _id: 'in_progress', count: 30 },
          { _id: 'resolved', count: 20 },
          { _id: 'closed', count: 10 },
        ]);
      }
      // Priority aggregation
      return Promise.resolve([
        { _id: 'low', count: 10 },
        { _id: 'medium', count: 50 },
        { _id: 'high', count: 25 },
        { _id: 'urgent', count: 15 },
      ]);
    };

    try {
      const result = await ticketsService.getTickets('admin_user', true, {}, { page: 1, limit: 1 });
      assert.equal(result.data.length, 1);
      assert.equal(result.pagination.total, 100);
      assert.ok(result.statusCounts, 'Must return statusCounts object');
      assert.ok(result.priorityCounts, 'Must return priorityCounts object');
      assert.equal(result.statusCounts.open, 40);
      assert.equal(result.statusCounts.in_progress, 30);
      assert.equal(result.statusCounts.resolved, 20);
      assert.equal(result.statusCounts.closed, 10);
      assert.equal(result.priorityCounts.high, 25);
      assert.equal(result.priorityCounts.urgent, 15);
    } finally {
      Ticket.find = origFind;
      Ticket.countDocuments = origCount;
      Ticket.aggregate = origAgg;
    }
  });

  test('getVendors returns aggregate statusCounts', async () => {
    const origFind = User.find;
    const origCount = User.countDocuments;
    const origAgg = User.aggregate;

    User.find = () => ({
      select: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([
                { _id: new mongoose.Types.ObjectId(), name: 'V1', profile: { vendorData: { vendorStatus: 'approved' } } },
              ]),
            }),
          }),
        }),
      }),
    });

    User.countDocuments = () => Promise.resolve(75);
    User.aggregate = () => Promise.resolve([
      { _id: 'approved', count: 45 },
      { _id: 'pending', count: 20 },
      { _id: 'rejected', count: 10 },
    ]);

    try {
      const result = await adminVendorsService.getVendors({ page: 1, limit: 1 });
      assert.equal(result.vendors.length, 1);
      assert.equal(result.pagination.total, 75);
      assert.ok(result.statusCounts, 'Must return statusCounts object');
      assert.equal(result.statusCounts.approved, 45);
      assert.equal(result.statusCounts.pending, 20);
      assert.equal(result.statusCounts.rejected, 10);
    } finally {
      User.find = origFind;
      User.countDocuments = origCount;
      User.aggregate = origAgg;
    }
  });

  test('getModerators returns aggregate statusCounts', async () => {
    const origFind = User.find;
    const origCount = User.countDocuments;
    const origAgg = User.aggregate;

    User.find = () => ({
      select: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([
                { _id: new mongoose.Types.ObjectId(), name: 'M1', status: 'active' },
              ]),
            }),
          }),
        }),
      }),
    });

    User.countDocuments = () => Promise.resolve(12);
    User.aggregate = () => Promise.resolve([
      { _id: 'active', count: 8 },
      { _id: 'pending', count: 3 },
      { _id: 'inactive', count: 1 },
    ]);

    try {
      const result = await adminModeratorsService.getModerators({ page: 1, limit: 1 });
      assert.equal(result.moderators.length, 1);
      assert.equal(result.pagination.total, 12);
      assert.ok(result.statusCounts, 'Must return statusCounts object');
      assert.equal(result.statusCounts.active, 8);
      assert.equal(result.statusCounts.pending, 3);
      assert.equal(result.statusCounts.inactive, 1);
    } finally {
      User.find = origFind;
      User.countDocuments = origCount;
      User.aggregate = origAgg;
    }
  });
});