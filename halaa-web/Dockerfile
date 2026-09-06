# syntax=docker/dockerfile:1
# Web (Next.js) image. BUILD CONTEXT = monorepo root (needs the @halaa/shared
# workspace package). Multi-stage → tiny standalone runtime.

FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install the whole workspace from the root lockfile (cached layer) ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY halaa-web/package.json ./halaa-web/package.json
COPY halaa-backend/package.json ./halaa-backend/package.json
COPY halaa-mobile/package.json ./halaa-mobile/package.json
RUN npm ci --no-audit --no-fund

# --- build: compile the Next.js app (standalone output) ---
FROM base AS build
# NEXT_PUBLIC_* are inlined at build time — bake the production values (CI can override).
ARG NEXT_PUBLIC_API_URL=/api/v2
ARG NEXT_PUBLIC_APP_URL=https://halaa.com.sa
ARG NEXT_PUBLIC_HALAA_WHATSAPP_NUMBER=966552619282
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID=
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_HALAA_WHATSAPP_NUMBER=$NEXT_PUBLIC_HALAA_WHATSAPP_NUMBER \
    NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# npm may install conflicting versions inside workspace node_modules. Preserve
# the complete install tree, including those package-local dependencies.
COPY --from=deps /app/ ./
COPY . .
RUN npm run build -w halaa-web

# --- runner: minimal production image ---
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
# Standalone output (traced from the monorepo root) already contains node_modules
# and the bundled @halaa/shared. Static assets + public are copied alongside.
COPY --from=build --chown=nextjs:nodejs /app/halaa-web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/halaa-web/.next/static ./halaa-web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/halaa-web/public ./halaa-web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "halaa-web/server.js"]
