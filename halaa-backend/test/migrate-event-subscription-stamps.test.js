const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { runMigration } = require('../scripts/migrate-event-subscription-stamps');

test('PR4R / F-11: Event Subscription Stamp Migration Script', async (t) => {
  await t.test('Migration script handles dry-run and execute with mock collections', async () => {
    const mockEvents = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        subscriptionId: null,
        planId: null,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        subscriptionId: new mongoose.Types.ObjectId(),
        planId: new mongoose.Types.ObjectId(),
      },
    ];

    const mockSub = {
      _id: mockEvents[1].subscriptionId,
      planId: mockEvents[1].planId,
      status: 'active',
    };

    let bulkExecuted = false;
    const mockDb = {
      collection: (name) => {
        if (name === 'events') {
          let idx = 0;
          return {
            find: () => ({
              hasNext: async () => idx < mockEvents.length,
              next: async () => mockEvents[idx++],
            }),
            bulkWrite: async (ops) => {
              bulkExecuted = true;
              return { modifiedCount: ops.length };
            },
          };
        }
        if (name === 'subscriptions') {
          return {
            findOne: async (filter) => {
              if (filter._id && String(filter._id) === String(mockSub._id)) {
                return mockSub;
              }
              return null;
            },
          };
        }
        throw new Error('Unknown collection: ' + name);
      },
    };

    const origConnection = mongoose.connection;
    const origReadyState = mongoose.connection.readyState;
    try {
      mongoose.connection.readyState = 1;
      mongoose.connection.db = mockDb;

      // 1. Dry run
      const dryResult = await runMigration({ execute: false });
      assert.equal(dryResult.mode, 'DRY-RUN');
      assert.equal(dryResult.scanned, 2);
      assert.equal(dryResult.alreadyStamped, 1);
      assert.equal(dryResult.orphaned, 1);
      assert.equal(bulkExecuted, false);

      // 2. Execute
      const execResult = await runMigration({ execute: true });
      assert.equal(execResult.mode, 'EXECUTE');
      assert.equal(execResult.scanned, 2);
      assert.equal(execResult.orphaned, 1);
      assert.equal(bulkExecuted, true);
    } finally {
      mongoose.connection.readyState = origReadyState;
      mongoose.connection.db = origConnection.db;
    }
  });
});
