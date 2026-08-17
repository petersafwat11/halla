# Halaa store readiness — FINAL GO / NO-GO (independent Session-10 audit)

**Verdict:** `NO_GO`
**Audited by:** Independent Session-10 reviewer (no stake in Sessions 0–9)
**Audit date:** 2026-07-02
**Repo state:** `master`, working tree clean, HEAD `214bbfd1`
**Method:** Re-ran every gate independently, opened the last-changed test seam, verified the SEC-01 secret exposure by git, and confirmed the four release-gating conditions. Evidence — not status labels — drives every line below.

> This verdict is **overdetermined**: at least six *independent* mandatory gates are unmet, each alone sufficient for NO_GO. The engineering work committed in Sessions 1–9 is genuine and independently re-verified green; the NO_GO is entirely about **owner-gated external steps that were never executed** (they cannot be executed in this environment) plus a **live secret-exposure blocker**.

---

## 1. Gate results — re-run independently (my numbers, not transcribed)

| Gate | Command | Result | Status |
|---|---|---|---|
| Backend unit+integration | `cd labbe-backend- && npm test` | **235 tests / 235 pass / 0 fail** (18.6 s) | PASS |
| Catalog drift + contracts | `npm run catalog:verify` | **26 / 26**, drift-clean | PASS |
| Legal parity/version/URL | `npm run legal:verify` | **16 / 16** | PASS |
| Payment static checks | `MOYASAR_API_KEY=dummy node scripts/static-checks-payments.js` | **18 / 18 OK** | PASS |
| Web lint | `cd labbe && npm run lint` | **0 errors** / 34 pre-existing warnings | PASS |
| Web production build | `cd labbe && npm run build` | **exit 0** — sitemap/robots/manifest/icons/OG + 6 legal routes all emit | PASS |
| Mobile tests | `cd halla-mobile && npm test` | **33 / 33 pass** | PASS |
| Mobile lint | `cd halla-mobile && npm run lint` | **exit 0** (`--max-warnings 0`) | PASS |
| Shared lint | `cd shared && npm run lint` | **exit 0** (`--max-warnings 0`) | PASS |

**Zero catalog drift, zero legal drift.** All in-repo automated gates are green. Backend landed at exactly the expected ~235 (231 prior + 4 from the HEAD commit `214bbfd1`, which added `event-firstsend-consume.integration.test.js`).

**Last-changed seam verified (not taken on faith):** `214bbfd1` claims to close the Session-9 `SBX-EVT-03` "untested first-send consume trigger" gap. I opened both `test/event-firstsend-consume.integration.test.js` and the trigger at `src/modules/messaging/messaging.send.service.js:307-314`. The test drives the **real** `sendToGuest` SMS path against a real dispatch-policy graph (active host + active pool subscription + non-terminal event) — not a bypass — and Case 1 asserts the exact `firstSendAt` stamp AND the linked `EventEntitlement` flip `unused → consumed` AND the `hasUnused → null` guard release; Cases 2–4 assert no-re-consume, subscription isolation, and already-consumed immutability. The claim is genuine, not aspirational. (The real store round-trip for this row remains device-only, as the matrix states.)

---

## 2. SEC-01 — live secret exposure (release-blocking, verified by git)

**Three secret-bearing files are git-tracked, contain real credential material, and are present in deep history.** All three are "tracked-before-ignore": a `.gitignore` rule now covers each, but git keeps tracking a file that was committed before the rule existed, so the secrets remain recoverable from **any clone and the full history**. `git rm --cached` alone is insufficient — the values must be treated as **compromised** and rotated.

| File | Tracked? (`git ls-files`) | Ignore rule present? (`git check-ignore -v --no-index`) | Sensitive content (labels only — no values printed) |
|---|---|---|---|
| `labbe-backend-/config.env` | **YES** | YES (`labbe-backend-/.gitignore:12 *.env`) | `DATABASE` (SRV+password, 60 ch), `DATABASE_PASSWORD`, `JWT_SECRET` (130 ch), `AWS_ACCESS_KEY_ID` (22 ch), `AWS_SECRET_ACCESS_KEY` (42 ch), `MOYASAR_API_KEY` (50 ch), `MOYASAR_WEBHOOK_SECRET` (66 ch), `TAQNYAT_API_KEY` (34 ch), `EMAIL_PASSWORD` (18 ch) |
| `labbe-backend-/certs/mongodb-x509.pem` | **YES** | YES (`labbe-backend-/.gitignore:14 certs/`; also `:15 *.pem`, root `:55 **/*.pem`) | Real X.509 client cert — contains a `BEGIN PRIVATE KEY` block (MongoDB Atlas auth private key) |
| `halla-mobile/.env` | **YES** | YES (`labbe-backend-/.gitignore` root `**/.env`) | Only `EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER` — **public config, NOT a secret** |

