# Root Halaa stack integration (one-time, reviewable, tracked-only)

This document is the explicit, scoped integration between the independent
`halaa-checkin` Compose project and the existing Halaa VPS stack. It changes
exactly two tracked root files and creates one external Docker network. No
mini-app service is ever added to the root `halaa` Compose project, no Halaa
image tag / route / volume / network is replaced, and no hand-edited VPS
Caddyfile state is relied upon (the existing `deploy.yml` workflow would
overwrite it on the next main-app deploy).

Status: PREPARED, NOT APPLIED. Applying happens only during the authorised
production rollout (deploy/README.md § Rollout) — preparing this plan does
not authorise production changes. The live VPS / DNS state was not inspected
while writing it; re-inspect before applying.

## 1. What changes (complete list)

| # | Target | Change |
| --- | --- | --- |
| 1 | External network `halaa_checkin_proxy` | Create once: `docker network create halaa_checkin_proxy` |
| 2 | Tracked root `docker-compose.yml` | Declare `halaa_checkin_proxy` as external; attach **only** `caddy` to it |
| 3 | Tracked root `Caddyfile` | Append the check-in host block (hostname substituted) |
| 4 | VPS `/opt/halaa-checkin/` | Mini-app project dir: `compose.yml`, `config.env` (600), `data/exports/`, `.env` with `IMAGE_TAG` |

## 2. Exact patch — root `docker-compose.yml`

```diff
   caddy:
     image: caddy:2-alpine
     restart: unless-stopped
     ports:
       - "80:80"
       - "443:443"
     volumes:
       - ./Caddyfile:/etc/caddy/Caddyfile:ro
       - caddy_data:/data
       - caddy_config:/config
     depends_on:
       web:
         condition: service_healthy
-    networks: [halaa]
+    networks: [halaa, halaa_checkin_proxy]
     logging:
       driver: json-file
       options: { max-size: "10m", max-file: "3" }
 
 networks:
   halaa:
     driver: bridge
+  # Shared with the independent halaa-checkin stack so Caddy can reach
+  # checkin-api:8100 / checkin-web:3100. External so `compose down` on either
+  # project never deletes it while the other still uses it. MUST exist before
+  # `docker compose up` (see §4 order of operations).
+  halaa_checkin_proxy:
+    name: halaa_checkin_proxy
+    external: true
```

Only `caddy` gains the second network. `api`/`web` keep exactly one network
(`halaa`); unique aliases (`checkin-api`/`checkin-web`) avoid collisions with
the existing `api`/`web` service names.

## 3. Exact patch — root `Caddyfile`

Append the block from `halaa-checkin/deploy/Caddyfile.snippet` with
`CHECKIN_HOSTNAME` replaced by the operator-confirmed hostname (candidate:
`checkin.halaa.com.sa` — confirm DNS first). Nothing else in the file changes;
the existing `halaa.com.sa` / `www.halaa.com.sa` blocks are untouched.

## 4. Order of operations (must survive future Halaa deploys)

Because the tracked files flow through the existing `deploy.yml` workflow
(sync root `docker-compose.yml` + `Caddyfile` → `/opt/halaa`, then
`up -d --wait --remove-orphans` + `caddy reload`), the integration survives
routine main-app deployments automatically. The one-time bootstrap order is:

1. `docker network create halaa_checkin_proxy` on the VPS — BEFORE applying
   the Compose patch. A routine main-app deploy with the patched Compose file
   but without this network fails; document the network in VPS bootstrap notes.
2. Merge §2 + §3 into the tracked root files, review, commit, deploy via the
   normal main-stack process.
3. Attaching a second network to the long-running `caddy` container requires a
   one-time recreation (`docker compose up -d --force-recreate caddy` or the
   normal stack rollout). Plan a short maintenance window and verify Halaa
   homepage/API/business-guest routes immediately before and after.
4. Validate merged config before reload: `docker compose exec -T caddy caddy
   validate --config /etc/caddy/Caddyfile` (or `caddy fmt --overwrite` for a
   syntax check), then reload.
5. Start the mini-app project (`/opt/halaa-checkin`, deploy/README.md) and
   verify HTTPS cert, `/api/checkin/v1/health/ready`, login, cookie flags, QR
   download and camera permission policy through the public origin.

## 5. Emergency isolation (check-in only, Halaa stays up)

To disable only the check-in host without touching Halaa routes: restore the
prior validated root `Caddyfile` (without the host block), sync, and `caddy
reload`. Do NOT delete the `halaa_checkin_proxy` network while Caddy or the
mini-app references it. Rolling back the whole Halaa stack to fix the
mini-app is forbidden; the mini-app rolls back independently via its own
`IMAGE_TAG` (deploy/README.md § Rollback).

## 6. Verification checklist (record before/after evidence)

- [ ] `docker network inspect halaa_checkin_proxy` exists before Compose apply
- [ ] `caddy validate` passes on the merged Caddyfile
- [ ] Halaa homepage, `/api/v2` health, business-invitation routes: identical before/after
- [ ] `https://<checkin-host>/api/checkin/v1/health/live` → 200 (no infra details)
- [ ] Login sets host-only `__Host-halaa-checkin-session` (Secure, HttpOnly, SameSite=Lax, Path=/, no Domain)
- [ ] Camera permission prompt appears (Permissions-Policy `camera=(self)`)
- [ ] No mini-app container publishes ports 80/443 (`docker ps` shows none)
