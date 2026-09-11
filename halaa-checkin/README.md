# Halaa Guest Check-in (هلا لإدارة دخول الضيوف)

Standalone event guest check-in mini-app for Halaa. Manages guest lists, QR passes, reception gate verification, and attendance reports.

Latest review: [implementation review and fixes](../docs/implementation/hilton-guest-checkin/06-IMPLEMENTATION-REVIEW-AND-FIXES.md), 10 September 2026. Includes current test evidence and remaining release/device checks.

## Architecture

This mini-app is structured as an independent npm workspace containing:
- `contracts/`: Shared schemas, constants, errors, and statistics calculations (`@halaa-checkin/contracts`).
- `api/`: Express REST service (`@halaa-checkin/api`) on port 8100.
- `web/`: Next.js App Router bilingual web application (`@halaa-checkin/web`) on port 3100.
- `design/`: Local design token snapshot (`tokens.css`), provenance audit ledger (`SOURCES.json`), and local assets (Cairo font binaries, Halaa logo).

## Ports & Endpoints

- **Web Service**: `http://localhost:3100`
- **API Service**: `http://localhost:8100`
- **API Prefix**: `/api/checkin/v1`
- Next.js development server proxies `/api/checkin/v1/*` directly to `http://127.0.0.1:8100/api/checkin/v1/*`.

## Quick Start

All npm commands run from `halaa-checkin/` unless a script states otherwise.

```bash
# From halaa-checkin/ directory:
npm install

# Check design tokens against source globals.css (15/15 required)
npm run design:check

# Run automated tests (contracts 41 + api 61 + web 30 unit; no build required)
npm test

# Run linter (0 errors required)
npm run lint

# Build production bundle (contracts + Next.js 15 standalone, 12 pages)
npm run build

# Run production browser tests (requires build output in .next first)
npm --prefix web run test:browser

# Start development services (api :8100 + web :3100, coordinated shutdown)
npm run dev
```

End-to-end journey (requires `npm run build` first; disposable replica-set DB):

```bash
npm run build
npm run test:e2e
```

## Configuration (.env.example)

Copy `.env.example` to `.env` for local runs; never commit real secrets.
Production secrets live in `/opt/halaa-checkin/config.env` (mode 600), never
in the image or in Next public env. Key variables (see `.env.example`):

- `NODE_ENV`, `PORT` (8100), `WEB_PORT` (3100)
- `APP_ORIGIN` (exact browser origin; `http://localhost:3100` locally,
  `https://<checkin-host>` in production), `BACKEND_PROXY_URL`, `TRUST_PROXY_HOPS`
- `MONGODB_URI`, `MONGODB_DB_NAME` (must start with `halaa_checkin`/`checkin_`;
  Halaa database names are rejected), `MONGODB_TLS_CERT_PATH` (optional X.509)
- `EXPORT_DIR` (private PDFs; `/app/data/exports` in container)
- `SESSION_SECRET` (>=32 chars, required in production;
  generate with `openssl rand -base64 48`)
- `DEMO_SEED_ENABLED` (`false` in production; seed refuses production),
  `DEMO_SEED_PASSWORD` (min 12 chars, env only, never committed)
- `IMAGE_TAG` (immutable GHCR SHA pin for deployment, never floating `latest` alone)

Validate DB/indexes explicitly (never a destructive migration):

```bash
npm run db:indexes
```

## Named-user provisioning

No public signup in v1. An operator provisions named admin/reception accounts
(password via hidden prompt or `USER_PASSWORD` secret stdin, never argv/logs):

```bash
# Interactive (prompts for missing fields + hidden password):
npm run user:provision -- --username <name> --displayName "<display>" --role admin --events <eventId>
npm run user:provision -- --username <reception> --displayName "<display>" --role reception --events <eventId>

# Non-interactive equivalent (password from secret env, never argv):
USER_PASSWORD=<secret> npm run user:provision -- --username <name> --displayName "<display>" --role <admin|reception> --events <eventId1,eventId2>
```

