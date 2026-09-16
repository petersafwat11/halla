/* Removes the retired ticket field and indexes. Safe to rerun. */
const mongoose = require('mongoose');
const path = require('path');

async function removeTicketPriority(collection) {
  const indexes = await collection.indexes();
  for (const index of indexes) {
    if (Object.hasOwn(index.key, 'priority')) await collection.dropIndex(index.name);
  }
  const result = await collection.updateMany(
    { priority: { $exists: true } }, { $unset: { priority: '' } }
  );
  await collection.createIndex({ source: 1, status: 1 });
  return result.modifiedCount;
}

async function run() {
  require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
  if (!process.argv.includes('--apply')) {
    console.log('Dry run: remove tickets.priority, drop ticket indexes containing priority, and create source/status index. Use --apply for the configured DATABASE.');
    return;
  }
  if (!process.env.DATABASE) throw new Error('DATABASE is required');
  const options = { autoIndex: false };
  if (process.env.DATABASE_CERT_PATH) {
    options.tls = true;
    options.tlsCertificateKeyFile = path.resolve(__dirname, '..', process.env.DATABASE_CERT_PATH);
  }
  await mongoose.connect(process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || ''), options);
  try {
    const count = await removeTicketPriority(mongoose.connection.collection('tickets'));
    console.log(`Removed retired priority field from ${count} tickets.`);
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) run().catch(() => {
  console.error('Ticket migration failed. Check database connectivity and index permissions.');
  process.exitCode = 1;
});
module.exports = { removeTicketPriority };
