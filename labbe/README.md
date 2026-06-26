# Halaa Web (`labbe`)

The Halaa web application — the customer-facing site plus the admin, host, and vendor
dashboards. Built with **Next.js 15 (App Router)** and **React 19**, bilingual (Arabic / English)
with full RTL support.

Part of the [Halaa monorepo](../README.md).

---

## Tech stack

| Area              | Choice                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Framework         | Next.js `15.5.9` (App Router, Turbopack dev)                           |
| UI                | React `19.0.0`                                                          |
| Client state      | Zustand `5`                                                            |
| Server state      | TanStack React Query `5`                                               |
| HTTP client       | Axios (`services/http.js`)                                             |
| Forms / validation| React Hook Form + Zod (schemas shared from `@halla/shared`)            |
| i18n              | i18next + react-i18next + next-i18n-router (`ar` default, `en`, RTL)   |
| Charts            | Chart.js + Recharts                                                    |
| Maps              | `@vis.gl/react-google-maps`                                           |
| Misc              | dnd-kit (drag & drop), Swiper, react-day-picker, qrcode.react / jsqr  |

---

## Prerequisites

- Node.js 20 LTS
- A running [backend API](../labbe-backend-/README.md) (default `http://localhost:8000`)

---

## Getting started

From the monorepo root, dependencies are installed via workspaces:

```bash
npm install                 # run once at the repo root
```

Create `labbe/.env.local` (see [Environment variables](#environment-variables)), then:

```bash
npm run dev -w labbe        # or: cd labbe && npm run dev
```

The app runs at **http://localhost:3000**. The default locale is Arabic, so the root path
redirects to `/ar`.

---

## Scripts

| Script  | Command                          | Description                              |
| ------- | -------------------------------- | ---------------------------------------- |
| `dev`   | `next dev --turbopack`           | Development server (Turbopack)           |
| `build` | `next build`                     | Production build                         |
| `start` | `next start`                     | Serve the production build               |
| `lint`  | `eslint . --max-warnings 100`    | Lint                                     |

---

## Environment variables

Create `labbe/.env.local`:

```bash
# Dev-only: proxy all /api/v2/* through Next.js so HttpOnly auth cookies are stored
# on the same origin as the browser. Remove in production if the API is same-origin via nginx.
BACKEND_PROXY_URL=http://localhost:8000

# API base seen by the client bundle. With the proxy active this stays same-origin.
NEXT_PUBLIC_API_URL=/api/v2

# Server Components call the backend directly (no proxy hop).
INTERNAL_API_URL=http://localhost:8000/api/v2

# Halaa support contact (shown in UI / WhatsApp links)
NEXT_PUBLIC_HALLA_WHATSAPP_NUMBER=966552619282
```

Optional / deployment:

| Variable                  | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_BASE_PATH`   | Asset prefix for non-root deployments                  |
| `NEXT_PUBLIC_BACKEND_URL` | Fallback backend URL (asset base, vendor helpers)      |
| `NEXT_PUBLIC_APP_URL`     | Public app URL (defaults to `https://halaa.com.sa`)    |

> **Why the proxy?** Cookies are HttpOnly and `SameSite`-scoped to an origin. In dev the web
> app (`:3000`) and API (`:8000`) are different origins, so `/api/v2/*` is rewritten through
> Next.js to keep auth cookies on the right origin. In production they're served same-origin.

---

## Project structure

```
labbe/
├── app/              # App Router. Routes are nested under [lang] for i18n.
│   ├── admin-dash/   #   admin / moderator dashboard
│   ├── host/         #   host portal (events, guests, plans)
│   ├── vendor-dashboard/, market-place/, signup-vendor/   # vendor area
│   ├── business/, staff/                                   # business & staff
│   └── invitation/, post-event/, ticket-rating/           # guest-facing flows
├── components/       # Feature components (event-detail, guests, postEvent, shared)
├── ui/               # Reusable UI by domain (admin, auth, host, plans, vendor, layout…)
├── hooks/            # React Query hooks + UI hooks (useDirection, usePageAccess…)
├── providers/        # i18n provider, React Query provider, client translation
├── services/         # http.js (axios), auth, error handling, guest tokens
├── stores/           # Zustand stores (auth, sidebar)
├── utils/            # helpers (schemas, date, contacts, statusColors, xlsx…)
├── localization/     # i18next config + locales (en, ar)
├── config/           # fonts
├── styles/           # design tokens (tokens.web.js)
├── middleware.js     # auth + i18n routing (role-based access)
└── public/           # static assets
```

---

## Key concepts

- **Internationalized routing** — every page lives under `/[lang]`; `ar` is the default and
  renders RTL. Locale files are in `localization/locales/{en,ar}`.
- **Role-based access** — `middleware.js` gates routes by role (super_admin, admin, moderator,
  host, vendor) using the auth cookie.
- **Shared code** — validation schemas, API path constants, and status colors come from
  `@halla/shared` so the web and mobile apps stay in sync.

---

## Building for production

```bash
npm run build -w labbe
npm run start -w labbe      # serves the build (configure env for your API origin)
```
