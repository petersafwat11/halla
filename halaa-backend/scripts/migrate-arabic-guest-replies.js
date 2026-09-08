/** Replace only exact historical product defaults; preserve custom host copy.
 * Dry run: node scripts/migrate-arabic-guest-replies.js
 * Apply: node scripts/migrate-arabic-guest-replies.js --apply --backup ABSOLUTE_PATH
 * Each update compares the original field, so concurrent edits are preserved.
 */
const fs = require('fs');
const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
const defaults = require('@halaa/shared/constants/guestReplies.cjs');
const { connectDB } = require('../src/config/database');
const mongoose = require('mongoose');
const Event = require('../models/EventModel');
const historical = {
  onAttend: ["Thank you for confirming! We're delighted to have you with us. 🎉", "Thank you for confirming! We're delighted you'll be joining us. 🎉"],
  onAbsent: ["Thank you for letting us know. We understand and wish you all the best. 🌹", "Thank you for letting us know. We'll truly miss you — you're welcome anytime."],
};
(async () => {
  await connectDB();
  const changes = [];
  for (const [key, texts] of Object.entries(historical)) {
    const field = 'guestReplies.' + key;
    for (const event of await Event.find({ [field]: { $in: texts } }).select('guestReplies').lean()) {
      changes.push({ id: String(event._id), field, before: event.guestReplies[key], after: defaults[key] });
    }
  }
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', events: new Set(changes.map(c => c.id)).size, fields: changes.length }));
  if (process.argv.includes('--apply')) {
    const index = process.argv.indexOf('--backup');
    const backup = index >= 0 ? process.argv[index + 1] : null;
    if (!backup || !path.isAbsolute(backup)) throw new Error('An absolute backup path is required');
    fs.writeFileSync(backup, JSON.stringify({ at: new Date(), changes }, null, 2), { flag: 'wx' });
    let modified = 0;
    for (const change of changes) {
      const result = await Event.updateOne({ _id: change.id, [change.field]: change.before }, { $set: { [change.field]: change.after } });
      modified += result.modifiedCount;
    }
    console.log(JSON.stringify({ modifiedFields: modified }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
