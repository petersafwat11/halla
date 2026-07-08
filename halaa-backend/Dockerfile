# syntax=docker/dockerfile:1
# API (Express) image. The backend is self-contained (no @halaa/shared runtime
# import), so it installs only its own deps. BUILD CONTEXT = monorepo root.

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
# Local-upload fallback dir (prod uses S3; harmless if unused).
RUN mkdir -p public/uploads && chown -R appuser:nodejs /app
USER appuser
EXPOSE 8000
ENV PORT=8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