In containers:

```bash
docker compose -p halaa-checkin exec checkin-api node api/scripts/provision-user.mjs \
  --username <name> --displayName "<display>" --role admin --events <eventId>
```

Re-provisioning the same username resets the password and revokes all existing
sessions for that user. Disabled users lose access immediately, including live
sessions. Lost passwords are re-provisioned the same way (see
`deploy/OPERATIONS.md` §5); there is no password-reset email in v1.

## Demo seed (synthetic only)

Guarded synthetic fixtures only: one clearly marked demo event
(`Hilton Riyadh — Demonstration (Demo)`), `demo_admin` + `demo_reception_1/2`,
~19 Arabic/English/long/mixed-script guests (0 and 20 companions edge cases).
Never runs in production and never clears collections.

```bash
# Local/dev only (requires DEMO_SEED_ENABLED=true + DEMO_SEED_PASSWORD>=12):
DEMO_SEED_ENABLED=true DEMO_SEED_PASSWORD=<min-12-chars-not-committed> npm run seed:demo
# Idempotent re-run prints existing event ID/counts; safe reset only with explicit flags:
DEMO_SEED_ENABLED=true DEMO_SEED_PASSWORD=<same> npm run seed:demo -- --reset-demo --confirm
```

Production demonstration records are entered/imported deliberately, never seeded.

## Containers & deployment (T11)

Independent Compose project `halaa-checkin` (never merged into the root Halaa
project). See `deploy/README.md` (runbook), `deploy/OPERATIONS.md` (backup /
restore / purge / failure diagnosis) and `deploy/ROOT-INTEGRATION.md`
(one-time tracked proxy integration).

```bash
# Local rehearsal (throwaway replica set, localhost ports):
docker compose -f deploy/compose.yml -f deploy/compose.dev.yml -p halaa-checkin-dev up -d --build
npm run db:indexes
npm run build
npm run test:e2e
docker compose -p halaa-checkin-dev down -v

# Production images (CI pushes SHA tags; rollout pins IMAGE_TAG):
# ghcr.io/petersafwat11/halaa-checkin-api:<sha>
# ghcr.io/petersafwat11/halaa-checkin-web:<sha>
```

Deployment, backup, rollback (summaries; full procedures in `deploy/`):

```bash
# VPS one-time network BEFORE first up (see deploy/README.md §3):
docker network create halaa_checkin_proxy
# Start/verify (see deploy/README.md §§6-7):
docker compose -p halaa-checkin up -d --wait
curl -fsS https://<checkin-host>/api/checkin/v1/health/ready
# Backup / restore rehearsal / purge (see deploy/OPERATIONS.md §§1-3):
npm run db:backup -- --outDir ./data/backups/manual-<date>
npm run db:restore-verify -- --sourceDir ./data/backups/manual-<date> --targetDb halaa_checkin_restore_<date> --confirm
npm run purge:event -- --eventId <ObjectId>            # dry run first
npm run purge:event -- --eventId <ObjectId> --confirm  # execute
# Rollback (mini-app only; DB + export volume preserved; never down -v):
echo "IMAGE_TAG=<prior tested SHA>" > .env
docker compose -p halaa-checkin pull
docker compose -p halaa-checkin up -d --wait
```

Test report: `docs/evidence/hilton-guest-checkin/t12-acceptance-report.md`
(T11 rehearsal measurements:
`docs/evidence/hilton-guest-checkin/t11-containers-deployment.md`).
Remaining external prerequisites (hostname/DNS, VPS headroom, Atlas
credentials/backup destination, retention, devices) block any honest
"deployed / gate ready" claim; see `deploy/README.md` §8.

## Design System & Tokens

Visual fidelity is strictly maintained using Halaa's existing design tokens:
- Primary color: `#c28e5c`
- Artboard background: `#f9f4ef`
- Font: Cairo for both Arabic and English to match live client UI.
- All font files are local (SIL Open Font License 1.1) with no external network font fetching.
