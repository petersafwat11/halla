# Deployment Record — halaa.com.sa (2026-05-14)

This is the canonical record of what happened during the redeploy from the `halla` monorepo to the Contabo VPS, plus everything you need to operate / redeploy the site in the future.

> **Read this first if you're picking up work on this server.**

---

## 1. Server access

- **Public IP:** `79.143.190.206`
- **SSH user:** `root`
- **SSH key:** `~/.ssh/id_ed25519` on the deploy machine (Windows, `C:\Users\B\.ssh\id_ed25519`). Comment: `halla-deploy-20260514`. Already installed in the server's `authorized_keys`. Just `ssh root@79.143.190.206` works keylessly.
- **Root password (fallback only, do NOT use in scripts):** `X7m#kP9qLv2nB!8sR4tHfA6w`
  - Generated and applied via Contabo portal on 2026-05-14. Server rebooted as part of the reset.
  - Stored only in chat transcripts; not recoverable from Contabo. If lost, reset again via the portal.
- **Contabo portal:** `https://my.contabo.com/`
  - Login: `salembamehriz@yahoo.com`
  - Password: `WvvzqgMguxMxSz9h3E5Y`
  - Customer ID: `14889235`
  - VPS internal name: `vmi3248614`

### Suggested first action after this deploy

Rotate the root password (since it lives in chat history) and remove SSH password auth entirely:

```bash
ssh root@79.143.190.206
passwd  # set a fresh strong password
# then disable password SSH:
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Only do this AFTER confirming key-based SSH still works (it does — verified during deploy).

---

## 2. What lives where on the server

```
/var/www/labbe/
├── backend/                       # halla monorepo's labbe-backend- (trailing hyphen in repo)
│   ├── src/server.js              # pm2 entrypoint
│   ├── config.env                 # backend env (mode 600). SOURCE OF TRUTH for backend config.
│   ├── certs/
│   │   └── mongodb-x509.pem       # Atlas X.509 client cert (mode 600)
│   ├── node_modules/              # 161 MB, prod-only deps
│   └── ...
└── frontend/                      # halla monorepo's labbe (Next.js 15.5.18 app)
    ├── .env.production            # frontend env (mode 600)
    ├── .next/                     # build output (~393 MB)
    ├── node_modules/              # 845 MB
    └── ...

/root/backup-2026-05-14/           # last-known-good snapshot from BEFORE the redeploy
├── config.env                     # pre-deploy backend env
├── mongodb-x509.pem               # pre-deploy cert
├── .env.production                # pre-deploy frontend env
└── old-code.tgz                   # 468 MB tarball of the pre-deploy /var/www/labbe

/etc/nginx/sites-enabled/
└── labbe-frontend                 # reverse proxy: halaa.com.sa → 127.0.0.1:3000 + :8000, TLS via certbot

/root/.pm2/                        # pm2 daemon home (dump.pm2, logs/)
```

**pm2 processes (saved via `pm2 save` — survive reboot):**

| id | name | port | cwd | command |
|----|------|------|-----|---------|
| 0  | `labbe-backend`  | 8000 | `/var/www/labbe/backend`  | `node src/server.js` (env=production) |
| 1  | `labbe-frontend` | 3000 | `/var/www/labbe/frontend` | `npm start` (= `next start`) |

---

## 3. External services (passwords + endpoints)

### MongoDB Atlas
- Cluster: `halaa-staging.jz77pt9.mongodb.net` (despite the name, this is production)
- Auth: X.509 client cert at `/var/www/labbe/backend/certs/mongodb-x509.pem`
- Connection string is in `config.env` as `DATABASE`
- **DNS trap:** Contabo's network resolver AND Google DNS (`8.8.8.8`) both fail to return SRV records for this cluster — Node gets `ENODATA`. The backend hardcodes `dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'])` in `src/config/database.js` so **Cloudflare is tried first**. If you ever revert that line back to Google-only, the backend will crashloop on `MongoDB connection failed: querySrv ENODATA`. See section 6.