**In history:** `config.env` first added in `1462526a`; both `config.env` and `halla-mobile/.env` appear across 30+ commits; the cert has history. **No secret VALUE was printed** in this audit — only key names and byte-lengths.

**Runbook completeness gap found:** `SEC-01-OWNER-RUNBOOK.md` §1 inventory table lists only `config.env` and `halla-mobile/.env` — it **omits `certs/mongodb-x509.pem` from the inventory table and from the §4 purge commands** (both `git filter-repo`/BFG examples purge only `config.env` and `.env`). Rotation step 1 mentions "and the DB cert if tracked" parenthetically, but an owner following §4 literally would **rotate the DB credential yet leave the cert's private key in history forever.** This must be corrected before execution (delta specified in §5 below). This is an evidence/runbook fix, not a new blocker beyond SEC-01 itself.

**Evidence & metadata are secret-free:** a credential-value sweep across `docs/evidence/**` and `docs/store-readiness/store-metadata/**` returned only placeholders (`APPLE_API_KEY_ID = <BLOCKED, masked>`). Reviewer credentials are **env-only**: `scripts/seedReviewerAccounts.js` reads `REVIEWER_*_PASSWORD` from `process.env` with **no defaults** and fails closed; `reviewer-notes.md` explicitly instructs "do NOT paste credentials into" the repo. **No hardcoded reviewer password exists anywhere.**

---

## 3. Requirement → evidence summary (SHIP-plan + every P0/P1)

Full per-task ledger is in `docs/store-readiness-CORRECTIVE-STATUS.md` (the table at lines 463–524, re-verified against source). Roll-up:

| Bucket | Count | Meaning |
|---|---|---|
| **DONE — code complete + committed + gate-verified** | **27** | Every implementation task: CAT-01/02/03/04, BILL-01…10, EVT-01/02, ADD-01/02/03, MOB-01/02/03/04, DEL-01/02/03, UGC-01/02/03/04, LEG-01/02/03, SEO-01/02/03, ASO-01, REV-01, CFG-07, MCP-01(report half). Each maps to a named committed test / build / static-check that I re-ran green. |
| **BLOCKED_NEEDS_OWNER — external step never executed** | **13** | SEC-01, ART-IOS, ART-AND, MCP-02, MCP-03, MCP-04, MCP-05, QA-BILL, QA-RC, ASO-02, GO-01, GO-02, plus all legal-copy/contact approvals (all 12 legal docs + `contact.js`). Design/runbook is complete; **execution requires credentials/devices/console/owner-signoff not present in-repo.** |
| **OPEN DEFECT (failing gate / wrong behavior)** | **0** | No P0/P1 is in a failing state. Every one of the 14 P0 + 8 P1 findings is either verified-in-code-and-committed or BLOCKED_NEEDS_OWNER. |

**All 22 review findings resolved-or-blocked, none failing:** P0-01→PRICE-OWNER/CAT-01 (six-tier frozen); P0-02→exact reconcile; P0-03→preflight+EVT-02; P0-04/05/06→reducer branches; P0-07→replacement modes; P0-08/09→fail-closed scoped snapshot; P0-10/11→unique-txn add-on fulfillment/reversal; P0-12→exact-code business self-serve; P0-13→store-only price (catalog omits price by construction); P0-14→strict readiness. P1-01→REV-01; P1-02→retryable truthful deletion; P1-03→live legal routes; P1-04→UGC gates; P1-05→upload scan; P1-06/07→shared legal package; P1-08→TopBar rewrite. I re-ran the gates that lock these and spot-verified the EVT-02 seam; I did **not** re-open all 22 tests (proportionate: gates green + test-name citations + one seam confirmed).

---

## 4. Release-gating conditions — four checked, three unmet

| Condition | Required | Actual (verified) | Verdict |
|---|---|---|---|
| Zero open P0/P1 | 0 open | 0 open (all resolved-or-blocked) | **MET** |
| Zero console/catalog drift | 0 | `catalog:verify` 26 drift-clean; `legal:verify` 16 | **MET** (in-repo) |
| Signed legal/privacy approvals | ≥ the mandatory set signed | **0 signed** — all 12 legal docs `ownerApproval: BLOCKED_NEEDS_OWNER`; `contact.js` every field `approved:false` (entity name, support email, phone, address, SLAs all conflicting/unconfirmed) | **UNMET** |
| Working reviewer accounts (REV-01) | Seeded + smoke-passed on a real DB | Script correct + fails-closed, but **never run** (no DB; shared-staging cluster is prod-shared, deliberately untouched) — `IMPLEMENTED_UNVERIFIED` | **UNMET** |
| Passed mandatory sandbox QA rows | 60 of 60 executed on device | **0 of 60 executed** — `SANDBOX-QA-MATRIX.md` has 60 authored rows; every execution field (tester/date/txn/RC event/actual) is **blank**; no PASS/FAIL verdict anywhere | **UNMET** |
| SEC-01 secret-free repo/history | No tracked secrets, none in history | **3 tracked secret-bearing files, all in history** (§2) | **UNMET** |

