#!/usr/bin/env node
/**
 * @halaa-checkin/api
 * Database backup CLI (logical backup fallback).
 *
 * Primary production backup is the Atlas continuous backup for the dedicated
 * mini-app database (see deploy/OPERATIONS.md). This script is the portable
 * logical-backup fallback and the rehearsal tool: it dumps ONLY the
 * prefix-validated mini-app database and writes a counts manifest.
 *
 * Two dump modes:
 * - `mongodump` when the binary is on PATH (BSON, restorable with
 *   mongorestore; preserves types exactly).
 * - JSON fallback otherwise (portable, no extra binaries; ObjectIds/Dates
 *   are stored in MongoDB extended-JSON form and revived on restore).
 *
 * A logical backup is a per-collection point-in-time copy, NOT a
 * cluster-wide consistent snapshot: concurrent writes during the dump can
 * span collections. The manifest records start/end timestamps so the
 * operator can read the observed data-loss window. For a quiet,
 * transactionally consistent copy, stop writers or use Atlas backup.
 *
 * Refuses forbidden (Halaa) database names via validateConfig. Never prints
 * the connection string.
 *
 * Usage:
 *   node api/scripts/backup-db.mjs [--outDir <dir>]
 */

import fs from 'node:fs';
import { EJSON } from './backup-format.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { config, validateConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { Idempotency } from '../src/modules/idempotency/idempotency.model.js';
import { ExportJob } from '../src/modules/exports/exportJob.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Session } from '../src/modules/auth/session.model.js';

const COLLECTIONS = { Event, Guest, Audit, Idempotency, ExportJob, User, Session };

// select:false paths are EXCLUDED from ordinary queries (including lean()).
// A backup that omits them is unrestorable (required paths fail validation
// on restore), so each model explicitly re-includes its hidden paths here.
// CONSEQUENCE: the JSON fallback contains password hashes and QR bearer
// tokens — handle backup files as secrets (encrypted recipient, no pasting).
const SELECT_HIDDEN = {
  Event: '',
  Guest: '+qrToken',
  Audit: '',
  Idempotency: '',
  ExportJob: '+snapshot',
  User: '+passwordHash',
  Session: '',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { outDir: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outDir' && args[i + 1]) out.outDir = args[++i];
  }
  return out;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

// F26: recursively collect files (mongodump --out creates a database
// subdirectory; top-level readdir includes directories).
function collectFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFilesRecursive(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out.sort();
}

function hasBinary(name) {
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    stdio: 'ignore',
  });
  return probe.status === 0;
}

// F26: never print connection details (host/path/query included). Log only the
// database name, which is already non-secret and prefix-validated.
function _safeDbUriForLog() {
  return '[redacted connection string]';
}

async function main() {
  const { outDir } = parseArgs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.resolve(outDir || path.join('data', 'backups', `halaa-checkin-${stamp}`));

  try {
    validateConfig(config);
    const startedAt = new Date().toISOString();
    console.log(`Backing up mini-app database '${config.mongodb.dbName}'`);
    console.log('Source: [redacted — see config]');
    await connectDb(config);

    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length) throw new Error('Backup directory must be empty');
    fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });

    const counts = {};
    for (const [name, model] of Object.entries(COLLECTIONS)) {
      counts[name] = await model.countDocuments({});
    }
    console.log('Collection counts:', JSON.stringify(counts));

    let mode = 'json';
    if (hasBinary('mongodump')) {
      mode = 'mongodump';
      console.log('mongodump found: writing BSON dump...');
      const dumpArgs = [`--uri=${config.mongodb.uri}`, `--db=${config.mongodb.dbName}`, `--out=${targetDir}`];
      // F26: forward configured TLS certificate options to database tools.
      if (config.mongodb.tlsCertPath) {
        dumpArgs.push(`--tlsCertificateKeyFile=${config.mongodb.tlsCertPath}`);
      }
      const res = spawnSync('mongodump', dumpArgs, { stdio: 'pipe', windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
      if (res.status !== 0) throw new Error('mongodump failed');
    } else {
      console.log('mongodump not on PATH: writing Extended JSON fallback...');
      // F26: true EJSON for lossless BSON type preservation (ObjectId/Date).
      for (const [name, model] of Object.entries(COLLECTIONS)) {
        let query = model.find({});
        if (SELECT_HIDDEN[name]) query = query.select(SELECT_HIDDEN[name]);
        const docs = await query.lean();
        const filePath = path.join(targetDir, `${model.collection.name}.json`);
        const payload = EJSON.stringify(docs, { relaxed: false });
        fs.writeFileSync(filePath, payload);
        console.log(`Wrote ${docs.length} x ${model.collection.name}`);
      }
    }

    const finishedAt = new Date().toISOString();
    // F26: recursive manifest for BSON subdirectories.
    const files = collectFilesRecursive(targetDir).map((rel) => ({
      name: rel.replace(/\\/g, '/'),
      sha256: sha256File(path.join(targetDir, rel)),
    }));
    const manifest = {
      tool: 'halaa-checkin backup-db.mjs',
      mode,
      dbName: config.mongodb.dbName,
      startedAt,
      finishedAt,
      counts,
      files,
      note: 'Logical per-collection backup. Concurrent writes during the window startedAt..finishedAt may span collections; prefer Atlas backup for a consistent snapshot. Restore via containers: docker compose -p halaa-checkin exec checkin-api node api/scripts/restore-verify.mjs --sourceDir /backup --targetDb <name> --confirm (backup files must persist outside the container via a mounted volume).',
    };
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`Backup complete: ${targetDir} (mode=${mode})`);
    console.log(`Window: ${startedAt} .. ${finishedAt}`);

    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('Backup failed:', err.message);
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
