#!/usr/bin/env bash
# Halla redeploy v4 — replace symlinked @halla/shared with a real copy
# so webpack's realpath() resolves xlsx from frontend/node_modules.
set -euo pipefail

LOG=/tmp/deploy-v4.out
exec > >(tee -a "$LOG") 2>&1
echo "=== Halla deploy v4 started $(date -Iseconds) ==="

cd /var/www/labbe/frontend

echo "--- Phase 1: replace symlinked @halla/shared with real copy ---"
ls -la node_modules/@halla/ || true
rm -rf node_modules/@halla/shared
cp -r /var/www/labbe/shared node_modules/@halla/shared
ls -la node_modules/@halla/shared | head -3

echo "--- Phase 2: install zod in @halla/shared ---"
cd node_modules/@halla/shared
npm install zod@^3 --no-save --no-audit --no-fund
cd /var/www/labbe/frontend

echo "--- Phase 3: verify xlsx is in frontend node_modules ---"
ls node_modules/xlsx/package.json && grep version node_modules/xlsx/package.json | head -1

echo "--- Phase 4: frontend build ---"
npm run build

echo "--- Phase 5: restart pm2 ---"
pm2 restart labbe-backend labbe-frontend --update-env
pm2 save
sleep 5

echo "--- Phase 6: smoke ---"
pm2 list
echo "--- frontend localhost ---"
curl -fsSI http://localhost:3000/ | head -5 || true
echo "--- backend localhost ---"
curl -fsSI http://localhost:8000/ | head -5 || true
echo "--- nginx ---"
nginx -t && systemctl reload nginx
echo "--- public ---"
curl -fsSI https://halaa.com.sa | head -5 || true

echo "=== Deploy v4 finished $(date -Iseconds) ==="
