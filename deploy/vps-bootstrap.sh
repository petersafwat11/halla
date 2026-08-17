#!/usr/bin/env bash
# Idempotent one-time VPS setup for the Halaa Docker stack. Run as root.
# Safe to re-run. See deploy/README.md for the full cutover procedure.
set -euo pipefail

APP_DIR=/opt/halaa

echo "== 1. Docker Engine + compose plugin =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker --version
docker compose version

echo "== 2. App directory =="
mkdir -p "$APP_DIR" "$APP_DIR/certs"
chmod 700 "$APP_DIR"

echo
echo "== Remaining one-time manual steps =="
cat <<STEPS
  1. Secrets:   copy the backend env  -> $APP_DIR/config.env        (chmod 600)
  2. Atlas cert: copy the x509 pem     -> $APP_DIR/certs/mongodb-x509.pem  (chmod 600)
     and ensure config.env has  DATABASE_CERT_PATH=/app/certs/mongodb-x509.pem
  3. GHCR pull auth (once):
        docker login ghcr.io -u <github-user> --password-stdin <<< "<read:packages PAT>"
  4. compose + Caddyfile are synced automatically by the deploy workflow.
     For the very first bring-up, scp them here or run the deploy workflow, then:
        cd $APP_DIR && echo "IMAGE_TAG=latest" > .env && docker compose up -d --wait
  5. Point HTTPS at Caddy (see README: Cloudflare grey-cloud OR DNS-01/Origin cert),
     then stop the old pm2 processes:  pm2 stop all
STEPS
