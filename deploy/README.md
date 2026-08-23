# Halaa deployment (Docker + Caddy + GHCR)

Production runs a small Docker Compose stack on a single VPS:

```
Internet ──HTTPS──▶ Caddy (auto-TLS) ──┬── /            ▶ web  (Next.js :3000)
                                        └── /api/v2, /uploads, /health ▶ api  (Express :8000)
```

MongoDB Atlas is managed. Runtime media lives in
`/opt/halaa/data/uploads` and is bind-mounted into the API container at
`/app/public/uploads`, so replacing or rolling the container does not erase it.
App secrets live only on the VPS (`/opt/halaa/config.env` +
`/opt/halaa/certs/`), never in an image or in git.

## How a deploy works

1. Push to `master` (touching `halaa-web/`, `halaa-backend/`, `shared/`, `docker-compose.yml`, or `Caddyfile`) runs `.github/workflows/deploy.yml`.
2. CI builds `halaa-web` + `halaa-api` images and pushes them to GHCR tagged with the git SHA (+ `latest`).
3. CI SSHes to the VPS, syncs `docker-compose.yml` + `Caddyfile`, writes `IMAGE_TAG=<sha>` to `/opt/halaa/.env`, then `docker compose pull && docker compose up -d --wait`.
4. `--wait` blocks until both containers report healthy, so a bad build fails the deploy instead of taking the site down.

## One-time setup

### GitHub repo secrets
| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP / hostname (e.g. `79.143.190.206`) |
| `VPS_USER` | SSH user (e.g. `root`) |
| `VPS_SSH_KEY` | Private ed25519 key authorized on the VPS |

### On the VPS
```bash
# 1. Install Docker + create /opt/halaa
sudo bash deploy/vps-bootstrap.sh

# 2. Place secrets (chmod 600)
#    /opt/halaa/config.env                 (backend env; set DATABASE_CERT_PATH=/app/certs/mongodb-x509.pem)
#    /opt/halaa/certs/mongodb-x509.pem     (Atlas X.509 cert)

# 3. Let the VPS pull private images from GHCR (read:packages PAT)
docker login ghcr.io -u <github-user> --password-stdin <<< "<PAT>"

# 4. First bring-up (or just run the deploy workflow)
cd /opt/halaa
mkdir -p data/uploads && chown -R 1001:1001 data/uploads
echo "IMAGE_TAG=latest" > .env
docker compose up -d --wait
docker compose exec -T api npm run storage:restore-templates
```

The compose file explicitly sets `FILE_STORAGE_DRIVER=local` and
`UPLOAD_PATH=/app/public/uploads`. The deploy workflow creates the host
directory before each rollout and then runs the idempotent template restoration
command. That command copies the 20 tracked invitation masters into persistent
storage, generates thumbnails, and updates only their storage references.

## Media backup

The bind mount protects files from container replacement, but it is still on a
single VPS disk. Back up both of these together so database references and files
remain consistent:

- MongoDB Atlas backup/snapshot.
- `/opt/halaa/data/uploads/` copied to storage outside this VPS.

Before production user uploads are treated as durable, configure a nightly
off-VPS backup (for example encrypted `restic` to a separate provider) and a
weekly restore check. Do not use another directory on the same VPS as the only
backup. At 200–500 images per month the 165 GB currently free on the VPS is
ample, but retain alerts at 70% and 85% disk usage because phone uploads can be
up to 10 MB and post-event videos up to 50 MB.

### TLS with Cloudflare
Caddy issues a Let's Encrypt cert automatically. If the `halaa.com.sa` record is
**proxied** (orange cloud) in Cloudflare, the public ACME challenge can be intercepted.
Pick one:
- Set the record to **DNS-only** (grey cloud) so Caddy's HTTP challenge reaches the VPS; or
- Use the **Cloudflare DNS-01** challenge (build Caddy with `caddy-dns/cloudflare` + a CF API token); or
- Install a **Cloudflare Origin certificate** and point Caddy at it with `tls`.

## Rollback

Re-run the **deploy** workflow via *Run workflow* → set **image_tag** to a previous git SHA.
It skips the build and rolls the VPS back to that image. Or on the VPS:
```bash
cd /opt/halaa && echo "IMAGE_TAG=<old-sha>" > .env && docker compose up -d --wait
```

During the initial cutover the old pm2 processes are kept stopped-but-installed so the
site can be restored instantly with `pm2 start all` if needed.