---

## 5. NO_GO blockers + exact ORDERED owner-action sequence

The following must ALL be executed and evidenced before any submission-approval verdict is possible. **Order matters** (SEC-01 rotation is first and unconditional; each subsequent gate depends on artifacts from the prior).

**B1 — SEC-01: rotate → untrack → purge → prevent recurrence.** *(Rotation is the real remediation; anything ever committed is compromised regardless of purge — any prior clone already holds it. Purge/gitignore/scanning are hygiene that FOLLOW rotation, not substitutes.)*
   1. **Rotate every credential** ever committed (per `SEC-01-OWNER-RUNBOOK.md` §2), treating all as compromised: MongoDB Atlas DB user/password **+ regenerate the X.509 client cert** (`mongodb-x509.pem`), Moyasar API key + webhook secret, RevenueCat webhook auth + REST key, AWS IAM access-key pair, Taqnyat/WhatsApp/email tokens, `JWT_SECRET` (forces re-login). Move all to the platform secret store / EAS secrets; verify the VPS boots against the new values from a non-tracked source.
   2. **Untrack**: `git rm --cached labbe-backend-/config.env halla-mobile/.env labbe-backend-/certs/mongodb-x509.pem` (all three; keep working-tree copies), commit.
   3. **Purge history** (`git filter-repo --invert-paths`) with **all three paths** — `config.env`, `halla-mobile/.env`, **and `labbe-backend-/certs/mongodb-x509.pem`** (the runbook §4 currently omits the cert — add it), then force-push; all collaborators re-clone; purge fork/PR/CI caches.
   4. **Prevent recurrence**: enable `gitleaks`/`git-secrets` in pre-commit + CI (after rotation, so it doesn't trip on pre-existing history). *(Also correct `SEC-01-OWNER-RUNBOOK.md` §1 to list the cert.)*

**B2 — Legal / privacy / contact copy signoff.** Owner + legal resolve and sign every `BLOCKED_NEEDS_OWNER` block: single legal entity name (2 conflicting today), support email (`.net` vs `.com.sa` conflict), phone/WhatsApp, postal address, response SLAs, retention durations, refund wording, jurisdiction — plus the carried-over privacy/terms/refund. Flip each `ownerApproval`/`approved` flag; re-run `legal:verify`; sign `RETENTION_MATRIX_FINALIZED` (gates DEL-01).

**B3 — Signed IPA/AAB + artifact inspection (ART-IOS, ART-AND).** With Apple Developer + ASC API key + Play Console + service-account + EAS + macOS/Xcode: produce signed release builds; inspect per `SIGNED-BUILD-RUNBOOK.md` — iOS aggregated privacy manifest / required-reason APIs, entitlements/associated-domains/signing (`codesign`); Android 16 KB page size / 64-bit / `targetSdk 35` / bundled Play Billing version (verify in AAB), prelaunch report. Replace the `eas.json` `REPLACE_WITH_*` iOS IDs with real owner values.

**B4 — Provider console configuration + zero-drift readback (MCP-02/03/04/05).** With authenticated Apple / Google Play / RevenueCat / EAS (no provider MCP exists or is registrable — all manual): create the app records + agreements/tax/banking, then the products per `PROVIDER-CONFIG-RUNBOOK.md` (Apple 40 consumables + 14 subs in one subscription group; Google 14 subs+base-plan + 40 inapp; RevenueCat 54 products, 4 offerings 24/8/21/1, **one entitlement `recurring_access` on ONLY the 14 subs**, two-hop ASSN+RTDN→RC→backend webhook, transfer=Keep-with-original). Export console state and run the §8 zero-drift diff — assert per-product `console_entitlement == manifest.revenueCatEntitlementId` (⇒ exactly 14 subs carry it, 0 consumables).

**B5 — Real sandbox + release-candidate QA execution (QA-BILL, QA-RC).** Execute all **60** `SANDBOX-QA-MATRIX.md` rows on real iPhone/iPad/Android phone+tablet with Apple Sandbox / Google license-test accounts (dashboard "test events" are NOT a substitute). Capture the §0.2 evidence set per row (store txn id, RC event/customer/product, backend record + before/after quota, device/build, screenshot, expected-vs-actual). Special attention to the 3 genuine device-only-first-verification rows: `SBX-OFR-01` (offers), `FUNC-07` (push), `SBX-EVT-03` (first-send trigger — backend now tested, real round-trip still device-only).

**B6 — Reviewer accounts seed + smoke (REV-01).** Run `seedReviewerAccounts.js` against the (rotated) DB with env-supplied passwords; confirm the scripted smoke login passes for personal-host, business-host, and vendor; place credentials only in ASC "App Review Information" / Play "App access" at submission.

**B7 — Screenshot assets (ASO-02).** Capture AR/EN device screenshots from the B3 signed builds per `screenshot-brief.md`.

**B8 — Second-person evidence review, then submission (GO-01, GO-02).** With B1–B7 evidenced, a second reviewer signs the packet; only then submit to App Store / Google review with **Managed Publishing ON**, staged rollout, tested rollback, refund-support + moderation/on-call runbooks live, and monitoring (Sentry release/dist) wired.

---

## 6. Residual risks (carried forward — honestly disclosed by the sessions, not compressed away)

- **S3 `DeleteObject` capability is unprovable without live creds.** Account-deletion completeness depends on it; the documented explicit Deny is on `s3:GetObject` (read), and `DeleteObjectCommand` is already used in prod (circumstantial). The deletion design is **fail-closed safe** either way (Delete denied ⇒ `pending_retry`, never a false `completed`) — but confirm with live creds before GO.
- **Metro bundling of `@halla/shared/legal` never exercised** on-device (mobile tests read the JSON via `fs`; proven-by-precedent, not by a real Metro bundle). Web bundling IS proven (build + render).
- **Live `GET /plans` DB parity not run (CAT-02).** Source/seed parity is proven statically; the live API serves whatever the shared cluster was last seeded — confirm read-only before GO.
- **UGC-03 anonymous-marketplace viewer-block filtering deferred** (documented in `UGC-ROUTE-INVENTORY.md`) — blocked actors are filtered on authenticated post-event reads and suspended vendors excluded from public reads, but per-viewer block filtering on the anonymous marketplace read is not yet threaded.
- **On-device / iPad visual QA not performed** for the mobile legal/TopBar rework (LEG-02) or non-legal TopBar callers — lint/compile + widest-prop-pattern walk only.

---

## 7. Verdict

Every in-repo engineering gate is green and independently re-verified; the committed code is real and the status documentation is unusually honest (no label I checked was inflated). But store submission is gated on **external steps that were never executed and cannot be executed in this environment** — signed builds, provider console config + zero-drift readback, real-device sandbox matrix (0/60 rows run), legal-copy signoff (0 signed), reviewer-account seed+smoke — **plus a live secret-exposure blocker** (three tracked secret-bearing files, in history, requiring rotation + purge). Any one of these is disqualifying; all are open.

**FINAL VERDICT: `NO_GO`.**

Path to `READY_FOR_OWNER_SUBMISSION_APPROVAL`: execute B1→B8 in order, evidencing each in-repo, then re-run this audit.

---

## 8. Coordinator sign-off (2026-07-02)

The lead coordinator accepts this independent audit and its `NO_GO` verdict, with three reconciliations for the record:

- **Runbook cert gap (§2, §5-B1) is now FIXED — in the same commit as this report (`47ab2dfc`).** §2/§5 preserve the audit's *original* finding (the runbook omitted `certs/mongodb-x509.pem`); that omission has since been corrected — `SEC-01-OWNER-RUNBOOK.md` §1 inventory, §2 rotation (regenerate + revoke the X.509 cert), §3 untrack, and BOTH §4 purge commands (`git filter-repo` + BFG) now include the cert. So the audit's "must be corrected" is satisfied; no open runbook gap remains. The cert itself is still tracked-in-history → SEC-01 rotation/purge (B1) is still required.
- **Shape of the coordinator review (so "coordinator-verified" is calibrated honestly).** Each of Sessions 3–9 was reviewed **risk-weighted**, not as a literal line-by-line read of all ~200 changed files: deep on the payment-authorization / reconcile / deletion / secret-handling paths, plus independent re-runs of every gate, scope/secret scans on every commit, and adversarial checks on the highest-risk logic (e.g. the event-fallback invariant, the truthful-deletion state machine, the default-deny SEO policy). Two real defects were found and closed this way (an untested reconcile fallback → `revenuecat-event-fallback.test.js`; an untested first-send consume trigger → `event-firstsend-consume.integration.test.js`), and this independent audit caught a third (the tracked cert). Lower-risk UI/wiring/i18n/doc changes were verified via passing gates + targeted spot-checks, not exhaustive reading.
- **Git state.** 12 commits sit on local `master`, **UNPUSHED** (origin is 12 behind). Pushing is the owner's decision and is **not** required to act on this report — and critically, **pushing does not affect SEC-01**: the secrets are already in origin's history (`config.env` since `1462526a`), so credential **rotation** is the only remedy whether or not these local commits are pushed. No push, PR, submission, publish, release, credential rotation, or history rewrite was performed by this run.
