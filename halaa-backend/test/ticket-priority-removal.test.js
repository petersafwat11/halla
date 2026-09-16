const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const db = require('./helpers/memoryDb');
const Ticket = require('../models/TicketModel');
const { removeTicketPriority } = require('../scripts/remove-ticket-priority');

test('ticket migration removes legacy priority and indexes, preserves data and is repeatable', async () => {
  await db.start();
  try {
    const collection = mongoose.connection.collection('tickets');
    const id = new mongoose.Types.ObjectId();
    await collection.insertOne({ _id: id, subject: 'Legacy ticket', message: 'Keep original message', priority: 'urgent', status: 'open' });
    await collection.createIndex({ source: 1, priority: 1, status: 1 });
    await collection.createIndex({ priority: 1 });
    assert.equal(await removeTicketPriority(collection), 1);
    const ticket = await collection.findOne({ _id: id });
    assert.equal(Object.hasOwn(ticket, 'priority'), false);
    assert.equal(ticket.message, 'Keep original message');
    assert.equal(ticket.status, 'open');
    assert.ok((await collection.indexes()).every(index => !Object.hasOwn(index.key, 'priority')));
    assert.equal(await removeTicketPriority(collection), 0);
    assert.equal(Ticket.schema.path('priority'), undefined);
  } finally { await db.stop(); }
});
