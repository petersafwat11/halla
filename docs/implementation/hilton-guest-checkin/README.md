# Halaa Guest Check-in — implementation handoff

Prepared: 8 September 2026. Updated: 10 September 2026.
The independent review found and repaired defects remaining after the F01–F33 implementation.
Read [06-IMPLEMENTATION-REVIEW-AND-FIXES.md](06-IMPLEMENTATION-REVIEW-AND-FIXES.md)
for verified local results and remaining release/device verification. Earlier completion
claims are historical; they are not production certification.

Build a small, standalone Halaa application for the Hilton Riyadh demonstration: manage a guest list, deliver printable QR invitations, admit guests at the gate, and export attendance. It must look like the existing Halaa frontend and run alongside it on the same VPS.

This package is written for implementation in short Gemini sessions. Decisions and contracts are fixed so each session can complete one bounded task without redesigning the application.

## Read in this order

| File | Purpose |
| --- | --- |
| [GEMINI_START_HERE.md](GEMINI_START_HERE.md) | Copyable instruction for Gemini and session rules |
| [01-PRODUCT-AND-DESIGN.md](01-PRODUCT-AND-DESIGN.md) | Scope, workflows, exact Halaa design references, screen requirements |
| [02-TECHNICAL-CONTRACT.md](02-TECHNICAL-CONTRACT.md) | Architecture, data model, permissions, API, concurrency, exports |
| [03-IMPLEMENTATION-STEPS.md](03-IMPLEMENTATION-STEPS.md) | Ordered tasks, files, boundaries, tests, completion gates |
| [04-VALIDATION-AND-DEPLOYMENT.md](04-VALIDATION-AND-DEPLOYMENT.md) | Acceptance matrix, same-VPS rollout, rollback, demo script |
| [PROGRESS.md](PROGRESS.md) | Persistent handoff ledger; update after every implementation session |

If requirements conflict, the user's newest instruction wins, followed by the technical contract, product/design contract, then task instructions. Record any contract change before coding dependent work. Do not silently select a different architecture.

## Fixed decisions

- Product identity: **Halaa Guest Check-in / هلا لإدارة دخول الضيوف**. Hilton Riyadh is event/venue context, not a new application brand.
- Two main work screens: **Guests** and **Gate**. Login is a supporting route; event setup, imports, and reports are dialogs/panels.
- English and Arabic, including RTL and Arabic-capable PDFs.
- Next.js App Router frontend; Express REST backend; separate MongoDB database and credentials. No Halaa guest, user, event, or billing collections are reused.
- Independent `halaa-checkin/` package tree, lockfile, Docker Compose project, images, cookies, secrets, and data directory. Do not add it to the existing root npm workspaces.
- Existing Halaa CSS custom properties and component styling define the visual language. No blue/gold Hilton redesign, new UI kit, or unrelated theme.
- One administrator and two individually identified reception users for the demo. Production has no bundled/default passwords.
- An invitation admits the named guest and an allowed number of companions. Companion names are optional; actual companion attendance is a count.
- A scan previews the invitation. A separate confirmation records admission. Repeated/concurrent admission cannot increment attendance twice.
- CSV import is included. Native Excel/XLSX import is deferred; users can save a sheet as UTF-8 CSV.
- Single and bulk QR PDFs, plus an attendance PDF with attended/not-attended lists. No RSVP, messaging, or public guest website.
- Initial acceptance envelope: **1,000 active invitations/event, up to 20 companions/invitation, two simultaneous gate devices**. Larger events require a measured capacity review, not a hidden limit increase.
- Deployment artifacts are implemented and rehearsed first. The final hostname, VPS resource headroom, database credentials, and real-device gate test are deployment prerequisites, not assumed facts.

## What is grounded in the repository

Inspected sources: `halaa-web/styles/tokens.web.js`, `halaa-web/app/[lang]/globals.css`, `halaa-web/app/[lang]/fonts.js`, `halaa-web/app/[lang]/layout.js`, the button/table/popup/layout files listed in the design document, `halaa-web/package.json`, `halaa-backend/package.json`, root `package.json`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/deploy.yml`, and `deploy/README.md`.

The existing deployment uses Docker, Caddy, Next.js, Express, and managed MongoDB Atlas. The existing deploy workflow replaces root Compose/Caddy configuration and runs `--remove-orphans`; adding this app casually to that stack would risk deployment coupling. The deployment plan explicitly handles this.

The working tree already contains substantial unrelated edits. This planning task changed no application files. Gemini must preserve those edits and keep its own changes scoped.

## Completion language

Do not say “100% working” because a build passes. Use these distinct milestones:

1. **Implemented:** scope and automated tests complete.
2. **Demo verified locally:** end-to-end flows, Arabic/English screenshots, PDFs, persistence, and concurrent-device tests evidenced.
3. **Deployed:** verified HTTPS hostname, isolated credentials/data, health checks, rollback and restore rehearsal.
4. **Gate ready:** both actual reception devices and backup connectivity tested on the deployed application.

Reception staff recruitment, devices, connectivity procurement, and hotel arrangements remain operational work outside the software implementation.
