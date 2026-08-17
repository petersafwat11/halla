# Halaa store-readiness — EXTERNAL steps (owner: you, not code)

> **Expanded execution runbook (2026-06-28):** use
> `docs/store-readiness-EXTERNAL-MCP-RUNBOOK.md` for Claude/MCP execution. The
> original notes below remain useful context but are not complete enough to
> configure production store products or RevenueCat safely.

**Companion to** `docs/store-readiness-SHIP-plan.md` and
`docs/store-readiness-IMPLEMENTATION-STATUS.md`.

These items **cannot be done in code** — they need provider consoles, signed
artifacts, real devices, money/legal, or destructive git history ops. Start the
🔴 items now; they run in parallel with the code work and several **gate the
deploy** of the hardened backend.

Legend: 🔴 do now / blocks deploy · 🟠 before store submission · 🟡 before launch

---

## 1. 🔴 Credential rotation + history purge (SHIP §3.1)

Treat every secret in git history as **compromised** and rotate it.

1. **Rotate at the provider** (revoke old, issue new):
   - AWS access key/secret (IAM user `peterSafwat`) — and review CloudTrail for misuse
   - Gmail app password (`EMAIL_PASSWORD`)
   - Taqnyat API key
   - MongoDB Atlas DB user creds + regenerate the X.509 cert (`certs/mongodb-x509.pem`)
   - `JWT_SECRET` (rotating this logs everyone out — expected)
   - Moyasar keys (currently `sk_test_…`; use live keys for prod)
   - Any RevenueCat / Apple / Google secrets once created (§9.5)
2. **Move values into secret stores**, not files: backend → VPS env / deployment
   secret store; mobile → EAS secrets. Commit only `*.example` files with fake values.
3. **Untrack the live files** (currently tracked — confirmed):
   ```
   git rm --cached labbe-backend-/config.env halla-mobile/.env labbe-backend-/certs/mongodb-x509.pem
   ```
   (`.gitignore` already blocks new copies.) Commit.
4. **Purge history** with `git filter-repo` (or BFG) for those paths, then
   **force-push** — only after notifying every collaborator and CI owner, since
   it rewrites history.
5. **Add CI secret scanning** (e.g. gitleaks) + a pre-commit hook.

**Acceptance:** old creds revoked; provider logs reviewed; `git ls-files` shows
no secret files; full-history scan clean; prod boots from the secret store.

---

## 2. 🔴 Deploy prerequisites for the hardened backend (SHIP §3.2)

The code now fails closed, so **before deploying** the new backend, the
production environment MUST have:

- `WHATSAPP_APP_SECRET` set (Meta Business Manager → WhatsApp app → App Secret).
  Without it, `/messaging/webhook` now **rejects all calls** in production (RSVP
  replies stop). 
- `RATE_LIMIT_ENABLED=true` (currently `false` → all limiters are no-ops).
- `MOYASAR_API_KEY`, `MOYASAR_WEBHOOK_SECRET`, `JWT_SECRET`, `DATABASE`,
  `FRONTEND_URL` present.
- Optional but recommended once rotation is done: `STRICT_CONFIG=true` — makes
  the server **refuse to boot** if any required secret/origin is missing
  (true fail-closed). Verify `GET /health/ready` returns 200 after deploy.
- **UGC terms enforcement — deploy ordering (important):** `UGC_TERMS_ENFORCED`
  defaults **off**. The backend's hard "must accept Terms before commenting /
  uploading media" gate would 403 any client that doesn't call the accept
  endpoint — i.e. older builds in the wild. Sequence: (1) deploy backend with
  the flag OFF, (2) deploy the new **web** build + release the new **mobile**
  build (both record acceptance automatically), (3) once those are the live
  minimum, set `UGC_TERMS_ENFORCED=true`. Deploy web+backend together so live
  guest commenting never breaks. Acceptance is recorded regardless of the flag.

**Acceptance:** forged webhook → 401; rate-limit test → 429; `/health/ready`
200; a deliberately-incomplete staging deploy fails the readiness check.

### 2b. 🔴 Web-app env for deep links (SHIP §5.1)

