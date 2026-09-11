import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';

export const EJSON = mongoose.mongo.BSON.EJSON;

export function verifyBackupManifest(sourceDir, manifest) {
  if (!['json', 'mongodump'].includes(manifest.mode) || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('Invalid backup manifest');
  }
  if (!/^(?:halaa_checkin|checkin_)[A-Za-z0-9_-]*$/.test(manifest.dbName)) throw new Error('Invalid backup database name');
  const root = fs.realpathSync(sourceDir);
  const seen = new Set();
  for (const entry of manifest.files) {
    if (typeof entry.name !== 'string' || seen.has(entry.name) || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error('Invalid backup file entry');
    }
    seen.add(entry.name);
    const candidate = fs.realpathSync(path.resolve(root, entry.name));
    const relative = path.relative(root, candidate);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(candidate).isFile()) {
      throw new Error('Backup file escapes source directory');
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');
    if (actual !== entry.sha256) throw new Error(`Backup checksum mismatch: ${entry.name}`);
  }
  // Reject unlisted files as well: restore must never consume unverified data.
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Backup symlinks are not supported');
      if (entry.isDirectory()) visit(file);
      else {
        const relative = path.relative(root, file).replaceAll('\\', '/');
        if (relative !== 'manifest.json' && !seen.has(relative)) throw new Error(`Unlisted backup file: ${relative}`);
      }
    }
  }
  visit(root);
}
