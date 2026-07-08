/* eslint-disable no-console */
// One-shot: drop the legacy `email_1` index on the `guests` collection.
// Mongoose only auto-creates indexes from the schema; it does NOT remove
// stale ones when a field is dropped from the schema. Run this once
// against the staging DB after deploying the email-removal change.

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');

(async () => {
  await connectDB();
  const indexes = await mongoose.connection.db
    .collection('guests')
    .indexes();
  console.log('Indexes before:');
  indexes.forEach((i) => console.log(' -', i.name, JSON.stringify(i.key)));

  if (indexes.find((i) => i.name === 'email_1')) {
    await mongoose.connection.db.collection('guests').dropIndex('email_1');
    console.log("Dropped index 'email_1'.");
  } else {
    console.log("Index 'email_1' not present — nothing to do.");
  }

  const after = await mongoose.connection.db.collection('guests').indexes();
  console.log('Indexes after:');
  after.forEach((i) => console.log(' -', i.name, JSON.stringify(i.key)));

  await disconnectDB();
  process.exit(0);
})().catch(async (err) => {
  console.error('Failed:', err);
  try { await disconnectDB(); } catch (_) {}
  process.exit(1);
});
