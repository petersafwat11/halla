/* eslint-disable no-console */
// One-shot: move event 6a00858bbed593ed4fd100c3's launch to today (May 10),
// preserve the existing scheduledTime ("17:00" Riyadh = 5 PM).

const { connectDB, disconnectDB } = require('../src/config/database');
const Event = require('../models/EventModel');

const EVENT_ID = '6a00858bbed593ed4fd100c3';

(async () => {
  await connectDB();

  const before = await Event.findById(EVENT_ID).select(
    'status launchSettings'
  );
  if (!before) {
    console.error('Event not found:', EVENT_ID);
    await disconnectDB();
    process.exit(1);
  }
  console.log('BEFORE:', JSON.stringify(before.launchSettings, null, 2));
  console.log('status:', before.status);

  // UTC-midnight of 2026-05-10 — backend reads getUTCDate() from this field.
  const newDate = new Date(Date.UTC(2026, 4, 10));

  const after = await Event.findByIdAndUpdate(
    EVENT_ID,
    {
      $set: {
        'launchSettings.scheduledDate': newDate,
        status: 'scheduled',
      },
    },
    { new: true }
  ).select('status launchSettings');

  console.log('AFTER :', JSON.stringify(after.launchSettings, null, 2));
  console.log('status:', after.status);

  await disconnectDB();
  process.exit(0);
})().catch(async (err) => {
  console.error('Failed:', err);
  try { await disconnectDB(); } catch (_) {}
  process.exit(1);
});
