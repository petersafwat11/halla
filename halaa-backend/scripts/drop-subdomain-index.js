/* eslint-disable no-console */
// One-shot: drop the stale domain.subdomain_1 index on the users collection
// so Mongoose can recreate it with partialFilterExpression.

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');

(async () => {
  await connectDB();
  const indexes = await mongoose.connection.db
    .collection('users')
    .indexes();
  console.log('Indexes before:');
  indexes.forEach((i) => console.log(' -', i.name, JSON.stringify(i.key)));

  if (indexes.find((i) => i.name === 'domain.subdomain_1')) {
    await mongoose.connection.db.collection('users').dropIndex('domain.subdomain_1');
    console.log("Dropped index 'domain.subdomain_1'.");
  } else {
    console.log("Index 'domain.subdomain_1' not present — nothing to do.");
  }

  const after = await mongoose.connection.db.collection('users').indexes();
  console.log('Indexes after:');
  after.forEach((i) => console.log(' -', i.name, JSON.stringify(i.key)));

  await disconnectDB();
  process.exit(0);
})().catch(async (err) => {
  console.error('Failed:', err);
  try { await disconnectDB(); } catch (_) {}
  process.exit(1);
});
