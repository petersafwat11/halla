#!/usr/bin/env node
/**
 * @halaa-checkin/api
 * Backup restore rehearsal CLI.
 *
 * Restores a backup produced by backup-db.mjs into a NEW mini-app-prefixed
 * test database (never the source database, never a Halaa database), points
 * a disposable verification at it, and checks:
 *   1. event/guest totals match the backup manifest,
 *   2. at least one QR token lookup resolves,
 *   3. a pre-existing admission is still present,
 *   4. the audit trail for the event is present,
 *   5. a NEW admission can be committed on the restored data.
 *
 * The target database must be empty (or non-existent); the rehearsal never
 * re-uses a production cookie origin and never touches production data.
 * Record the manifest's backup timestamp as the observed data-loss window.
 *
 * Usage:
 *   node api/scripts/restore-verify.mjs --sourceDir <backup dir> --targetDb <halaa_checkin_restore_xxx> --confirm
 */

import fs from 'node:fs';
import { EJSON, verifyBackupManifest } from './backup-format.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { config, validateConfig, loadConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { Idempotency } from '../src/modules/idempotency/idempotency.model.js';
import { ExportJob } from '../src/modules/exports/exportJob.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Session } from '../src/modules/auth/session.model.js';
import { GuestsRepository } from '../src/modules/guests/guests.repository.js';
import { CheckinsService } from '../src/modules/checkins/checkins.service.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { ROLES } from '@halaa-checkin/contracts';

const MODELS_BY_COLLECTION = {
  events: Event,
  guests: Guest,
  audits: Audit,
  idempotencies: Idempotency,
  exportjobs: ExportJob,
  users: User,
  sessions: Session,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { sourceDir: '', targetDb: '', confirm: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sourceDir' && args[i + 1]) out.sourceDir = args[++i];
    else if (args[i] === '--targetDb' && args[i + 1]) out.targetDb = args[++i];
    else if (args[i] === '--confirm') out.confirm = true;
  }
  return out;
}

function hasBinary(name) {
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    stdio: 'ignore',
  });
  return probe.status === 0;
}

