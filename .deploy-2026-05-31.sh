#!/usr/bin/env bash
# Halla redeploy — pulls origin/master, swaps code, rebuilds, restarts pm2.
# Follows DEPLOYMENT_RECORD_2026-05-14.md §5 with the @halla/shared workspace
# fix from project_deploy_halla_shared.md.
set -euo pipefail

DATE=2026-05-31
BACKUP=/root/backup-$DATE
LOG=/tmp/deploy-$DATE.log

exec > >(tee -a "$LOG") 2>&1
echo "=== Halla deploy started $(date -Iseconds) ==="

# 1. Backup
echo "--- Phase 1: backup ---"
mkdir -p "$BACKUP"
cp /var/www/labbe/backend/config.env       "$BACKUP/"
cp /var/www/labbe/backend/certs/*.pem      "$BACKUP/"
cp /var/www/labbe/frontend/.env.production "$BACKUP/"
tar czf "$BACKUP/old-code.tgz" /var/www/labbe 2>/dev/null
ls -la "$BACKUP"

# 2. Stop pm2 (keeps process definitions; we'll restart in place)
echo "--- Phase 2: stop pm2 ---"
pm2 stop all

# 3. Wipe old code
echo "--- Phase 3: wipe ---"
cd /var/www/labbe
rm -rf frontend backend shared halla-tmp

# 4. Fresh clone of latest origin/master
echo "--- Phase 4: clone ---"
git clone --depth=1 https://github.com/petersafwat11/halla.git halla-tmp
COMMIT=$(cd halla-tmp && git rev-parse --short HEAD)
echo "Deploying commit: $COMMIT"

mv halla-tmp/labbe            ./frontend
mv halla-tmp/labbe-backend-   ./backend
mv halla-tmp/shared           ./shared
rm -rf halla-tmp

# 5. Restore configs
echo "--- Phase 5: restore configs ---"
cp "$BACKUP/config.env"        /var/www/labbe/backend/config.env
mkdir -p /var/www/labbe/backend/certs
cp "$BACKUP/mongodb-x509.pem"  /var/www/labbe/backend/certs/
cp "$BACKUP/.env.production"   /var/www/labbe/frontend/.env.production
chmod 600 /var/www/labbe/backend/config.env \
          /var/www/labbe/backend/certs/mongodb-x509.pem \
          /var/www/labbe/frontend/.env.production

# 6. Backend install
echo "--- Phase 6: backend npm install ---"
cd /var/www/labbe/backend
npm install --omit=dev --no-audit --no-fund

# 7. Wire @halla/shared into frontend node_modules (workspace fix)
echo "--- Phase 7: frontend npm install + shared wiring ---"
cd /var/www/labbe/frontend
npm install --no-audit --no-fund
mkdir -p /var/www/labbe/frontend/node_modules/@halla
rm -rf /var/www/labbe/frontend/node_modules/@halla/shared
cp -r /var/www/labbe/shared /var/www/labbe/frontend/node_modules/@halla/shared
cd /var/www/labbe/frontend/node_modules/@halla/shared
npm install zod@^3 --no-save --no-audit --no-fund

# 8. Frontend build
echo "--- Phase 8: frontend build ---"
cd /var/www/labbe/frontend
npm run build

# 9. Restart pm2
echo "--- Phase 9: restart pm2 ---"
pm2 restart labbe-backend labbe-frontend --update-env
pm2 save
sleep 5

# 10. Smoke tests
echo "--- Phase 10: smoke tests ---"
pm2 list
echo "--- backend health ---"
curl -fsSI http://localhost:8000/ || echo "(404 expected — no root route)"
echo "--- frontend ---"
curl -fsSI http://localhost:3000/ | head -5
echo "--- nginx ---"
nginx -t && systemctl reload nginx
echo "--- public ---"
curl -fsSI https://halaa.com.sa | head -5

echo "=== Deploy finished $(date -Iseconds) — commit $COMMIT ==="
