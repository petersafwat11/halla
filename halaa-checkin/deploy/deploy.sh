#!/usr/bin/env bash
# Run on the VPS: bash /opt/halaa-checkin/deploy.sh <tested 40-character git SHA>
set -euo pipefail

tag="${1:-}"
[[ "$tag" =~ ^[0-9a-f]{40}$ ]] || { echo 'A full tested commit SHA is required.' >&2; exit 1; }
cd /opt/halaa-checkin
test -s config.env || { echo 'Create /opt/halaa-checkin/config.env first (see deploy/README.md).' >&2; exit 1; }
grep -qx 'APP_ORIGIN=https://checkin.halaa.com.sa' config.env || { echo 'APP_ORIGIN must be https://checkin.halaa.com.sa' >&2; exit 1; }
chmod 600 config.env
mkdir -p data/exports data/backups deploy-logs
chmod 700 deploy-logs
chown 1001:1001 data/exports data/backups
docker network inspect halaa_checkin_proxy >/dev/null 2>&1 || docker network create halaa_checkin_proxy
previous="$(sed -n 's/^IMAGE_TAG=//p' .env 2>/dev/null || true)"
export IMAGE_TAG="$tag"
docker compose -p halaa-checkin config --quiet
docker compose -p halaa-checkin pull
if test -f compose.override.yml; then
  docker compose -p halaa-checkin up -d --wait --wait-timeout 90 checkin-mongo
fi

# Validate the dedicated database and create/verify indexes before replacing
# running containers. Private logs may contain connection errors: keep on VPS.
if ! timeout 180 docker compose -p halaa-checkin run --rm --no-deps -T checkin-api \
    node api/scripts/ensure-indexes.mjs >"deploy-logs/preflight-$tag.log" 2>&1; then
  echo "Database preflight failed; existing services unchanged. See private deploy-logs/preflight-$tag.log" >&2
  exit 1
fi

if ! docker compose -p halaa-checkin up -d --wait --wait-timeout 180; then
  docker compose -p halaa-checkin logs --no-color --tail 200 >"deploy-logs/rollout-$tag.log" 2>&1 || true
  if [[ "$previous" =~ ^[0-9a-f]{40}$ ]] && [[ "$previous" != "$tag" ]]; then
    export IMAGE_TAG="$previous"
    docker compose -p halaa-checkin up -d --wait --wait-timeout 180
    echo "Restored previous check-in release $previous" >&2
  fi
  exit 1
fi
for service in checkin-api checkin-web; do
  running="$(docker inspect --format '{{.Config.Image}}' "$(docker compose -p halaa-checkin ps -q "$service")")"
  [[ "$running" == "ghcr.io/petersafwat11/halaa-$service:$tag" ]] || { echo "Unexpected image for $service" >&2; exit 1; }
done
printf 'IMAGE_TAG=%s\n' "$tag" > .env
chmod 600 .env
docker compose -p halaa-checkin ps
echo "CHECKIN_DEPLOYED $tag"
