# Halaa Guest Check-in — operations guide

Covers the contract-required procedures: database backup/restore, event purge
(retention), failed-export diagnosis, lost-password reprovisioning, and
scan-network recovery. Placeholders only — no production hostnames,
credentials, tokens or database URIs belong in this file.

## 1. Database backup

Primary: Atlas continuous backup for the DEDICATED mini-app database
(`halaa_checkin_prod`). Keep an encrypted off-VPS copy and know its restore
point. Export PDFs are regenerable temporary artifacts (24h TTL), not the
database — back up operational config separately with secret handling.

Fallback / rehearsal — logical backup (scoped to the mini-app DB only):

```bash
cd /opt/halaa-checkin
# One-time host setup for the private bind mount (container UID/GID 1001):
sudo install -d -m 700 -o 1001 -g 1001 ./data/backups
docker compose -p halaa-checkin exec checkin-api node api/scripts/backup-db.mjs \
  --outDir /app/data/backups/manual-<date>
```

- Refuses non-mini-app database names (prefix `halaa_checkin`/`checkin_`).
- Uses `mongodump` when available, else portable extended-JSON.
- The JSON fallback deliberately includes `select:false` bearer secrets
  (QR tokens, password hashes, export snapshots) so the backup is restorable —
  treat backup files as secrets: encrypted recipient, never paste contents.
- Restore verifies every manifest hash and rejects unlisted files before connecting to the target. Extended JSON uses BSON EJSON in both directions.
- Writes `manifest.json` with start/end timestamps, per-collection counts and
  file hashes. The start→end window is the observed data-loss window.
- A logical backup is per-collection point-in-time, not a consistent
  snapshot: prefer Atlas backup, or stop writers during the dump.
- NEVER run a drop/restore against Halaa's database.

## 2. Restore rehearsal (isolated, never production-in-place)

```bash
docker compose -p halaa-checkin exec checkin-api node api/scripts/restore-verify.mjs \
  --sourceDir /app/data/backups/manual-<date> \
  --targetDb halaa_checkin_restore_<date> \
  --confirm
```

- Target must be a NEW, empty, mini-app-prefixed database; source DB is rejected.
- Verifies: event/guest totals vs manifest, ≥1 QR token lookup, a surviving
  admission, the audit trail, and a NEW admission commit on the restored data.
- Prints the backup timestamp as the observed data-loss window.
- Do not re-use a production cookie origin for the disposable instance.

## 3. Event purge (retention enforcement)

Until the hotel/operator configures a retention period, event records are NOT
auto-deleted. Purging is explicit, per-event, after backup/export:

```bash
# Dry run first: prints the resolved event + exact in-scope counts.
docker compose -p halaa-checkin exec checkin-api node api/scripts/purge-event.mjs --eventId <ObjectId>
# Execute (requires the explicit flag):
docker compose -p halaa-checkin exec checkin-api node api/scripts/purge-event.mjs --eventId <ObjectId> --confirm
```

- A durable `purgingAt` fence closes the event and prevents reopening/new exports. If the command fails, fix the reported filesystem/database issue and retry the same event; do not reopen it.
- Removes only that event's guests, audits, export jobs (+ private artifact
  files, confined to `EXPORT_DIR`), idempotency records and user assignments.
- Verifies zero residuals and that other events' guest counts are unchanged;
  fails loudly otherwise.
- Never a seed/reset shortcut; never touches other Halaa data.

## 4. Failed-export diagnosis

Symptoms → checks (all read-only unless stated):

| Symptom | Check |
| --- | --- |
| Job stuck `queued` | API logs for worker errors; `GET /health/ready` (worker unhealthy → 503 + service error on create; gate admission unaffected by design) |
| Job `failed` | `GET .../exports/:id` returns safe `errorCode` (never snapshot/paths); inspect API logs with the job id |
| `EXPORT_NOT_READY` (409) on download | Still queued/running — keep polling (UI polls every 2s while visible) |
| `EXPORT_EXPIRED` (410) | Older than 24h — regenerate; expiry removes artifact + snapshot, not just the DB row |
| Render OOM / slow | One slot only by design; check container memory vs budget (`docker stats`); long mixed-script names + 20-companion arrays are the stress shape, not short Latin fixtures |
| Worker/API killed mid-render | Restart: startup detects the expired lease and retries (max 2 attempts), then marks `failed` explicitly — never stuck `running` forever |

PDF jobs never take down admission endpoints; gate traffic bypasses the render queue.

## 5. Lost-password reprovisioning

There is no password-reset email in v1. An admin with VPS access re-provisions:

```bash
docker compose -p halaa-checkin exec checkin-api node api/scripts/provision-user.mjs \
  --username <existing-name> --displayName "<display>" --role <same-role> --events <eventIds>
# enter the NEW password at the hidden prompt (or via USER_PASSWORD secret stdin)
```

Reprovisioning revokes all existing sessions for that user (including the lost
device). Disabled users lose access immediately, including live sessions.

## 6. Scan-network recovery (offline admission is out of scope)

v1 has no offline admission: staff PAUSE admission and switch to backup
connectivity when server confirmation is unavailable. The gate UI distinguishes:

- `network_failure` — preview/read failed before admission submission. Restore connectivity and resolve a fresh preview before confirming.
- `lost_response` — response lost after a possible commit: retry with the SAME
  key/body only; the server replays the original result instead of double-counting.
- Never retry under a NEW key after a timeout. An empty current-status read cannot rule out a write still in flight. Complete the same-key retry first. A replay is historical success: current guest state is re-read before showing admission.
- Uncertain admission/import intent is held only in memory, scoped to the original account and event. Client navigation and reauthentication preserve it; a full browser reload/device loss does not. Recover from authoritative records before starting a new operation after such a loss.

Pre-event checklist: both reception devices scan printed AND phone-screen
PDFs, duplicates shown correctly, backup connectivity + backup device/power
tested, event is `live`, staff assigned.

## 7. Log privacy (what must never appear)

Request logs contain no QR tokens, passwords, cookies, CSV bodies, PDF
contents, companion lists or database URIs. Audit records hold minimal
operational values only. If redaction is ever suspected broken, treat the log
volume as sensitive, rotate it, and fix before the event — do not paste logs
into shared channels.
