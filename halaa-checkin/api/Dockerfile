# syntax=docker/dockerfile:1
# Halaa Guest Check-in API (Express + in-process Chromium PDF worker).
# BUILD CONTEXT = halaa-checkin/ (mini-app root only; never the monorepo root).
#
# Base is Debian bookworm-slim on Node 24 LTS (tested patch pinned; record the
# resolved image digest per release via `docker buildx imagetools inspect`).
# Playwright client: playwright-core 1.50.1 (pinned in api/package.json).
# Browser: Debian `chromium` via apt (unversioned Debian package; record
# `chromium --version` per release and test the exact Node/browser/Playwright
# trio before rollout). No Alpine base (musl needs a separate Chromium proof).

FROM node:24.13.1-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_PATH=/usr/bin/chromium

# --- system deps: Chromium runtime libs + font stack (single apt layer) ---
FROM base AS system
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fontconfig \
      fonts-liberation \
      libasound2 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libexpat1 \
      libgbm1 \
      libglib2.0-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# --- deps: production node_modules for api + contracts workspaces ---
FROM system AS deps
COPY package.json package-lock.json ./
COPY contracts/package.json ./contracts/package.json
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
# Install the full mini-app lockfile so workspace links stay exact. The runner
# stage below copies the API runtime closure out of this layer.
RUN npm ci --omit=dev --no-audit --no-fund

# --- runner: minimal non-root production image ---
FROM system AS runner
ENV NODE_ENV=production \
    PORT=8100 \
    EXPORT_DIR=/app/data/exports
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m appuser
COPY --from=deps /app/node_modules ./node_modules
# npm lays out this workspace with the API's own deps NESTED at
# api/node_modules (see package-lock.json `api/node_modules/*` entries for
# express/cors/helmet/...). The top-level tree alone leaves them UNMET, so the
# nested closure must travel with the image. contracts/ and web/ have no
# nested node_modules (their deps hoist to the top level).
COPY --from=deps /app/api/node_modules ./api/node_modules
# Workspace symlink targets must resolve inside the image.
COPY --chown=appuser:nodejs package.json package-lock.json ./
COPY --chown=appuser:nodejs contracts/package.json ./contracts/package.json
COPY --chown=appuser:nodejs contracts/src ./contracts/src
COPY --chown=appuser:nodejs api/package.json ./api/package.json
COPY --chown=appuser:nodejs api/src ./api/src
COPY --chown=appuser:nodejs api/scripts ./api/scripts
# Keep the @halaa-checkin/web workspace symlink resolvable (manifest only;
# the web runtime lives in its own image).
COPY --chown=appuser:nodejs web/package.json ./web/package.json
# Local Cairo binaries are the renderer's only font source (templates embed
# them as data URLs; no runtime font network fetch). Register with fontconfig
# as well so headless Chromium shapes Arabic identically to local runs.
# The full design/assets tree is also copied so templates/assets.js resolver
# (design/assets/...) works in the runner image.
COPY --chown=appuser:nodejs design/assets /app/design/assets
COPY --chown=appuser:nodejs design/assets/fonts/Cairo_400Regular.ttf design/assets/fonts/Cairo_500Medium.ttf design/assets/fonts/Cairo_600SemiBold.ttf design/assets/fonts/Cairo_700Bold.ttf /usr/share/fonts/halaa-checkin/
RUN fc-cache -f /usr/share/fonts/halaa-checkin >/dev/null 2>&1 || true
# Private export volume mount point: writable by the API UID, never served by
# web/Caddy. When bind-mounted from /opt/halaa-checkin/data/exports the host
# directory must be `chown 1001:1001` (see deploy/README.md).
RUN mkdir -p /app/data/exports /app/data/backups && chown -R appuser:nodejs /app
USER appuser
EXPOSE 8100
# Liveness only (no DB dependency). Compose overrides with the readiness probe
# (/api/checkin/v1/health/ready) which additionally verifies DB + indexes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8100/api/checkin/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node", "api/src/server.js"]