async function main() {
  const { sourceDir, targetDb, confirm } = parseArgs();
  if (!sourceDir || !targetDb) {
    console.error('Usage: restore-verify.mjs --sourceDir <dir> --targetDb <new prefixed db> --confirm');
    process.exit(1);
  }
  if (!confirm) {
    console.error('Refusing: restore rehearsal requires --confirm (target must be a NEW test database).');
    process.exit(1);
  }

  const resolvedSource = path.resolve(sourceDir);
  const manifestPath = path.join(resolvedSource, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`No manifest.json in ${resolvedSource}. Only backup-db.mjs output is accepted.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Target config: same server, NEW prefixed database. Prefix + forbidden-name
  // rules are enforced by validateConfig; source DB is additionally rejected.
  const targetConfig = loadConfig({ mongodbDbName: targetDb });
  validateConfig(targetConfig);
  if (targetDb === manifest.dbName || targetDb === config.mongodb.dbName) {
    console.error(`Refusing: target '${targetDb}' must differ from the source database.`);
    process.exit(1);
  }

  try {
    verifyBackupManifest(resolvedSource, manifest);
    console.log(`Restoring backup of '${manifest.dbName}' (taken ${manifest.startedAt}) into '${targetDb}'`);
    await connectDb(targetConfig);
    await ensureIndexes();

    const nonEmpty = await Promise.all(
      Object.values(MODELS_BY_COLLECTION).map((m) => m.countDocuments({}).then((c) => c > 0))
    );
    if (nonEmpty.some(Boolean)) {
      throw new Error(`Target database '${targetDb}' is not empty. Restore rehearsal requires a fresh database.`);
    }

    if (manifest.mode === 'mongodump') {
      if (!hasBinary('mongorestore')) throw new Error('Backup is mongodump format but mongorestore is not on PATH.');
      const dumpDir = path.join(resolvedSource, manifest.dbName);
      const res = spawnSync(
        'mongorestore',
        [
          `--uri=${targetConfig.mongodb.uri}`,
          `--nsFrom=${manifest.dbName}.*`,
          `--nsTo=${targetDb}.*`,
          ...(targetConfig.mongodb.tlsCertPath ? [`--tlsCertificateKeyFile=${targetConfig.mongodb.tlsCertPath}`, '--tls'] : []),
          dumpDir,
        ],
        { stdio: 'pipe', windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 }
      );
      if (res.status !== 0) throw new Error('mongorestore failed');
    } else {
      for (const [collectionName, model] of Object.entries(MODELS_BY_COLLECTION)) {
        const filePath = path.join(resolvedSource, `${collectionName}.json`);
        if (!fs.existsSync(filePath)) continue;
        const docs = EJSON.parse(fs.readFileSync(filePath, 'utf8'));
        // throwOnValidationError:true — without it, Mongoose (ordered:false)
        // SILENTLY SKIPS invalid docs, and a "successful" restore could be
        // missing entire collections. A backup gap must fail loudly here.
        if (docs.length > 0) await model.insertMany(docs, { ordered: false, throwOnValidationError: true });
        console.log(`Restored ${docs.length} x ${collectionName}`);
      }
    }

    // --- Verification ---
    const failures = [];
    const check = (label, ok, detail = '') => {
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
      if (!ok) failures.push(label);
    };

    // 1. Totals match manifest counts (model names as recorded by backup-db).
    const nameByModel = { Event: 'Event', Guest: 'Guest', Audit: 'Audit', Idempotency: 'Idempotency', ExportJob: 'ExportJob', User: 'User', Session: 'Session' };
    for (const [modelName, expected] of Object.entries(manifest.counts || {})) {
      const model = { Event, Guest, Audit, Idempotency, ExportJob, User, Session }[modelName];
      if (!model) continue;
      const actual = await model.countDocuments({});
      check(`totals: ${nameByModel[modelName]} (${actual}/${expected})`, actual === expected);
    }

    // Pick the event with the most guests as the verification subject.
    const subjectEvent = await Event.findOne({ status: 'live' }).sort({ createdAt: 1 }).lean();
    check('restore contains at least one event', !!subjectEvent);
    if (!subjectEvent) throw new Error('Nothing to verify: no events restored.');

    const eventId = subjectEvent._id;
    const guestsTotal = await Guest.countDocuments({ eventId });

    // 2. QR lookup resolves for a restored invitation.
    const tokenHolder = await Guest.findOne({ eventId, deletedAt: null }).select('+qrToken').lean();
    let qrOk = false;
    if (tokenHolder?.qrToken) {
      const found = await GuestsRepository.findByQrToken(eventId.toString(), tokenHolder.qrToken);
      qrOk = !!found && found.shortCode === tokenHolder.shortCode;
    }
    check('QR token lookup resolves (shortCode match)', qrOk);

    // 3. Pre-existing admission survived the restore.
    const admitted = await Guest.findOne({ eventId, checkIn: { $ne: null } }).lean();
    check('pre-existing admission present', !!admitted, admitted ? `${admitted.name}` : 'no admitted guest in backup');

    // 4. Audit trail present for the event.
    const auditCount = await Audit.countDocuments({ eventId });
    check('audit trail present', auditCount > 0, `${auditCount} records`);

    // 5. A NEW admission commits on the restored data (disposable target only).
    let newAdmissionOk = false;
    let newAdmissionDetail = '';
    if (subjectEvent.status !== 'live') {
      newAdmissionDetail = `event status is '${subjectEvent.status}', not live`;
    } else {
      const pending = await Guest.findOne({ eventId, deletedAt: null, checkIn: null }).lean();
      if (!pending) {
        newAdmissionDetail = 'no pending guest available to admit';
      } else {
        const verifier = await provisionUser({
          username: `restore_verifier_${crypto.randomBytes(4).toString('hex')}`,
          displayName: 'Restore Verifier',
          password: crypto.randomBytes(24).toString('base64'),
          role: ROLES.ADMIN,
          assignedEventIds: [eventId.toString()],
        });
        const liveGuest = await Guest.findById(pending._id);
        const result = await CheckinsService.admitGuest(
          eventId.toString(),
          {
            guestId: liveGuest._id.toString(),
            version: liveGuest.version,
            actualCompanions: 0,
            method: 'manual',
          },
          crypto.randomUUID(),
          { id: verifier.id, displayName: verifier.displayName },
          { requestId: `restore-verify-${Date.now()}` }
        );
        newAdmissionOk = result?.status === 201;
        newAdmissionDetail = `admitted ${pending.name} (status ${result?.status})`;
      }
    }
    check('new admission commits on restored data', newAdmissionOk, newAdmissionDetail);

    console.log(`Verified ${guestsTotal} guests on event '${subjectEvent.name}'.`);
    console.log(`Observed data-loss window: backup taken ${manifest.startedAt} .. ${manifest.finishedAt}.`);

    await disconnectDb();
    if (failures.length > 0) {
      console.error(`Restore rehearsal FAILED: ${failures.join('; ')}`);
      process.exit(1);
    }
    console.log('Restore rehearsal complete: all checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('Restore rehearsal failed:', err.message);
    try {
      await disconnectDb();
    } catch {
      // Ignore disconnect errors on fatal exit.
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
