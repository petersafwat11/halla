# Halaa Guest Check-in (هلا لإدارة دخول الضيوف)

Standalone event guest check-in mini-app for Halaa. Manages guest lists, QR passes, reception gate verification, and attendance reports.

## Architecture

This mini-app is structured as an independent npm workspace containing:
- `contracts/`: Shared schemas, constants, errors, and statistics calculations (`@halaa-checkin/contracts`).
- `api/`: Express REST service (`@halaa-checkin/api`) on port 8100.
- `web/`: Next.js App Router bilingual web application (`@halaa-checkin/web`) on port 3100.
- `design/`: Local design token snapshot (`tokens.css`), provenance audit ledger (`SOURCES.json`), and local assets (Cairo font binaries, Halaa logo).

## Ports & Endpoints

- **Web Service**: `http://localhost:3100`
- **API Service**: `http://localhost:8100`
- **API Prefix**: `/api/checkin/v1`
- Next.js development server proxies `/api/checkin/v1/*` directly to `http://127.0.0.1:8100/api/checkin/v1/*`.

## Quick Start

```bash
# From halaa-checkin/ directory:
npm install

# Check design tokens against source globals.css
npm run design:check

# Run automated tests
npm test

# Run linter
npm run lint

# Build production bundle
npm run build

# Start development services
npm run dev
```

## Design System & Tokens

Visual fidelity is strictly maintained using Halaa's existing design tokens:
- Primary color: `#c28e5c`
- Artboard background: `#f9f4ef`
- Font: Cairo for both Arabic and English to match live client UI.
- All font files are local (SIL Open Font License 1.1) with no external network font fetching.
