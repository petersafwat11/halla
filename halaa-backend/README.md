# Halaa Backend API (`halaa-backend`)

The REST API behind the Halaa web and mobile apps. **Express 4** on **MongoDB / Mongoose 8**,
organized as feature modules under `src/modules`. Serves authentication, events, guests,
subscriptions & payments (Moyasar), messaging (Taqnyat SMS/WhatsApp), the vendor marketplace,
and the admin back office.

Part of the [Halaa monorepo](../README.md).

---

## Tech stack

| Area            | Choice                                                            |
| --------------- | ----------------------------------------------------------------- |
| Runtime / web   | Node.js · Express `4.21.2` (entry `src/server.js`)                |
| Database        | MongoDB (Atlas) · Mongoose `8.9.7`                                |
| Auth            | JWT (`jsonwebtoken`) — access token + rotating refresh tokens     |
| Validation      | **Zod** for request validation; Joi only for env-var validation   |
| Payments        | **Moyasar** (card, Apple Pay, STC Pay, 3-D Secure)                |
| SMS / WhatsApp  | **Taqnyat**                                                        |
| File storage    | **AWS S3** (`@aws-sdk`, multer-s3) + Sharp for image processing    |
| API docs        | Swagger / OpenAPI 3 (`swagger-jsdoc` + `swagger-ui-express`)      |
| Scheduling      | `node-cron` (event lifecycle, reminders, bulk sends)             |
| Observability   | Winston (logs), `prom-client` (Prometheus metrics)               |
| Caching (opt.)  | Redis / ioredis (off by default)                                 |
| Security        | helmet, express-mongo-sanitize, hpp, rate limiting, CORS         |

---

## Prerequisites

- Node.js 20 LTS
- A MongoDB connection string (the project uses MongoDB Atlas)
- Credentials for Moyasar, Taqnyat, and AWS S3 for full functionality

---

## Getting started

From the monorepo root (workspaces install all packages):

```bash
npm install                 # run once at the repo root
```

