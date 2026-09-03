/**
 * Inspect a single event's last test-message attempt.
 *
 * Usage: node scripts/inspect-test-message.js <eventId>
 *
 * Prints:
 *   - Event-level state set by sendTestMessage (lastTestAt, testMessageSent,
 *     messagingStatus.preferredChannel)
 *   - The Taqnyat template the event would use (templateName, hasImageHeader,
 *     varMapping)
 *   - The exact imageUrl + bodyParams the request would have produced
 *     (using the same helpers the runtime uses)
 *   - The most recent `event.test_message_sent` audit rows
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
require('../models/UserModel'); // register for populate
const Event = require('../models/EventModel');
const TaqnyatTemplate = require('../models/TaqnyatTemplateModel');
const AuditLog = require('../models/AuditLogModel');
const {
  resolveTaqnyatTemplate,
  getEventBodyParams,
  getEventImageUrl,
} = require('../src/modules/messaging/messaging.formatting');

function pad(label) {
  return (label + ':').padEnd(28);
}

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error('Usage: node scripts/inspect-test-message.js <eventId>');
    process.exit(1);
  }

  await connectDB();

  const event = await Event.findById(eventId).populate('host', 'name');
  if (!event) {
    console.error(`Event ${eventId} not found.`);
    await disconnectDB();
    process.exit(1);
  }

  console.log('=== EVENT ===');
  console.log(pad('Event ID'), event._id.toString());
  console.log(pad('Title'), event.eventDetails?.title || '(none)');
  console.log(pad('Host'), event.host?.name || '(none)');
  console.log(pad('lastTestAt'), event.lastTestAt || '(never)');
  console.log(pad('testMessageSent'), event.testMessageSent === true);
  console.log(
    pad('preferredChannel'),
    event.messagingStatus?.preferredChannel || '(none)'
  );
  console.log(pad('templateRef'), event.taqnyatTemplate?.templateRef || '(none)');
  console.log(
    pad('bakedImagePath'),
    event.visualTemplate?.bakedImagePath || '(none)'
  );
  console.log(pad('templateImage'), event.templateImage || '(none)');
  console.log('');

  console.log('=== RESOLVED TAQNYAT TEMPLATE ===');
  const cached = await resolveTaqnyatTemplate(event);
  if (!cached) {
    console.log('(no template selected — would fall back to SMS-only test)');
  } else {
    console.log(pad('templateName'), cached.templateName);
    console.log(pad('language'), cached.language || '(unset)');
    console.log(pad('status'), cached.status || '(unset)');
    console.log(pad('hasImageHeader'), cached.hasImageHeader === true);
    console.log(pad('varMapping count'), (cached.varMapping || []).length);
    if (Array.isArray(cached.varMapping) && cached.varMapping.length) {
      console.log('  varMapping:');
      cached.varMapping.forEach((m, i) => {
        console.log(
          `    ${i + 1}. ${m.placeholder} <- ${m.sourceKey}` +
            (m.fallback ? `  (fallback: "${m.fallback}")` : '')
        );
      });
    }
  }
  console.log('');

  console.log('=== WHAT THE REQUEST WOULD HAVE SENT (channel = whatsapp) ===');
  const imageUrl = getEventImageUrl(event, cached);
  const bodyParams = getEventBodyParams(event, 'ضيف تجريبي', cached);
  console.log(pad('templateName'), cached?.templateName || '(none — WA send would throw)');
  console.log(pad('imageUrl'), imageUrl || '(none — text-only template path)');
  console.log(pad('bodyParams'), JSON.stringify(bodyParams));
  console.log('');

  console.log('=== RECENT AUDIT ROWS (event.test_message_sent) ===');
  const rows = await AuditLog.find({
    action: 'event.test_message_sent',
    targetType: 'event',
    targetId: event._id.toString(),
  })
    .sort({ createdAt: -1, timestamp: -1 })
    .limit(5)
    .lean();

  if (rows.length === 0) {
    console.log('(no audit rows found)');
  } else {
    rows.forEach((r, i) => {
      console.log(`--- #${i + 1} ---`);
      console.log(pad('  timestamp'), r.timestamp || r.createdAt);
      console.log(pad('  status'), r.status);
      console.log(pad('  performedBy'), r.performedBy);
      console.log(pad('  metadata'), JSON.stringify(r.metadata || {}, null, 2));
    });
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Fatal:', err.stack || err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
