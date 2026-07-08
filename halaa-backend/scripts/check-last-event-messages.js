/**
 * Diagnose why the test message failed.
 * Checks: last event's selected template vs approved templates on Taqnyat.
 * Run: node scripts/check-last-event-messages.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
const Event = require('../models/EventModel');
const taqnyat = require('../src/infrastructure/taqnyat');
const { normalizePhoneNumber } = require('../src/shared/utils/phone');

async function main() {
  await connectDB();

  // Get last event
  const event = await Event.findOne({ testMessageSent: true })
    .sort({ createdAt: -1 })
    .lean();

  const anyEvent = event || await Event.findOne().sort({ createdAt: -1 }).lean();

  if (!anyEvent) {
    console.log('No events found in DB.');
    await disconnectDB();
    return;
  }

  const selectedTemplate = anyEvent.invitationSettings?.selectedTemplate?.name;
  console.log('Last event          :', anyEvent.eventDetails?.title);
  console.log('Selected template   :', selectedTemplate || '(none)');
  console.log('testMessageSent     :', anyEvent.testMessageSent);
  console.log('');

  // Get approved templates from Taqnyat
  const fetched = await taqnyat.getTemplates();
  if (!fetched.success) {
    console.error('Failed to fetch templates:', fetched.error);
    await disconnectDB();
    return;
  }

  const approved = fetched.templates.filter(t => t.status?.toUpperCase() === 'APPROVED');
  const approvedNames = approved.map(t => t.name);

  console.log('Approved templates on Taqnyat:');
  approved.forEach(t => console.log(`  - ${t.name}`));
  console.log('');

  if (!selectedTemplate) {
    console.log('PROBLEM: No template selected on this event.');
    console.log('FIX: Select one of the approved templates above in the event settings.');
  } else if (!approvedNames.includes(selectedTemplate)) {
    console.log(`PROBLEM: Template "${selectedTemplate}" is NOT approved (still PENDING or REJECTED).`);
    console.log('         Meta rejects sends with unapproved templates — Taqnyat returns 402.');
    console.log('');
    console.log('FIX: Update the event to use one of these approved templates:');
    approvedNames.forEach(n => console.log(`  - ${n}`));
  } else {
    console.log(`Template "${selectedTemplate}" is APPROVED — template is not the issue.`);
    console.log('The 402 may be a Taqnyat sandbox restriction (whitelist your number in the Taqnyat dashboard).');
  }

  // Show what the phone normalizer produces
  const testPhone = '500115122';
  console.log('');
  console.log(`Phone normalization check:`);
  console.log(`  Input    : ${testPhone}`);
  console.log(`  Normalized: ${normalizePhoneNumber(testPhone)}`);

  await disconnectDB();
}

main().catch(async err => {
  console.error('Fatal:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