Create `halaa-backend/.env` (see [Environment variables](#environment-variables)), then:

```bash
npm run dev -w halaa-backend     # or: cd halaa-backend && npm run dev
```

The API listens on **http://localhost:8000** by default.

- Health check: `GET /health`
- API base path: `/api/v2` (legacy `/api` is kept for backward compatibility)
- Swagger UI (development only): `GET /api-docs` · spec JSON: `GET /api-docs.json`

---

## Scripts

| Script                 | Command                                          | Description                       |
| ---------------------- | ------------------------------------------------ | --------------------------------- |
| `dev`                  | `nodemon src/server.js`                          | Dev server with auto-reload       |
| `start`                | `node src/server.js`                             | Production server                 |
| `test`                 | `node --test test/*.test.js`                     | Run the unit tests                |
| `migrate:vendor-copy`  | `node scripts/migrate-vendor-localized-copy.js`  | One example data migration        |

> The `scripts/` directory holds many one-off migration and seeding scripts; run them
> individually with `node scripts/<name>.js` as needed.

---

## Environment variables

Create `halaa-backend/.env`. Required values are marked; the rest have sensible defaults.

```bash
# ── Core ───────────────────────────────────────────────
NODE_ENV=development
PORT=8000
DATABASE=mongodb+srv://...            # (required) MongoDB connection string
# DATABASE_PASSWORD=                  # replaces <PASSWORD> placeholder in the URI, if used
# DATABASE_CERT_PATH=                 # X.509 .pem path for Atlas mTLS, if used

# ── Auth ───────────────────────────────────────────────
JWT_SECRET=change-me-32-chars-min     # (required) 32+ chars
JWT_EXPIRES_IN=15m
# REFRESH_TOKEN_EXPIRES_DAYS=30
# ACCESS_TOKEN_COOKIE_MAX_AGE_MS=900000

# ── URLs ───────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# ── Payments (Moyasar) ─────────────────────────────────
MOYASAR_API_KEY=sk_test_...           # required for live payments (empty = stub/dev mode)
MOYASAR_PUBLISHABLE_KEY=pk_test_...
MOYASAR_BASE_URL=https://api.moyasar.com/v1
MOYASAR_WEBHOOK_SECRET=
# MOYASAR_WEBHOOK_IP_WHITELIST=       # comma-separated; empty = disabled

# ── Messaging (Taqnyat SMS / WhatsApp) ─────────────────
TAQNYAT_API_KEY=
TAQNYAT_SENDER_NAME=HalaaApp
TAQNYAT_BASE_URL=https://api.taqnyat.sa
TAQNYAT_WA_BASE_URL=https://api.taqnyat.sa/wa/v2
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
# WHATSAPP_APP_SECRET=                # HMAC verify (optional)
# TAQNYAT_REMINDER_TEMPLATE_NAME=

# ── File storage (AWS S3) ──────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-north-1
AWS_S3_BUCKET=hallamangement
AWS_S3_BASE_URL=https://hallamangement.s3.eu-north-1.amazonaws.com
# UPLOAD_PATH=./public/uploads        # local fallback
# MAX_FILE_SIZE=5242880

# ── Email (Nodemailer / SMTP) ──────────────────────────
EMAIL_HOST=
EMAIL_PORT=25
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@halaa.sa

# ── Scheduling limits ──────────────────────────────────
# SCHEDULE_MIN_LEAD_HOURS=24
# TRIAL_SCHEDULE_MIN_LEAD_MINUTES=15
# EXPORT_MAX_ROWS=10000

# ── Optional infra ─────────────────────────────────────
# REDIS_ENABLED=false
# REDIS_URL=
# RATE_LIMIT_ENABLED=false
# SMS_COST_SAR=0.15
```

> `.env` is **not** committed. Env vars are validated on boot (`src/config/env.js`); the app
> reads config only through `src/config`, never `process.env` directly elsewhere.

---

## Project structure

```
halaa-backend/
├── src/
│   ├── server.js          # entry: DB connect, cron tasks, graceful shutdown
│   ├── app.js             # Express app: middleware, CORS, routes, error handling
│   ├── config/            # index.js (config), env.js (validation), database.js, swagger.js
│   ├── infrastructure/    # external integrations
│   │   ├── paymentProvider/   #   Moyasar (charge, refund, capture, void, invoice)
│   │   └── taqnyat.js         #   SMS + WhatsApp client
│   ├── modules/           # feature modules (see below)
│   └── shared/            # cross-module utils, middleware (auth, rate limit), error handler
├── models/                # a few top-level Mongoose models
├── scripts/               # migration & seeding scripts
├── test/                  # node:test unit tests
├── certs/                 # MongoDB X.509 cert (if used)
└── public/uploads/        # local upload fallback
```

### Feature modules (`src/modules/`)

`auth`, `users`, `events`, `guests`, `staff`, `subscriptions`, `payments`, `plans`, `addons`,
`messaging`, `notifications`, `dashboard`, `post-event`, `locations`, `vendors`, `services`,
`business`, `admin`, `discounts`, `tickets`, `templates`, `taqnyat-templates`.

Each module typically contains its routes, controller, service, model, and Zod schemas.

---

## API conventions

- **Base path:** `/api/v2`. Versioned; `/api` (v1) kept for compatibility.
- **Auth:** Bearer JWT / HttpOnly cookie; refresh tokens rotate and are tracked server-side.
- **Validation:** every request body is validated with Zod (`validateZod` middleware). Joi is
  reserved for environment validation only.
- **Errors:** a central `AppError` + global error handler return consistent JSON shapes.
- **Docs:** browse the live OpenAPI UI at `/api-docs` in development.

---

## Scheduled jobs

`node-cron` tasks start with the server: event lifecycle transitions, scheduled bulk sends,
24-hour reminders, and Taqnyat template polling. A cron-lease guard prevents duplicate runs
across instances.

---

## Testing

```bash
npm test -w halaa-backend
```

Tests use the built-in Node test runner (`node --test`).