Set these where the Next.js web app is deployed (Vercel/VPS), or the
`.well-known` files serve non-validating placeholders (the routes now log a
loud error in production):
- `APPLE_APP_ID` = `<TEAM_ID>.com.halla.app` (Apple Developer Team ID)
- `ANDROID_CERT_FINGERPRINT` = SHA-256 from Play App Signing (colon-hex;
  comma-separate upload + Play-signing certs)

Then validate with Apple's AASA validator and Google's Statement List tester.
The password-reset email + universal/app links won't open the app until both
are set.

---

## 3. 🟠 RevenueCat + store product configuration (SHIP §9.5) — Path B

Each plan tier and add-on tier needs its own **store product** (see the SKU
matrix in `docs/store-readiness-IMPLEMENTATION-STATUS.md` once generated, ~30–50
products). Per the D8 decision (max parity):

- Apple: one subscription group for recurring host + business tiers (ordered
  levels); separate **consumable** products for event packages + add-ons.
- Google: matching subscriptions/base plans + consumables.
- RevenueCat: apps, entitlements, offerings, products, webhook auth
  (`REVENUECAT_WEBHOOK_AUTH`), **server secret** for snapshot reconciliation,
  product→plan-code mapping (`REVENUECAT_PRODUCT_PLAN_MAP`),
  production/sandbox separation.
- Complete Apple Paid Apps agreement + tax/banking and Google payments profile
  **before** creating products.
- Promotions: Apple Offer Codes / Google promo codes (mobile has no code box).
- Run the full sandbox matrix (§9.5 / §10).

## 4. 🟠 Signed artifacts + platform checks (SHIP §8.2/8.3)

- iOS: build on **Xcode 26+/iOS 26 SDK** (pinned in `eas.json`); App Store
  Connect upload clean (privacy manifest, required-reason API, entitlements);
  **iPad** device family present + iPad QA (D3 = iPad supported).
- Android: **API 35+**, Play App Signing, **16 KB** page-size test on Android
  15+, Play Billing Library **8+** in the merged manifest, pre-launch report.
- Archive IPA/AAB checksums, commit tag, EAS logs.
- **EAS secrets/config** (code pins `ios.image: latest`): set `SENTRY_AUTH_TOKEN`
  + `SENTRY_ORG` + `SENTRY_PROJECT` (dSYM/source-map upload), `GOOGLE_MAPS_API_KEY`,
  `REVENUECAT_IOS_KEY`/`REVENUECAT_ANDROID_KEY`, `SENTRY_DSN`; fill `eas.json`
  submit Apple identifiers (`appleId`/`ascAppId`/`appleTeamId`) + provide
  `play-service-account.json`; point dev/preview `EXPO_PUBLIC_API_URL` at a
  staging API if one exists; confirm the build log shows Xcode 26+/iOS 26 SDK.

## 5. 🟠 Store console + listings + privacy forms (SHIP §11)

- Apple App Store Connect + Google Play Console: agreements, identity/D-U-N-S,
  package/signing registration, app records.
- Saudi-only availability; age ratings; **App Privacy / Data Safety** generated
  from the final signed inventory (incl. Sentry + RevenueCat/purchase data).
- Screenshots (iPhone + **13″ iPad**; ≥2 Android phone, 4 recommended).
- Reviewer accounts entered in-console + the seeded email/password creds (code
  provides the seed script; you create/enter them).
- `https://halaa.com.sa/<ar|en>/delete-account` as the canonical Data-Safety
  deletion URL (page is built in code; the URL must be live).

## 6. 🟡 Legal / operational (SHIP D5, §6, §7.1)

- **D5 retention matrix:** legal supplies the exact retained fields + reason +
  duration. Code reads this from config — give us the final list.
- **UGC moderation owner + SLA + public contact** (§6) — assign a person and
  publish reachable support contact info.
- Publish AR/EN **Privacy Policy, Terms, Community Rules, Support, Delete
  Account** pages at stable HTTPS URLs.

## 7. 🟡 Final go/no-go evidence packet (SHIP §12)

Assemble the evidence table; second-person review of screenshots/listing/
reviewer creds; staged rollout with Managed Publishing.

---

_Updated as code lands. Code-side status lives in
`docs/store-readiness-IMPLEMENTATION-STATUS.md`._
