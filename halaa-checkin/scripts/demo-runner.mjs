#!/usr/bin/env node
/**
 * @halaa-checkin Demo Runner
 * Starts an in-memory replica set MongoDB, seeds a realistic live event with VIPs and guests,
 * provisions admin and reception users, starts the API service (port 8100), and starts
 * the Next.js web application (port 3100) so anyone can immediately preview the new UI/UX.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const API_PORT = 8100;
const WEB_PORT = 3100;

async function run() {
  console.log('====================================================');
  console.log('  Halaa Hilton Guest Check-in — Live Demo Environment');
  console.log('====================================================\n');

  console.log('1. Initializing in-memory replica set database...');
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const mongoUri = replSet.getUri();
  const dbName = 'halaa_checkin_dev';
  console.log('   In-memory MongoDB ready.\n');

  // Connect Mongoose
  await mongoose.connect(mongoUri, { dbName, autoIndex: true });

  // Import API modules dynamically
  const { ensureIndexes } = await import('../api/src/db/indexes.js');
  const { provisionUser } = await import('../api/src/modules/auth/auth.service.js');
  const { Event } = await import('../api/src/modules/events/event.model.js');
  const { Guest } = await import('../api/src/modules/guests/guest.model.js');
  const { createApp } = await import('../api/src/app.js');
  const { loadConfig } = await import('../api/src/config.js');
  const { generateQrToken, generateShortCode, verifyPassword } = await import('../api/src/utils/crypto.js');
  const { User } = await import('../api/src/modules/auth/user.model.js');
  const { ROLES } = await import('../contracts/src/constants.js');
  const { normalizeForSearch, normalizeReferenceKey } = await import('../contracts/src/schemas.js');

  await ensureIndexes();

  console.log('2. Seeding live event and demo guests...');
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 2);
  eventDate.setHours(19, 0, 0, 0);

  const demoEvent = await Event.create({
    name: 'حفل فندق هيلتون الرياض السنوي',
    venue: 'قاعة الاحتفالات الكبرى - فندق هيلتون الرياض',
    startsAt: eventDate,
    timezone: 'Asia/Riyadh',
    status: 'live',
    version: 1,
    activitySeq: 0,
  });

  console.log(`   Event created: "${demoEvent.name}" (Status: live)`);

  console.log('3. Provisioning demo staff accounts...');
  const adminUser = await provisionUser({
    username: 'admin',
    displayName: 'مدير الفعالية (Admin)',
    password: 'admin123456',
    role: ROLES.ADMIN,
    assignedEventIds: [demoEvent._id],
  });

  const receptionUser = await provisionUser({
    username: 'reception',
    displayName: 'موظف الاستقبال (Reception)',
    password: 'reception123456',
    role: ROLES.RECEPTION,
    assignedEventIds: [demoEvent._id],
  });

  // Do not advertise demo credentials until the exact seeded accounts and
  // passwords have been verified. This catches stale/mismatched demo data at
  // startup instead of leaving reviewers with a misleading 401 response.
  const [seededAdmin, seededReception] = await Promise.all([
    User.findOne({ username: 'admin', disabledAt: null }).select('+passwordHash'),
    User.findOne({ username: 'reception', disabledAt: null }).select('+passwordHash'),
  ]);
  const [adminPasswordValid, receptionPasswordValid] = await Promise.all([
    verifyPassword('admin123456', seededAdmin?.passwordHash),
    verifyPassword('reception123456', seededReception?.passwordHash),
  ]);
  if (!seededAdmin || seededAdmin.role !== ROLES.ADMIN || !adminPasswordValid) {
    throw new Error('Demo admin credential verification failed');
  }
  if (!seededReception || seededReception.role !== ROLES.RECEPTION || !receptionPasswordValid) {
    throw new Error('Demo reception credential verification failed');
  }

  console.log(`   Admin:      username: admin      / password: admin123456`);
  console.log(`   Reception:  username: reception  / password: reception123456`);

  console.log('\n4. Seeding guest invitations (VIPs, allowances, companions)...');
  const rawGuests = [
    {
      name: 'سعادة الدكتور أحمد بن محمد السعدون',
      allowedCompanions: 2,
      companionNames: ['حرم سعادة الدكتور', 'الابن خالد'],
      reference: 'VIP-001',
    },
    {
      name: 'الأستاذة نورة بنت عبدالله آل الشيخ',
      allowedCompanions: 1,
      companionNames: ['الزوج عبدالله'],
      reference: 'VIP-002',
    },
    {
      name: 'الشيخ عبدالمحسن بن عبدالعزيز آل سعود',
      allowedCompanions: 4,
      companionNames: ['مرافق 1', 'مرافق 2', 'مرافق 3', 'مرافق 4'],
      reference: 'VIP-003',
    },
    {
      name: 'الدكتورة مها بنت سليمان القحطاني',
      allowedCompanions: 0,
      companionNames: [],
      reference: 'VIP-004',
    },
    {
      name: 'Dr. Alexander Michael Smith',
      allowedCompanions: 1,
      companionNames: ['Mrs. Smith'],
      reference: 'VIP-005',
    },
    {
      name: 'المهندس عبدالرحمن بن سعد العتيبي',
      allowedCompanions: 3,
      companionNames: ['حرم المهندس', 'الابنة سارة', 'الابن عمر'],
      reference: 'ENG-001',
    },
    {
      name: 'فهد بن سلطان المطيري',
      allowedCompanions: 2,
      companionNames: ['شقيق الضيف', 'زميل العمل'],
      reference: 'GEN-001',
    },
    {
      name: 'لجين بنت فهد السبيعي',
      allowedCompanions: 1,
      companionNames: ['الوالدة'],
      reference: 'GEN-002',
    },
    {
      name: 'عبدالعزيز بن محمد العبداللطيف',
      allowedCompanions: 3,
      companionNames: ['الزوجة', 'الابن الأكبر', 'البنت الصغرى'],
      reference: 'GEN-003',
    },
    {
      name: 'Prof. James William Anderson',
      allowedCompanions: 2,
      companionNames: ['Mrs. Anderson', 'James Jr.'],
      reference: 'VIP-006',
    },
    {
      name: 'سلطان بن عبدالعزيز الشمري',
      allowedCompanions: 0,
      companionNames: [],
      reference: 'GEN-004',
    },
    {
      name: 'هند بنت ناصر الدوسري',
      allowedCompanions: 1,
      companionNames: ['الأخت ريم'],
      reference: 'GEN-005',
    },
    {
      name: 'عبدالله بن إبراهيم المنصور',
      allowedCompanions: 2,
      companionNames: ['مرافق 1', 'مرافق 2'],
      reference: 'VIP-007',
      preAdmitted: true,
    },
  ];

  for (const g of rawGuests) {
    const guestId = new mongoose.Types.ObjectId();
    const qrToken = generateQrToken();
    const shortCode = generateShortCode();

    const newGuest = new Guest({
      _id: guestId,
      eventId: demoEvent._id,
      name: g.name.trim(),
      nameSearch: normalizeForSearch(g.name),
      reference: g.reference?.trim() || undefined,
      referenceKey: g.reference ? normalizeReferenceKey(g.reference) : undefined,
      shortCode,
      qrToken,
      allowedCompanions: g.allowedCompanions,
      companionNames: g.companionNames,
      version: 1,
    });

    if (g.preAdmitted) {
      newGuest.checkIn = {
        actualCompanions: 1,
        checkedInAt: new Date(Date.now() - 30 * 60 * 1000),
        checkedInBy: receptionUser.id,
        operatorName: receptionUser.username,
        method: 'scanner',
      };
      newGuest.version = 2;
    }

    await newGuest.save();
  }

  console.log(`   Seeded ${rawGuests.length} invitations with short codes and cryptographic tokens.`);

  console.log('\n5. Launching API server on port 8100...');
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'halaa-checkin-demo-export-'));
  const cfg = loadConfig({
    env: 'development',
    port: API_PORT,
    mongodbUri: mongoUri,
    mongodbDbName: dbName,
    appOrigin: `http://localhost:${WEB_PORT}`,
    sessionSecret: 'dev-demo-session-secret-at-least-32-chars-long!',
    exportDir,
    trustProxyHops: 0,
  });

  const app = createApp({ config: cfg, workerHealth: () => true });
  await new Promise((resolve) => {
    app.listen(API_PORT, '0.0.0.0', resolve);
  });
  console.log(`   API Service listening on http://127.0.0.1:${API_PORT}`);

  console.log('\n6. Launching Web frontend on port 3100...');
  const isWin = process.platform === 'win32';
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  const webProc = spawn(npmCmd, ['--prefix', path.resolve(rootDir, 'web'), 'run', 'start'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: String(WEB_PORT),
      BACKEND_PROXY_URL: `http://127.0.0.1:${API_PORT}`,
    },
  });

  console.log('\n====================================================');
  console.log('  🎉 System is LIVE and ready for review!');
  console.log('====================================================');
  console.log(`  🔗 Web Application:  http://localhost:${WEB_PORT}/ar/login`);
  console.log(`  🔗 English Version:  http://localhost:${WEB_PORT}/en/login`);
  console.log('\n  Login Credentials:');
  console.log('    • Admin Role:      admin     /  admin123456');
  console.log('    • Reception Role:  reception /  reception123456');
  console.log('====================================================\n');

  const shutdown = async () => {
    console.log('\nStopping demo environment...');
    webProc.kill('SIGINT');
    await mongoose.disconnect();
    await replSet.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

run().catch((err) => {
  console.error('Failed to start demo runner:', err);
  process.exit(1);
});
