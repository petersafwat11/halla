# syntax=docker/dockerfile:1
# API (Express) image. The backend imports selected runtime modules from the
# @halaa/shared workspace, so the runner must include that package alongside
# the backend. BUILD CONTEXT = monorepo root.

FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: production dependencies only ---
FROM base AS deps
COPY halaa-backend/package.json ./package.json
# No per-package lockfile in a workspace repo; install prod deps from ranges.
RUN npm install --omit=dev --no-audit --no-fund

# --- runner ---
FROM base AS runner
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m appuser
COPY --from=deps /app/node_modules ./node_modules
COPY halaa-backend/ ./
# Canonical invitation backgrounds used by the idempotent S3-to-local
# restoration script. They are tracked source assets, not runtime uploads.
COPY template-cards ./template-cards
# Preserve Node's normal package resolution for backend imports such as
# `@halaa/shared/constants/eventCategories.cjs`. Shared dependencies used by
# the backend (xlsx and zod) are already installed by halaa-backend/package.json.
COPY shared/package.json ./node_modules/@halaa/shared/package.json
COPY shared/src ./node_modules/@halaa/shared/src
# Fail the image build instead of production startup if the shared workspace is
# ever omitted or its export map stops resolving the backend's CJS entrypoint.
RUN node -e "require('@halaa/shared/constants/eventCategories.cjs')"
# Mount point for persistent runtime media (bound from /opt/halaa/data/uploads).
RUN mkdir -p public/uploads && chown -R appuser:nodejs /app
USER appuser
EXPOSE 8000
ENV PORT=8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
