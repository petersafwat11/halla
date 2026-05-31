#!/usr/bin/env bash
# Halla redeploy v2 — pre-stage @halla/shared BEFORE frontend npm install.
# Uses backup from v1 run at /root/backup-2026-05-31.
set -euo pipefail

BACKUP=/root/backup-2026-05-31
LOG=/tmp/deploy-2026-05-31-v2.out
exec > >(tee -a "$LOG") 2>&1
echo "=== Halla deploy v2 started $(date -Iseconds) ==="

if [ ! -f "$BACKUP/config.env" ]; then echo "FATAL: backup missing"; exit 1; fi

# 1. Wipe partially-deployed code (backup already exists)
echo "--- Phase 1: wipe partial deploy ---"
cd /var/www/labbe
rm -rf frontend backend shared halla-tmp

# 2. Clone latest origin/master (d7d32bf)
echo "--- Phase 2: clone ---"
git clone --depth=1 https://github.com/petersafwat11/halla.git halla-tmp
COMMIT=$(cd halla-tmp && git rev-parse --short HEAD)
echo "Deploying commit: $COMMIT"

mv halla-tmp/labbe            ./frontend
mv halla-tmp/labbe-backend-   ./backend
mv halla-tmp/shared           ./shared
rm -rf halla-tmp

# 3. Restore configs
echo "--- Phase 3: restore configs ---"
cp "$BACKUP/config.env"        /var/www/labbe/backend/config.env
mkdir -p /var/www/labbe/backend/certs
cp "$BACKUP/mongodb-x509.pem"  /var/www/labbe/backend/certs/
cp "$BACKUP/.env.production"   /var/www/labbe/frontend/.env.production
chmod 600 /var/www/labbe/backend/config.env \
          /var/www/labbe/backend/certs/mongodb-x509.pem \
          /var/www/labbe/frontend/.env.production

# 4. Backend install
echo "--- Phase 4: backend npm install ---"
cd /var/www/labbe/backend
npm install --omit=dev --no-audit --no-fund

# 5. PRE-STAGE @halla/shared into frontend/node_modules BEFORE npm install.
#    With version "*" and a matching package.json already in node_modules,
#    npm treats the dep as satisfied and won't hit the registry.
echo "--- Phase 5: pre-stage @halla/shared ---"
mkdir -p /var/www/labbe/frontend/node_modules/@halla
cp -r /var/www/labbe/shared /var/www/labbe/frontend/node_modules/@halla/shared
cd /var/www/labbe/frontend/node_modules/@halla/shared
npm install zod@^3 --no-save --no-audit --no-fund

# 6. Frontend install
echo "--- Phase 6: frontend npm install ---"
cd /var/www/labbe/frontend
npm install --no-audit --no-fund

# Re-stage shared if npm install pruned it
if [ ! -d /var/www/labbe/frontend/node_modules/@halla/shared/src ]; then
  echo "  (re-staging @halla/shared after npm install)"
  rm -rf /var/www/labbe/frontend/node_modules/@halla/shared
  cp -r /var/www/labbe/shared /var/www/labbe/frontend/node_modules/@halla/shared
  cd /var/www/labbe/frontend/node_modules/@halla/shared
  npm install zod@^3 --no-save --no-audit --no-fund
fi

# 7. Frontend build
echo "--- Phase 7: frontend build ---"
cd /var/www/labbe/frontend
npm run build

# 8. Restart pm2
echo "--- Phase 8: restart pm2 ---"
pm2 restart labbe-backend labbe-frontend --update-env
pm2 save
sleep 5

# 9. Smoke tests
echo "--- Phase 9: smoke ---"
pm2 list
echo "--- frontend localhost ---"
curl -fsSI http://localhost:3000/ | head -5 || true
echo "--- nginx ---"
nginx -t && systemctl reload nginx
echo "--- public ---"
curl -fsSI https://halaa.com.sa | head -5 || true

echo "=== Deploy v2 finished $(date -Iseconds) — commit $COMMIT ==="
