#!/usr/bin/env node
/**
 * @halaa-checkin/api
 * Demo seed CLI.
 * Creates a clearly marked demo event with synthetic guests and named users.
 * Idempotent for a dedicated demo event; never clears collections.
 * Adheres to Technical Contract Section 8 and T10 requirements.
 */

import { config, validateConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { ROLES, normalizeForSearch, normalizeReferenceKey } from '@halaa-checkin/contracts';
import { generateQrToken, generateShortCode } from '../src/utils/crypto.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_EVENT_NAME = 'Hilton Riyadh — Demonstration (Demo)';
const DEMO_ADMIN_USERNAME = 'demo_admin';
const DEMO_RECEPTION_1_USERNAME = 'demo_reception_1';
const DEMO_RECEPTION_2_USERNAME = 'demo_reception_2';
// Password is NEVER committed: provide via DEMO_SEED_PASSWORD env (min 12 chars).
// Kept out of logs and repo per Technical Contract §2.

const DEMO_GUESTS = [
  // Arabic names with varying companions
  { name: 'سعادة الدكتور أحمد بن محمد السعدون', allowedCompanions: 2, companionNames: ['حرم سعادة الدكتور', 'الابن خالد'], reference: 'VIP-001' },
  { name: 'الأستاذة نورة بنت عبدالله آل الشيخ', allowedCompanions: 1, companionNames: ['الزوج عبدالله'], reference: 'VIP-002' },
  { name: 'الشيخ عبدالمحسن بن عبدالعزيز آل سعود', allowedCompanions: 5, companionNames: ['مرافق 1', 'مرافق 2', 'مرافق 3', 'مرافق 4', 'مرافق 5'], reference: 'VIP-003' },
  { name: 'الدكتورة مها بنت سليمان القحطاني', allowedCompanions: 0, companionNames: [], reference: 'VIP-004' },
  { name: 'المهندس عبدالرحمن بن سعد العتيبي', allowedCompanions: 3, companionNames: ['حرم المهندس', 'الابنة سارة', 'الابن عمر'], reference: 'ENG-001' },

  // English names with varying companions
  { name: 'Dr. Alexander Michael Smith', allowedCompanions: 1, companionNames: ['Mrs. Smith'], reference: 'VIP-005' },
  { name: 'Prof. James William Anderson', allowedCompanions: 2, companionNames: ['Mrs. Anderson', 'Mr. Anderson Jr.'], reference: 'VIP-006' },
  { name: 'Ms. Sarah Elizabeth Johnson', allowedCompanions: 0, companionNames: [], reference: 'VIP-007' },
  { name: 'Mr. Robert Thomas Brown', allowedCompanions: 4, companionNames: ['Mrs. Brown', 'Child 1', 'Child 2', 'Child 3'], reference: 'CORP-001' },

  // Long names and edge cases
  { name: 'His Excellency Ambassador Mohammad Ali Al-Harthy Al-Saud Al-Qasimi', allowedCompanions: 3, companionNames: ['Spouse', 'Advisor 1', 'Advisor 2'], reference: 'DIP-001' },
  { name: 'Princess Noura Bint Faisal Al Saud Al-Faisal', allowedCompanions: 2, companionNames: ['Companion A', 'Companion B'], reference: 'DIP-002' },

  // Mixed Arabic/English names
  { name: 'محمد علي Smith', allowedCompanions: 1, companionNames: ['علي محمد'], reference: 'MIX-001' },
  { name: 'Ahmed Hassan آل سعود', allowedCompanions: 2, companionNames: ['Sara Hassan', 'Omar Hassan'], reference: 'MIX-002' },

  // Zero companions and max companions (20)
  { name: 'ضيف بلا مرافقين - اختبار صفر', allowedCompanions: 0, companionNames: [], reference: 'ZERO-001' },
  { name: 'ضيف بأقصى مرافقين - 20 مرافق', allowedCompanions: 20, companionNames: Array.from({ length: 20 }, (_, i) => `مرافق رقم ${i + 1}`), reference: 'MAX-001' },

  // More variety
  { name: 'فهد بن سلطان المطيري', allowedCompanions: 2, companionNames: ['شقيق الضيف', 'زميل العمل'], reference: 'GEN-001' },
  { name: 'لجين بنت فهد السبيعي', allowedCompanions: 1, companionNames: ['الوالدة'], reference: 'GEN-002' },
  { name: 'عبدالعزيز بن محمد العبداللطيف', allowedCompanions: 3, companionNames: ['الزوجة', 'الابن الأكبر', 'البنت الصغرى'], reference: 'GEN-003' },
];

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset-demo');

  if (!config.demoSeedEnabled) {
    console.error('Demo seed is disabled. Set DEMO_SEED_ENABLED=true to enable.');
    process.exit(1);
  }

  if (config.env === 'production' || config.isProd) {
    console.error('Demo seed cannot run in production environment.');
    process.exit(1);
  }

  const demoPassword = process.env.DEMO_SEED_PASSWORD || '';
  if (!demoPassword || demoPassword.length < 12) {
    console.error('DEMO_SEED_PASSWORD env is required (min 12 chars) and is never committed or logged.');
    process.exit(1);
  }

  try {
    validateConfig(config);
    console.log(`Connecting to database (${config.mongodb.dbName})...`);
    await connectDb(config);
    await ensureIndexes();

    // Find or create demo event (DB prefix already validated by validateConfig)
    let demoEvent = await Event.findOne({ name: DEMO_EVENT_NAME });

    if (demoEvent) {
      // Print resolved identity BEFORE any destructive write (contract requirement)
      console.log('Resolved demo event:', demoEvent._id.toString(), '/', demoEvent.name);
      if (shouldReset) {
        if (!args.includes('--confirm')) {
          console.error('Refusing to reset without --confirm. Re-run with --reset-demo --confirm.');
          await disconnectDb();
          process.exit(1);
        }
        console.log('Resetting existing demo event...');
        // Soft delete all guests in this event
        await Guest.updateMany({ eventId: demoEvent._id }, { deletedAt: new Date() });
        // Reset event to draft
        demoEvent.status = 'draft';
        demoEvent.closedAt = null;
        demoEvent.version += 1;
        await demoEvent.save();
        console.log('Demo event reset to draft, guests soft-deleted.');
      } else {
        console.log('Demo event already exists. Use --reset-demo --confirm to reset it.');
        console.log('Event ID:', demoEvent._id.toString());
        console.log('Event Status:', demoEvent.status);
        const guestCount = await Guest.countDocuments({ eventId: demoEvent._id, deletedAt: null });
        console.log('Active guests:', guestCount);
        await disconnectDb();
        process.exit(0);
      }
    } else {
      // Create new demo event
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + 7); // One week from now
      startsAt.setHours(19, 0, 0, 0); // 7 PM

      demoEvent = new Event({
        name: DEMO_EVENT_NAME,
        venue: 'فندق هيلتون الرياض - قاعة الاحتفالات الكبرى / Hilton Riyadh - Grand Ballroom',
        startsAt,
        timezone: 'Asia/Riyadh',
        status: 'draft',
        version: 1,
        activitySeq: 0,
      });
      await demoEvent.save();
      console.log('Created demo event:', demoEvent._id.toString());
    }

    // Create demo users
    console.log('\nProvisioning demo users...');

    // Admin (provisioned via shared service; use provision-user.mjs for real accounts)
    let admin = await provisionUser({
      username: DEMO_ADMIN_USERNAME,
      displayName: 'Demo Administrator',
      password: demoPassword,
      role: ROLES.ADMIN,
      assignedEventIds: [demoEvent._id],
    });
    console.log('Admin user:', admin.username, '(ID:', admin.id, ')');

    // Receptionist 1
    let reception1 = await provisionUser({
      username: DEMO_RECEPTION_1_USERNAME,
      displayName: 'Demo Receptionist One',
      password: demoPassword,
      role: ROLES.RECEPTION,
      assignedEventIds: [demoEvent._id],
    });
    console.log('Receptionist 1:', reception1.username, '(ID:', reception1.id, ')');

    // Receptionist 2
    let reception2 = await provisionUser({
      username: DEMO_RECEPTION_2_USERNAME,
      displayName: 'Demo Receptionist Two',
      password: demoPassword,
      role: ROLES.RECEPTION,
      assignedEventIds: [demoEvent._id],
    });
    console.log('Receptionist 2:', reception2.username, '(ID:', reception2.id, ')');

    // Create guests
    console.log('\nCreating demo guests...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const guestData of DEMO_GUESTS) {
      // Idempotency by normalized reference key (matches service uniqueness)
      const refKey = normalizeReferenceKey(guestData.reference);
      const existing = refKey
        ? await Guest.findOne({ eventId: demoEvent._id, referenceKey: refKey, deletedAt: null })
        : null;

      if (existing) {
        skippedCount++;
        continue;
      }

      // Unique Crockford short code (same alphabet as production generator)
      let shortCode = null;
      for (let i = 0; i < 5; i++) {
        const candidate = generateShortCode();
        const taken = await Guest.exists({ eventId: demoEvent._id, shortCode: candidate });
        if (!taken) {
          shortCode = candidate;
          break;
        }
      }
      if (!shortCode) throw new Error('Failed to generate unique short code for demo seed');
      const qrToken = generateQrToken();

      const guest = new Guest({
        eventId: demoEvent._id,
        name: guestData.name.trim(),
        nameSearch: normalizeForSearch(guestData.name),
        reference: guestData.reference?.trim() || undefined,
        referenceKey: refKey,
        allowedCompanions: guestData.allowedCompanions,
        companionNames: guestData.companionNames || [],
        shortCode,
        qrToken,
        version: 1,
        checkIn: null,
        deletedAt: null,
      });
      await guest.save();
      createdCount++;
    }

    console.log(`Created ${createdCount} guests, skipped ${skippedCount} existing.`);

    // Print summary (usernames only — never log the password)
    const totalActive = await Guest.countDocuments({ eventId: demoEvent._id, deletedAt: null });
    console.log('\n=== Demo Seed Summary ===');
    console.log('Event:', DEMO_EVENT_NAME);
    console.log('Event ID:', demoEvent._id.toString());
    console.log('Event Status:', demoEvent.status);
    console.log('Venue:', demoEvent.venue);
    console.log('Starts At:', demoEvent.startsAt.toISOString());
    console.log('Total Active Guests:', totalActive);
    console.log('\nDemo users (password from DEMO_SEED_PASSWORD env, not shown):');
    console.log('  Admin:       ', DEMO_ADMIN_USERNAME);
    console.log('  Reception 1: ', DEMO_RECEPTION_1_USERNAME);
    console.log('  Reception 2: ', DEMO_RECEPTION_2_USERNAME);
    console.log('\nTo reset demo:', 'npm run seed:demo -- --reset-demo --confirm');

    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('\nError seeding demo:', err);
    try {
      await disconnectDb();
    } catch {
      // Ignore
    }
    process.exit(1);
  }
}

const invokedAsMain =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsMain) {
  main();
}