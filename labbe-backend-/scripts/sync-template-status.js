/**
 * One-off script to sync WhatsApp template statuses from Taqnyat/Meta API
 * Run: node scripts/sync-template-status.js
 */

const path = require('path');
// Load env before anything else
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const messagingService = require('../src/modules/messaging/messaging.service');
const Event = require('../models/EventModel');
const taqnyat = require('../src/infrastructure/taqnyat');

async function main() {
  console.log('Connecting to database...');
  await connectDB();

  // 1. Show current pending events
  const pendingEvents = await Event.find({
    'whatsappTemplateStatus.status': 'pending',
  }).select('whatsappTemplateStatus eventDetails.title').lean();

  console.log(`\nFound ${pendingEvents.length} event(s) with PENDING template status:`);
  for (const ev of pendingEvents) {
    console.log(`  - Event: ${ev.eventDetails?.title || ev._id}`);
    console.log(`    Template: ${ev.whatsappTemplateStatus?.templateName}`);
    console.log(`    Meta ID: ${ev.whatsappTemplateStatus?.metaTemplateId || 'N/A'}`);
  }

  // 2. Fetch all templates from Taqnyat API
  console.log('\nFetching templates from Taqnyat API...');
  const templatesResult = await taqnyat.getTemplates();

  console.log('Raw API response:', JSON.stringify(templatesResult, null, 2));

  if (!templatesResult.success) {
    console.error('Failed to fetch templates:', templatesResult.error);
    await disconnectDB();
    process.exit(1);
  }

  const templates = Array.isArray(templatesResult.templates) ? templatesResult.templates : [];
  console.log(`\nGot ${templates.length} template(s) from API:`);
  for (const t of templates) {
    console.log(`  - ${t.name} | status: ${t.status} | id: ${t.id || 'N/A'}`);
  }

  // 3. Run the actual sync logic
  console.log('\nRunning checkPendingTemplateStatuses()...');
  const result = await messagingService.checkPendingTemplateStatuses();
  console.log('Result:', JSON.stringify(result, null, 2));

  // 4. Show updated state
  const allEvents = await Event.find({
    'whatsappTemplateStatus.templateName': { $exists: true, $ne: null },
  }).select('whatsappTemplateStatus eventDetails.title').lean();

  console.log(`\nFinal template statuses for all events:`);
  for (const ev of allEvents) {
    console.log(`  - Event: ${ev.eventDetails?.title || ev._id}`);
    console.log(`    Template: ${ev.whatsappTemplateStatus?.templateName}`);
    console.log(`    Status: ${ev.whatsappTemplateStatus?.status}`);
    console.log(`    Last update: ${ev.whatsappTemplateStatus?.lastStatusUpdate || 'never'}`);
  }

  await disconnectDB();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error('Script failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