### WhatsApp Cloud API
- `WHATSAPP_APP_SECRET` in `config.env` is currently a **PLACEHOLDER**. The backend boots and serves API requests, but inbound WhatsApp webhooks (POST `/messaging/webhook`) will be rejected because the HMAC signature won't match.
- **To fix:** Go to Meta Business Manager → your WhatsApp app → Settings → "App Secret". Copy it. Then:
  ```bash
  ssh root@79.143.190.206
  sed -i 's|^WHATSAPP_APP_SECRET=.*|WHATSAPP_APP_SECRET=YOUR_REAL_SECRET_HERE|' /var/www/labbe/backend/config.env
  pm2 restart labbe-backend
  ```

### Other secrets currently in `config.env`
- `JWT_SECRET` — used to sign access tokens. Don't change unless you want to invalidate every user session.
- `TAQNYAT_API_KEY` — SMS provider.
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — S3 uploads.
- `EMAIL_PASSWORD` — Gmail SMTP.
- `MOYASAR_API_KEY` — empty/stub in current config; payments fall back to "synthetic success" stub. Real Moyasar keys need to go here to enable live payments.

### ⚠️ Secrets leaked to git history
The halla repo's committed `config.env` contained a different (likely staging/dev) set of secrets — Moyasar test keys, a JWT secret, S3 base URL, Moyasar webhook secret, an empty WhatsApp placeholder. These are now in public git history at `https://github.com/petersafwat11/halla`. **Action items:**
1. Rotate the test Moyasar keys (they're labelled `sk_test_…` — not production, but still).
2. Decide whether the leaked JWT secret was ever used in prod. If yes → rotate (will log everyone out).
3. Run `git filter-repo` or BFG to scrub `config.env` from history, OR accept that the keys are known and rely on rotation.
4. Add `config.env` to `.gitignore` going forward (already there for the backend's local dev, but the committed file pre-dates the ignore).

---

## 4. Deploy flow — what was actually done

Phases A–F from `DEPLOYMENT_PLAN.md`. Outcomes:

| Phase | What happened |
|-------|---------------|
| 0 | Triggered Contabo password reset via Playwright. New password set directly in the portal (no email flow). Installed ed25519 key for keyless SSH. |
| A | Inventory: pm2 had `labbe-backend` + `labbe-frontend` running; `/var/www/labbe/{backend,frontend}` existed; no archives to clean; nginx config valid. |
| B | Stopped pm2, backed up `config.env` + cert + `.env.production` + full tarball of `/var/www/labbe` to `/root/backup-2026-05-14/`. |
| C | Skipped — no `updated-labbe` or archive files existed. |
| D | Wiped `/var/www/labbe`, cloned `https://github.com/petersafwat11/halla.git --depth=1`, moved `labbe` → `frontend` and `labbe-backend-` → `backend`, deleted everything else (`halla-mobile`, `docs`, `template-cards`, `_taqnyat_templates.json`). |
| E | Restored configs from backup, `chmod 600` on all secret files, `npm install --omit=dev` in backend (396 pkgs), `npm install` in frontend (411 pkgs), `npm run build` in frontend. |
| F | `pm2 start` both apps, `pm2 save`, nginx reloaded, smoke-tested `halaa.com.sa`. |

### Code fixes pushed during the deploy

Five things had to be fixed in the codebase to get a clean deploy. Each was edited locally in `D:\halla\…` AND on the server. **Re-deployments will pull from git, so the local edits need to be committed and pushed for the fixes to persist on the next clone.**

| File | Fix |
|------|-----|
| `labbe/app/[lang]/ticket-rating/[id]/page.js:16` | Typo `errorBoundary/ErrorBoundary` → `error/ErrorBoundary`. Was blocking the webpack compile entirely. |
| `labbe/app/[lang]/host/create-event/_components/stepper/Stepper.js:15-22` | Removed `try/catch` around `useTranslation()` hook. ESLint `rules-of-hooks` was failing the build because the hook was called conditionally. The `t()` second arg already provides a per-key fallback, so the try/catch was redundant. |
| `labbe/hooks/reactQueryHooks/useTickets.js` | Added missing `useTicket(ticketId)` hook. `app/[lang]/admin-dash/tickets/[id]/_components/TicketDetailsContent.jsx` was importing it but it didn't exist — admin ticket details page would crash on click. |
| `labbe/providers/ClientCompTrans.js` | Added `.use(initReactI18next)` and `initImmediate: false` so `i18next.init()` completes synchronously when pre-loaded resources are passed. Without this, SSR rendered before init resolved → `t(..., { returnObjects: true })` returned the key string → `.map()` threw → landing page rendered the ErrorBoundary fallback. |
| `labbe-backend-/src/config/database.js:11-15` | Changed `dns.setServers(['8.8.8.8', '8.8.4.4'])` → `['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']` so Cloudflare is tried first. See section 6. |
| `labbe-backend-/src/modules/guests/guests.routes.js:378` | Quoted a swagger description string containing `wasAlreadyRevoked: true`. The unquoted colon was a YAML parse error printed at every backend boot (cosmetic, but noisy). |

**Commit these fixes to the halla repo** before the next deploy, otherwise a fresh clone will re-introduce all five bugs.

### Server config additions

- Added `WHATSAPP_APP_SECRET=<placeholder>` to `/var/www/labbe/backend/config.env`. Replace before WhatsApp webhook traffic is expected.

---

## 5. How to redeploy in the future

Once the code fixes above are in git, a redeploy is straightforward. Assuming you want to push new code to production:

```bash
ssh root@79.143.190.206

# 1. Backup before touching anything
DATE=$(date +%Y-%m-%d)
mkdir -p /root/backup-$DATE
cp /var/www/labbe/backend/config.env       /root/backup-$DATE/
cp /var/www/labbe/backend/certs/*.pem      /root/backup-$DATE/
cp /var/www/labbe/frontend/.env.production /root/backup-$DATE/
tar czf /root/backup-$DATE/old-code.tgz /var/www/labbe

# 2. Pull latest code (this is a git clone, not git pull — repo was --depth=1)
cd /var/www/labbe
pm2 stop all
rm -rf frontend backend
git clone --depth=1 https://github.com/petersafwat11/halla.git halla-tmp
mv halla-tmp/labbe            ./frontend
mv halla-tmp/labbe-backend-   ./backend
rm -rf halla-tmp

# 3. Restore configs + tighten perms
cp /root/backup-$DATE/config.env          /var/www/labbe/backend/config.env
mkdir -p /var/www/labbe/backend/certs
cp /root/backup-$DATE/mongodb-x509.pem    /var/www/labbe/backend/certs/
cp /root/backup-$DATE/.env.production    /var/www/labbe/frontend/.env.production
chmod 600 /var/www/labbe/backend/config.env /var/www/labbe/backend/certs/mongodb-x509.pem /var/www/labbe/frontend/.env.production

# 4. Install + build
cd /var/www/labbe/backend  && npm install --omit=dev --no-audit --no-fund
cd /var/www/labbe/frontend && npm install --no-audit --no-fund && npm run build

# 5. Restart
pm2 restart all
pm2 save
nginx -t && systemctl reload nginx

# 6. Verify
pm2 list
curl -fsSI http://localhost:3000     # expect 307 → /ar
curl -fsSI http://localhost:8000/    # expect 404 (no root route, but server responding)
curl -fsSI https://halaa.com.sa      # expect 200 via nginx
pm2 logs --lines 30 --nostream
```

**Rollback** if anything breaks (under one minute):

```bash
pm2 delete all
rm -rf /var/www/labbe
tar xzf /root/backup-$DATE/old-code.tgz -C /
cd /var/www/labbe/backend  && pm2 start src/server.js --name labbe-backend
cd /var/www/labbe/frontend && pm2 start npm --name labbe-frontend -- start
pm2 save
```

---

## 6. Operational gotchas (read before debugging)

### MongoDB SRV resolution
- `dig @8.8.8.8 SRV _mongodb._tcp.halaa-staging.jz77pt9.mongodb.net` returns no records from this server's network. Cloudflare (`@1.1.1.1`) returns them. Don't change `src/config/database.js:13` back to Google-only DNS.
- After server reboot, `systemd-resolved` can be in a weird state — `systemctl restart systemd-resolved` clears it. The backend's hardcoded resolvers bypass the system one anyway, so this is mostly relevant for the rest of the box.

### pm2 + boot
- `pm2 save` was run after the deploy, and `pm2-root.service` exists via `pm2 startup`, so both apps come up automatically after VPS reboot. **Don't forget to re-run `pm2 save` after any process changes** (renaming, env changes, etc.) — otherwise the next reboot won't reflect them.

### Repo folder name oddity
- The monorepo has `labbe-backend-` with a trailing hyphen. The deploy renames it to `backend` so this doesn't matter post-deploy, but `git clone` scripts must use the exact name.

### `WHATSAPP_APP_SECRET` is fail-closed
- `src/config/env.js` requires this var at startup. If empty/missing, the backend exits immediately with `❌ Environment validation failed: "WHATSAPP_APP_SECRET" is required`. The placeholder currently in `config.env` satisfies the schema but won't pass real Meta HMAC verification.

### React-i18next async init
- The `ClientCompTrans.js` fix (section 4) is essential. If you ever refactor that file, keep `.use(initReactI18next)` and `initImmediate: false` — without them the landing page reverts to showing the ErrorBoundary fallback.

### Build time
- Frontend `npm install` takes ~1 minute, `npm run build` takes ~2.5 minutes (~393 MB `.next` output). Plan downtime accordingly. Backend `npm install` is ~35 seconds.

---

## 7. Open follow-ups

1. **Commit the 5 in-tree fixes** (section 4) to the halla repo on `master`. Without this, the next deploy re-introduces all of them.
2. **Replace `WHATSAPP_APP_SECRET` placeholder** with the real Meta App Secret. WhatsApp webhook is broken until you do.
3. **Rotate / scrub the leaked secrets in git history.**
4. **Add a real backend health endpoint** at `/api/v1/health` — currently the backend has no health route, so smoke tests have to rely on a 404 to confirm the process is alive. A tiny `app.get('/api/v1/health', (req,res) => res.json({ok:true}))` would make monitoring much easier.
5. **Switch Joi → Zod for env validation in `src/config/env.js`.** Project-wide rule is Zod-only (see `feedback_validation_zod.md` memory). The env schema is the last Joi holdout I noticed.
6. **Bump Node to v22+** before January 2027 — AWS SDK v3 deprecation warning is already firing on every backend boot.
7. **Consider committing a `pm2.config.js`** so `pm2 start pm2.config.js` deploys both apps with one command and explicit env/cwd settings, instead of the two ad-hoc `pm2 start` invocations the plan currently uses.

---

## 8. Quick reference

```
SSH:          ssh root@79.143.190.206
Site:         https://halaa.com.sa
Backend:      127.0.0.1:8000  (pm2 id 0, labbe-backend)
Frontend:     127.0.0.1:3000  (pm2 id 1, labbe-frontend)
Backup dir:   /root/backup-2026-05-14/
Repo:         https://github.com/petersafwat11/halla
Atlas:        halaa-staging.jz77pt9.mongodb.net (X.509)
Nginx site:   /etc/nginx/sites-enabled/labbe-frontend
Pm2 logs:     pm2 logs <name> --lines 50 --nostream
Pm2 status:   pm2 list
Nginx test:   nginx -t && systemctl reload nginx
```
