# Check-in on the existing VPS

Canonical URL: **https://checkin.halaa.com.sa/ar**. The main website remains
at https://halaa.com.sa/ar. DNS `checkin` must point to `79.143.190.206`.

This is the selected self-hosted alternative to the Atlas instructions in
README.md. MongoDB Community uses existing VPS disk, RAM and CPU without a
separate database subscription. One node supports transactions but does not
provide high availability. The main website's Atlas database is independent.

## First installation

Copy `compose.yml`, `compose.override.yml`, `bootstrap-vps.py`, `init-mongo.js`,
`deploy.sh`, and `backup-vps.sh` into `/opt/halaa-checkin`. Run as root:

```bash
cd /opt/halaa-checkin
python3 bootstrap-vps.py
docker network inspect halaa_checkin_proxy >/dev/null 2>&1 || docker network create halaa_checkin_proxy
# IMAGE_TAG must be the full commit SHA published by successful check-in CI.
export IMAGE_TAG=<tested-40-character-SHA>
docker compose up -d checkin-mongo
# Wait for mongosh --eval 'db.runCommand({ping:1})' to succeed before initializing.
container=$(docker compose ps -q checkin-mongo)
docker cp init-mongo.js "$container:/tmp/init-mongo.js"
docker cp secrets/mongo-app.json "$container:/tmp/checkin-app.json"
docker exec "$container" mongosh --quiet /tmp/init-mongo.js
docker exec "$container" rm -f /tmp/checkin-app.json /tmp/init-mongo.js
bash deploy.sh "$IMAGE_TAG"
```

The database has authentication, a private internal network, a persistent named
volume and a 1.5 GiB memory ceiling. Its port is not published. The API account
can read/write only `halaa_checkin_prod`. Generated credentials stay on the VPS
in `secrets/` and `config.env`; never commit or paste these into logs.

Create named application users with the existing hidden-password CLI:

```bash
docker compose exec checkin-api node api/scripts/provision-user.mjs \
  --username <username> --displayName '<name>' --role admin
```

## Releases and rollback

After the `halaa-checkin` GitHub workflow succeeds and publishes images, run
the `deploy-checkin` workflow with its full commit SHA. It validates indexes,
waits for healthy services, and restores the previous images if startup fails.
The same workflow can deploy a prior tested SHA. It preserves the database.
The root deployment maintains Caddy and the shared proxy network separately.
Never run `docker compose down -v` against this production stack.

## Backups

Run `bash /opt/halaa-checkin/backup-vps.sh`; install a daily root cron entry:

```cron
15 2 * * * root /bin/bash /opt/halaa-checkin/backup-vps.sh >> /opt/halaa-checkin/deploy-logs/backup.log 2>&1
```

Full compressed MongoDB archives include the oplog and users. They are private
under `data/mongo-backups`, kept for 14 days, and survive container recreation.
Restore into an isolated MongoDB instance using `mongorestore --archive=<file>
--gzip --oplogReplay`, then run the application's documented restore checks.
Backups on this VPS do not protect against losing the VPS. Copy them to an
independent encrypted destination when available; external storage may cost extra.
