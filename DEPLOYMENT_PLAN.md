# Updated Deployment Plan — Redeploy from `halla` Monorepo

> **VPS:** `79.143.190.206` (Contabo, Ubuntu 24.04, Hub Europe)
> **Repo:** https://github.com/petersafwat11/halla (monorepo)
> **Date drafted:** 2026-05-14

> **What's different from last time:** The server is already provisioned (Node, nginx, pm2, certbot, MongoDB cert, configs all exist). You're swapping the codebase: kill the old `updated-labbe` folder + archive, clone the new `halla` monorepo, trim it to just `labbe` (web) + `labbe-backend-` (backend), wire up, restart.
>
> **What we keep from last time:** existing `config.env`, `.env.production`, `certs/mongodb-x509.pem`, nginx site configs, SSL certs, domain DNS, pm2 process names — all already configured.

---

## Step 0 — One Unblocker

**SSH root password for `79.143.190.206`.** Yahoo Mail anti-bot blocked Playwright login, so I can't grab it from email. Three ways:

1. **You paste it here** (you presumably have it in the chat thread with previous Claude — search for "Contabo VPS is ready" email).
2. **You SSH in once yourself**, change the password to something simple, share it with me, then I rotate it to a strong one after the deploy.
3. **I trigger Contabo password reset from the portal** — new password emailed to `salembamehriz@yahoo.com`; you forward it here. *Cost:* server reboots (kills the currently running pm2 — but since we're stopping it anyway, this is fine).

---

## Phase A — Inspect (read-only, no changes yet)

Once SSH works, run and report back:

```bash
pm2 list                                    # what's running now
pm2 info <each app>                         # cwd, script, env
ls -la /var/www/labbe/ /root/ /opt/ ~/      # find current code roots
find / -maxdepth 4 -name "updated-labbe" -o -name "*.rar" -o -name "*.zar" -o -name "*.zip" 2>/dev/null
ls -la /var/www/labbe/backend/config.env /var/www/labbe/backend/certs/  # confirm existing config + cert
ls /etc/nginx/sites-enabled/                # confirm nginx setup intact
df -h && free -h && node -v && pm2 -v       # disk/mem/versions
```

Then pause and report exactly what was found before touching anything.

---

## Phase B — Backup & Stop (destructive, but reversible)

```bash
# Save configs/certs to a tarball outside the deploy dir
mkdir -p /root/backup-2026-05-14
cp /var/www/labbe/backend/config.env       /root/backup-2026-05-14/
cp /var/www/labbe/backend/certs/*.pem      /root/backup-2026-05-14/
cp /var/www/labbe/frontend/.env.production /root/backup-2026-05-14/  2>/dev/null || true
tar czf /root/backup-2026-05-14/old-code.tgz /var/www/labbe   # full safety net

# Stop pm2 processes
pm2 stop all
pm2 delete all
pm2 save --force
```

**Checkpoint:** list `/root/backup-2026-05-14/` and confirm the files are there before deleting anything.

---

## Phase C — Wipe Old Code

```bash
# Remove old deployment folder(s) and any archives
rm -rf /var/www/labbe
find / -maxdepth 4 -name "updated-labbe" -exec rm -rf {} + 2>/dev/null
find / -maxdepth 4 \( -name "*.rar" -o -name "*.zar" -o -name "*.zip" \) -exec rm -f {} + 2>/dev/null
```

---

## Phase D — Clone Halla Monorepo, Trim to Web + Backend

```bash
mkdir -p /var/www/labbe && cd /var/www/labbe
git clone https://github.com/petersafwat11/halla.git halla-tmp
cd halla-tmp

# Move what we keep
mv labbe            /var/www/labbe/frontend
mv "labbe-backend-" /var/www/labbe/backend

# Delete the monorepo + everything else (halla-mobile, docs, template-cards, _taqnyat_templates.json, etc.)
cd /var/www/labbe && rm -rf halla-tmp
```

After this, layout is identical to the old `/var/www/labbe/{frontend,backend}` so nginx + pm2 references still match.

---

## Phase E — Restore Configs & Install

```bash
# Backend
cp /root/backup-2026-05-14/config.env          /var/www/labbe/backend/config.env
mkdir -p /var/www/labbe/backend/certs
cp /root/backup-2026-05-14/mongodb-x509.pem    /var/www/labbe/backend/certs/
cd /var/www/labbe/backend && npm install --omit=dev

# Frontend
cp /root/backup-2026-05-14/.env.production    /var/www/labbe/frontend/.env.production
cd /var/www/labbe/frontend && npm install && npm run build
```

---

## Phase F — Start & Verify

```bash
cd /var/www/labbe/backend  && pm2 start src/server.js --name labbe-backend  --env production
cd /var/www/labbe/frontend && pm2 start npm --name labbe-frontend -- start
pm2 save

# Smoke tests
curl -fsS http://localhost:8000/api/v1/health
curl -fsSI http://localhost:3000
pm2 list
pm2 logs --lines 30 --nostream
nginx -t && systemctl reload nginx
```

Paste outputs back for confirmation.

---

## What Will NOT Be Touched (unless explicitly approved)

- Nginx site configs in `/etc/nginx/sites-available/`
- SSL certs / certbot renewal timer
- Firewall (UFW) rules
- DNS records
- The MongoDB cert and connection string (reused from backup)
- The root password (won't reset unless option 3 in Step 0 is chosen)

---

## Rollback Plan

If anything blows up:

```bash
pm2 delete all
rm -rf /var/www/labbe
tar xzf /root/backup-2026-05-14/old-code.tgz -C /
cd /var/www/labbe/backend  && pm2 start src/server.js --name labbe-backend
cd /var/www/labbe/frontend && pm2 start npm --name labbe-frontend -- start
pm2 save
```

Back to the previous state in under a minute.

---

## Known Facts (from prior session / Contabo portal)

- **VPS IP:** `79.143.190.206`
- **SSH user:** `root`
- **Contabo customer ID:** `14889235`
- **Contabo portal login:** `salembamehriz@yahoo.com` / `WvvzqgMguxMxSz9h3E5Y`
- **OS:** Ubuntu 24.04
- **Auto Backup:** active on Contabo side
- **MongoDB:** Atlas X.509 auth, cert at `/var/www/labbe/backend/certs/mongodb-x509.pem`
- **Backend port:** 8000 · **Frontend port:** 3000
- **Reverse proxy:** nginx → both ports, SSL via Let's Encrypt

---

## To Resume Tomorrow

1. Open this file.
2. Provide the SSH root password (or pick option 2/3 in Step 0).
3. Start at **Phase A**.
