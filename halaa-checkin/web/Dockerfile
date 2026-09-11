# syntax=docker/dockerfile:1
# Halaa Guest Check-in Web (Next.js App Router, bilingual AR/EN).
# BUILD CONTEXT = halaa-checkin/ (mini-app root only; never the monorepo root).
# Multi-stage -> minimal standalone runner. Production API routing is handled
# by Caddy; the Next rewrites() proxy is development-only (see next.config.mjs).

FROM node:24.13.1-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install the mini-app workspace from its own lockfile ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY contracts/package.json ./contracts/package.json
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
RUN npm ci --no-audit --no-fund

# --- build: compile the Next.js app (standalone output) ---
FROM base AS build
# Rewrites are serialized at BUILD time: bake the API proxy destination here.
# Default is loopback (fails closed; unreachable in production where Caddy
# owns /api/* routing). The dev overlay overrides this to the container
# network name (see deploy/compose.dev.yml).
ARG BACKEND_PROXY_URL=http://127.0.0.1:8100
ENV BACKEND_PROXY_URL=$BACKEND_PROXY_URL
COPY --from=deps /app/ ./
COPY . .
# Contracts build is trivial but keeps the workspace contract explicit.
RUN npm run build

# --- runner: minimal non-root production image ---
FROM base AS runner
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
# Standalone output is traced from the mini-app root (outputFileTracingRoot),
# so the server entrypoint is `web/server.js` with node_modules alongside.
COPY --from=build --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/web/public ./web/public
USER nextjs
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node", "web/server.js"]
