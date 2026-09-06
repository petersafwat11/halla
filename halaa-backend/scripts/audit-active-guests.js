/** Run with the deployed DATABASE configuration or MONGODB_URI. Default is read-only; --apply normalizes only when
 * no active duplicates exist, then installs the unique index. Resolve duplicate
 * IDs with the event owner first; this script never chooses a history to erase. */
require('dotenv').config({ path: require('path').resolve(__dirname, '../config.env') });
const mongoose = require('mongoose');
const { normalizePhoneNumber } = require('../src/shared/utils/phone');

async function main() {
  let uri = process.env.MONGODB_URI || process.env.DATABASE;
  if (!uri) throw new Error('DATABASE or MONGODB_URI is required');
  if (process.env.DATABASE_PASSWORD && uri.includes('<PASSWORD>')) {
    uri = uri.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
  }
  const options = { autoIndex: false, serverSelectionTimeoutMS: 30000 };
  if (process.env.DATABASE_CERT_PATH) {
    options.tls = true;
    options.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  require('dns').setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8']);
  await mongoose.connect(uri, options);
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    throw new Error('Guest operations require a replica set or sharded MongoDB cluster');
  }
  const guests = mongoose.connection.collection('guests');
  const seen = new Map();
  const duplicates = [];
  const invalid = [];
  for await (const guest of guests.find({ deleted: { $ne: true } })) {
    const phone = normalizePhoneNumber(guest.phone);
    if (!phone) { invalid.push(String(guest._id)); continue; }
    const key = `${guest.event}:${phone}`;
    if (seen.has(key)) duplicates.push([String(seen.get(key)), String(guest._id)]);
    else seen.set(key, guest._id);
  }
  const staleEvents = [];
  for await (const event of mongoose.connection.collection('events').find({}, { projection: { guestList: 1 } })) {
    const active = await guests.find({ event: event._id, deleted: { $ne: true } }, { projection: { _id: 1 } }).toArray();
    const activeIds = new Set(active.map(guest => String(guest._id)));
    const linkedIds = new Set((event.guestList || []).map(String));
    const missingLinks = [...activeIds].filter(id => !linkedIds.has(id)).length;
    const inactiveLinks = [...linkedIds].filter(id => !activeIds.has(id)).length;
    if (missingLinks || inactiveLinks) staleEvents.push({ eventId: String(event._id), missingLinks, inactiveLinks });
  }
  // IDs only: keep guest phone numbers out of migration logs.
  console.log(JSON.stringify({ active: seen.size, duplicates, invalid, staleEvents }, null, 2));
  if (duplicates.length || invalid.length) {
    process.exitCode = 1;
    return;
  }
  if (!process.argv.includes('--apply')) return;
  // Run in a maintenance window with guest writes paused.
  for await (const guest of guests.find({ deleted: { $ne: true } })) {
    await guests.updateOne({ _id: guest._id }, {
      $set: { phone: normalizePhoneNumber(guest.phone), deleted: false },
    });
  }
  await guests.createIndex({ event: 1, phone: 1 }, {
    name: 'active_event_phone_unique', unique: true,
    partialFilterExpression: { deleted: false },
  });
  console.log('Active guest uniqueness index installed.');
  if (process.argv.includes('--repair-links')) {
    // Guests.event is the canonical membership used by listing and delivery.
    // Rebuild only the denormalized references; never delete guest history.
    for (const { eventId } of staleEvents) {
      const id = new mongoose.Types.ObjectId(eventId);
      const active = await guests.find({ event: id, deleted: { $ne: true } }, {
        projection: { _id: 1 },
      }).sort({ _id: 1 }).toArray();
      await mongoose.connection.collection('events').updateOne({ _id: id }, {
        $set: { guestList: active.map(guest => guest._id) }, $inc: { __v: 1 },
      });
    }
    console.log(`Reconciled guest references for ${staleEvents.length} events.`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
