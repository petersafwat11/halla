#!/usr/bin/env bash
# Halla redeploy v3 — patches frontend package.json to use file:../shared
# and removes stale labbe/package-lock.json before install.
set -euo pipefail

LOG=/tmp/deploy-v3.out
exec > >(tee -a "$LOG") 2>&1
echo "=== Halla deploy v3 started $(date -Iseconds) ==="

cd /var/www/labbe

# 1. Patch frontend package.json to use local shared via file: spec
echo "--- Phase 1: patch package.json + clear stale lockfile ---"
sed -i 's|"@halla/shared": "\*"|"@halla/shared": "file:../shared"|' frontend/package.json
grep -E '@halla/shared' frontend/package.json
rm -f frontend/package-lock.json
# Also clear the pre-staged dir so npm installs cleanly from the file: path
rm -rf frontend/node_modules

# 2. Frontend npm install (resolves @halla/shared from ../shared)
echo "--- Phase 2: frontend npm install ---"
cd /var/www/labbe/frontend
npm install --no-audit --no-fund

# 3. Ensure zod is available inside the installed @halla/shared
#    (peer dep — npm 9+ may not auto-install peerDeps for file: links)
echo "--- Phase 3: ensure zod in @halla/shared ---"
if [ -d node_modules/@halla/shared ]; then
  cd node_modules/@halla/shared
  if [ ! -d node_modules/zod ]; then
    npm install zod@^3 --no-save --no-audit --no-fund
  fi
  cd /var/www/labbe/frontend
else
  echo "FATAL: @halla/shared not installed"; exit 1
fi

# 4. Build
echo "--- Phase 4: frontend build ---"
npm run build

# 5. Restart pm2
echo "--- Phase 5: restart pm2 ---"
pm2 restart labbe-backend labbe-frontend --update-env
pm2 save
sleep 5

# 6. Smoke
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

echo "=== Deploy v3 finished $(date -Iseconds) ==="
