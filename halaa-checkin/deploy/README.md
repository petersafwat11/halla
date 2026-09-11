# Halaa Guest Check-in — deployment runbook

Independent Compose project `halaa-checkin` on the same VPS as Halaa, behind
the existing Caddy. Secrets are placeholders/inputs here — nothing below is
authorised production action by itself. Actual rollout happens only when the
operator explicitly requests it, after the external prerequisites in §8 are met.

Related: `ROOT-INTEGRATION.md` (one-time tracked root changes),
`OPERATIONS.md` (backup/restore, purge, failure diagnosis),
`Caddyfile.snippet` (reviewed host block source).

## 0. File map

| File | Purpose |
| --- | --- |
| `api/Dockerfile` | Express + Chromium renderer, non-root, `CHROMIUM_PATH=/usr/bin/chromium` |
| `web/Dockerfile` | Next.js standalone runner, non-root |
| `deploy/compose.yml` | Production stack (GHCR images, no published ports, no local DB) |
| `deploy/compose.dev.yml` | Local rehearsal (local builds, localhost ports, throwaway replica set) |
| `deploy/Caddyfile.snippet` | Tracked source of the host block (`CHECKIN_HOSTNAME` placeholder) |
| `deploy/ROOT-INTEGRATION.md` | Exact root `docker-compose.yml` / `Caddyfile` patches + order |

## 1. Confirm environment (no changes yet)

1. Selected hostname + DNS: candidate `checkin.halaa.com.sa` — operator confirms
   the A record points at the VPS BEFORE any rollout. Camera requires HTTPS
   except localhost.
2. VPS headroom: record `nproc`, `free -g`, `df -h /opt /var/lib/docker`,
   `docker --version`, and that Caddy is healthy. Initial container budgets
   (api 2 CPU / 1G, web 1 CPU / 512M) must leave capacity for Halaa services;
   re-tune from these numbers, not from guesses.
3. Atlas: dedicated database (e.g. `halaa_checkin_prod`) + dedicated
   DB-scoped user exist; connection string + TLS cert path (if X.509) ready.
   Verify replica-set transactions work for that user (run
   `npm run db:indexes` against it from a trusted host).
4. Required indexes exist (`npm run db:indexes` prints verification); the API
   `/health/ready` stays 503 until they do.

## 2. Prepare `/opt/halaa-checkin` (VPS, one-time)

```bash
sudo mkdir -p /opt/halaa-checkin/data/exports
sudo chown -R 1001:1001 /opt/halaa-checkin/data
sudo chmod 700 /opt/halaa-checkin
sudo install -m 600 /dev/null /opt/halaa-checkin/config.env
sudo install -m 600 /dev/null /opt/halaa-checkin/.env
```

`config.env` contents (replace every placeholder; never commit this file):

```bash
NODE_ENV=production
APP_ORIGIN=https://<checkin-host>
MONGODB_URI=mongodb+srv://<checkin-user>:<password>@<cluster>/?retryWrites=true&w=majority
MONGODB_DB_NAME=halaa_checkin_prod
# MONGODB_TLS_CERT_PATH=/opt/halaa-checkin/certs/checkin-cert.pem
TRUST_PROXY_HOPS=1
SESSION_SECRET=<64+ random chars, e.g. output of: openssl rand -base64 48>
EXPORT_DIR=/app/data/exports
DEMO_SEED_ENABLED=false
```

`.env` contents (independent release pin; never touch `/opt/halaa/.env`):

```bash
IMAGE_TAG=<immutable GHCR SHA from CI>
```

Copy the tracked `deploy/compose.yml` to `/opt/halaa-checkin/compose.yml`.
Do NOT bake `MONGODB_URI` or passwords into Next public env or Docker build args.

## 3. Shared proxy network (one-time, BEFORE first `up`)

```bash
docker network create halaa_checkin_proxy
```

`compose.yml` references it as external, so `docker compose -p halaa-checkin
down` never deletes it. Skipping this step fails both the mini-app stack and
— once §5 is applied — the main Halaa stack.

## 4. Build / pull immutable images

```bash
cd /opt/halaa-checkin
echo "IMAGE_TAG=<sha>" > .env            # the tested SHA, never floating latest alone
docker login ghcr.io                      # read:packages PAT (one-time per VPS)
docker compose -p halaa-checkin pull
```

CI pushes `halaa-checkin-api:<sha>` + `halaa-checkin-web:<sha>` (plus
`latest` as a convenience pointer only). Rollback reference = prior SHA.

## 5. Root proxy integration (one-time, tracked files only)

Apply `ROOT-INTEGRATION.md` §§2–3 to the TRACKED root `docker-compose.yml`
and `Caddyfile`, commit, and roll the main stack through the normal process.
Then a short maintenance window for the one-time Caddy network recreation;
verify Halaa routes before/after (checklist in `ROOT-INTEGRATION.md` §6).

## 6. Start + verify the mini-app

```bash
cd /opt/halaa-checkin
docker compose -p halaa-checkin up -d --wait
docker compose -p halaa-checkin ps
curl -fsS https://<checkin-host>/api/checkin/v1/health/ready
```

Through the PUBLIC origin verify: HTTPS certificate, API/UI routes,
production cookie flags (`__Host-halaa-checkin-session`, Secure/HttpOnly/
SameSite=Lax/Path=/, no Domain), login as a provisioned named user, staff
event assignment, QR download, camera permission policy, and that existing
Halaa homepage/API/business-guest routes still work (before/after evidence).

Provision real named users through the safe CLI (password via hidden prompt
or secret stdin, never argv):

```bash
docker compose -p halaa-checkin exec checkin-api node api/scripts/provision-user.mjs \
  --username <name> --displayName "<display>" --role admin --events <eventId>
```

Seed ONLY an isolated demo database with explicit non-production flags.
Production demonstration records are entered/imported deliberately, never seeded.

## 7. Rollback (mini-app only)

```bash
cd /opt/halaa-checkin
echo "IMAGE_TAG=<prior tested SHA>" > .env
docker compose -p halaa-checkin pull
docker compose -p halaa-checkin up -d --wait
```

Database and export volume are preserved. Schema changes in v1 are
additive/backward-compatible, so the prior image starts against the current
schema; if a future migration is not, follow its documented forward-recovery
instead. Never roll back the whole Halaa stack to fix this app. Never run
`down -v` as a rollout/rollback procedure.

## 8. External prerequisites (block honest "deployed / gate ready" claims)

- Final hostname/DNS + VPS headroom numbers (candidate hostname not provisioned).
- Dedicated Atlas credentials + backup destination (no live DB inspected).
- Real event details + hotel's agreed retention period.
- Hotel acceptance of the v1 admission policy (principal present, actual
  companions recorded once, no late separate companion admission).
- Named reception accounts, event assignments, two tested devices, backup
  device/power/connectivity, on-site arrangements.
