# Halaa (حلا) — Event Invitations & Management Platform

Halaa is a multi-role platform for creating events, sending invitations over SMS/WhatsApp,
managing guest lists and RSVPs, and running a vendor marketplace. It serves **hosts**,
**vendors**, **staff**, **guests**, and **admins**, in Arabic (default, RTL) and English.

Production: **https://halaa.com.sa**

---

## Repository layout

This is an **npm workspaces monorepo** with four packages:

| Package           | Path               | What it is                                         | Stack                          |
| ----------------- | ------------------ | -------------------------------------------------- | ------------------------------ |
| **Web**           | `labbe/`           | Customer + admin web app                           | Next.js 15 (App Router), React 19 |
| **Mobile**        | `halla-mobile/`    | iOS / Android / web app                            | Expo SDK 54, React Native 0.81 |
| **Backend**       | `labbe-backend-/`  | REST API (`/api/v2`)                               | Express 4, MongoDB / Mongoose 8 |
| **Shared**        | `shared/`          | Cross-app schemas, constants, API paths, utils     | Plain ESM, Zod                 |

Each package has its own README with setup and run instructions:

- [Web app → `labbe/README.md`](labbe/README.md)
- [Mobile app → `halla-mobile/README.md`](halla-mobile/README.md)
- [Backend API → `labbe-backend-/README.md`](labbe-backend-/README.md)
- [Shared package → `shared/README.md`](shared/README.md)

```
halla/
├── labbe/            # Next.js web (web + admin dashboard)
├── halla-mobile/     # Expo / React Native app
├── labbe-backend-/   # Express + MongoDB API
├── shared/           # @halla/shared — code shared by web & mobile
├── docs/             # Feature plans, architecture notes, migrations
└── package.json      # Workspace root
```

---

## Architecture at a glance

```
        ┌─────────────┐     ┌──────────────┐
        │  labbe (web)│     │ halla-mobile │
        │  Next.js 15 │     │  Expo / RN   │
        └──────┬──────┘     └──────┬───────┘
               │   HTTPS /api/v2    │
               └─────────┬──────────┘
                         ▼
              ┌────────────────────┐
              │  labbe-backend-    │  Express 4
              │  REST API /api/v2  │
              └─────────┬──────────┘
                        │
   ┌──────────┬─────────┼──────────┬─────────────┐
   ▼          ▼         ▼          ▼             ▼
MongoDB    AWS S3    Moyasar    Taqnyat       Redis
(Atlas)   (uploads) (payments) (SMS/WhatsApp) (optional)
```

Web and mobile share validation schemas, status colors, API path constants, and helpers
through the `@halla/shared` workspace package (consumed directly via symlink, no build step).

---

## Prerequisites

- **Node.js 20 LTS** (required by Expo SDK 54; also fine for Next 15 / Express)
- **npm 10+** (workspaces)
- A **MongoDB** connection string (the project uses MongoDB Atlas)
- For mobile builds: an **Expo / EAS** account and the **Expo Go** app or a dev client

---

## Quick start

Install everything from the repo root (workspaces hoist dependencies):

```bash
npm install
```

Then start each service (in separate terminals). All commands can be run from the root with
`-w <workspace>`, or by `cd`-ing into the package directory.

```bash
# 1. Backend API — http://localhost:8000  (needs labbe-backend-/.env, see its README)
npm run dev -w labbe-backend-

# 2. Web app — http://localhost:3000  (needs labbe/.env.local)
npm run dev -w labbe

# 3. Mobile app — Expo dev server
npm run start -w halla-mobile
```

> The web app proxies `/api/v2/*` to the backend in development (see `labbe/README.md`),
> so start the backend first.

---

## Environment configuration

Secrets are **not** committed. Each app reads its own env file — see the per-app READMEs for
the full variable list:

| App     | File                    | Notable variables                                              |
| ------- | ----------------------- | -------------------------------------------------------------- |
| Backend | `labbe-backend-/.env`   | `DATABASE`, `JWT_SECRET`, `MOYASAR_API_KEY`, `TAQNYAT_API_KEY`, `AWS_*` |
| Web     | `labbe/.env.local`      | `BACKEND_PROXY_URL`, `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`  |
| Mobile  | `halla-mobile/.env`     | `EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER` (API base is in `config/api.js`) |

---

## Tooling & conventions

- **Validation:** [Zod](https://zod.dev) everywhere. Schemas are shared from `@halla/shared/schemas`.
- **State / data:** Zustand for client state, TanStack React Query for server state (both apps).
- **i18n:** i18next + react-i18next; Arabic is the default locale with full RTL support.
- **Payments:** Moyasar only (credit card, Apple Pay, STC Pay, 3-D Secure).
- **Messaging:** Taqnyat for SMS and WhatsApp template sends.
- **Storage:** AWS S3 for user-generated media and invitation assets.
- **Lint:** ESLint 9 (flat config) at the root and per package — `npm run lint -w <workspace>`.

---

## Third-party services

| Service              | Used for                                        |
| -------------------- | ----------------------------------------------- |
| MongoDB Atlas        | Primary database                                |
| AWS S3               | File / image storage                            |
| Moyasar              | Payment processing & subscriptions              |
| Taqnyat              | SMS + WhatsApp delivery                          |
| Expo / EAS           | Mobile build & distribution                     |
| Redis (optional)     | Caching / rate limiting (disabled by default)   |

---

## Documentation

Deeper design notes, feature plans, and migration records live in [`docs/`](docs/) and the
root-level `*.md` deployment records.
```