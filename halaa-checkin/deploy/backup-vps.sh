#!/usr/bin/env bash
# Daily database archive on the VPS. Copy off-server for disaster recovery.
set -euo pipefail
umask 077
cd /opt/halaa-checkin
mkdir -p data/mongo-backups
archive="data/mongo-backups/checkin-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
container="$(docker compose -p halaa-checkin ps -q checkin-mongo)"
test -n "$container"
# Credentials remain inside the container; a private config avoids argv secrets.
docker exec "$container" sh -c 'mongosh --quiet --eval '\''const fs = require("fs"); const c = JSON.parse(fs.readFileSync("/run/checkin/admin.json", "utf8")); fs.writeFileSync("/tmp/checkin-dump.yml", "uri: mongodb://" + c.user + ":" + c.password + "@127.0.0.1:27017/?authSource=admin\n", {mode:384});'\'' >/dev/null; mongodump --config=/tmp/checkin-dump.yml --archive --gzip --oplog; status=$?; rm -f /tmp/checkin-dump.yml; exit "$status"' > "$archive.partial"
gzip -t "$archive.partial"
mv "$archive.partial" "$archive"
echo "Created $archive"
# Retention applies only to this script's completed database archives.
find /opt/halaa-checkin/data/mongo-backups -maxdepth 1 -type f -name 'checkin-*.archive.gz' -mtime +14 -delete
