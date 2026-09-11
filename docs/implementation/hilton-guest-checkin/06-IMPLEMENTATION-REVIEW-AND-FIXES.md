# Implementation review and corrective fixes — 10 September 2026

The previous finalization implementation did **not** close every finding. This review found and repaired remaining defects in authentication, uncertain admissions, camera acquisition, imports, exports, backup/restore, purge and index setup. The previous “F01–F33 implemented / software findings closed” statement is superseded by this report.

Scope: the current `halaa-checkin` working tree, its deployment workflow/runbooks, and the F01–F33 finalization plan, checked against the product/technical/validation planning package. Baseline Git HEAD remains `46895fc2e9acfaba58753b8fa740f3804f934985`. The earlier implementation was already largely uncommitted; this review preserves it and unrelated Halaa work. These results describe the local working tree, not a deployed or clean-checkout release.

## Defects repaired in this review

| Area / original findings | What was still wrong | Correction |
| --- | --- | --- |
| Authentication — F10 | Logout cleared CSRF before sending revocation, so the real server rejected it. Revocation errors were stored but not shown. Old responses could affect a newer login. | Capture the revocation token, hide private UI immediately, send that token explicitly, provide retry feedback, and guard session generations and stale 401 responses. Login installs the authoritative session token. |
| Request transport — F09/F10 | The deadline stopped at response headers; a stalled body could hang. Malformed successful writes could look successful. External abort listeners leaked. PDF downloads bypassed central expiry handling. | Deadline covers body consumption, malformed writes remain uncertain, abort listeners are removed, and authenticated PDF blobs use the same API wrapper. |
| Gate uncertainty — F07/F09/F10 | Cancel/verification/navigation could discard the original operation; the hook ref did not survive reauthentication. A historical replay could display admission after an admin reset. | Volatile intent is scoped by account and event, survives route unmount/reauthentication, and retains the exact payload/UUID. A read of “not admitted” does not discard an unresolved write. Replay re-reads current truth. No uncertainty Cancel action. |
| Gate concurrency / lifecycle — F07–F11 | State locks were updated only after render; duplicate/missing metadata could fabricate counts. Old event/recent/search results and lifecycle snapshots could remain visible. | Synchronous state locks, callback generations, guarded error paths, no cross-event recent placeholder, authoritative duplicate metadata, and version-based choice between resolved and polled event state. |
| Camera — F05/F06 | Stop was disabled while permission was pending; fallback acquisition could start after cancellation. | Stop remains usable during acquisition, generation checks precede fallback, denied permission is not requested twice, and late streams are disposed. Real video attachment and decoding are tested. |
| Event selection — F18 | The invalid-event fallback required a condition that stayed false after a 404. Cached single-event data could survive an access error. | Invalid/inaccessible IDs can fall back; failed single-event data is excluded. Selected events outside the first 100 are independently refreshed. |
| Freshness / dialogs — F11/F17 | Cached stats errors could be hidden; absent stats displayed zeros. Reload guards compared a value with its own captured closure. Old mutations could close another event’s dialog. | Explicit loading/stale/error feedback, live event guards around reload/completion, form error handling, and correction disabled when refreshed data has no admission. |
| CSV — F13/F15 | Pending FileReader/preview/commit callbacks could survive closure or replacement. Unknown commits could lose their body/key. Only the first 100 preview rows were reviewable. 3 MiB transport was insufficient for worst-case JSON escaping of a permitted 2 MiB CSV. | Guard and reset async lifetimes, preserve uncertain import body/key in account/event-scoped memory, show all bounded CSV preview rows including allowances/companion names, and allow bounded JSON overhead only on import endpoints. Decoded CSV limits remain enforced. |
| Export capacity — F19 | Separate global/admin counters could leak on crashes and be decremented twice on completion/expiry. Startup reconciliation raced with new jobs. | A shared queue document is written first in the enqueue transaction; active-job counts and job insertion use that same transaction. Jobs are the capacity ledger. No reservation decrement/reconciliation bookkeeping remains. |
| Export snapshot / purge — F20/F27 | Closing an event alone did not prevent new report jobs or reopening during purge. An export could be inserted against a deleted event snapshot. | Durable `purgingAt` fence, rejection of reopening/new exports, and an event write fence inside export creation. Purge refreshes artifact inventory after fencing and fails on cancellation errors. |
| Worker / storage — F21–F23 | “Health” checked only executable existence, terminal capacity releases were unsafe, failure ownership was incomplete, download path validation used a string prefix, and failed downloads exposed internal renderer text. | Real bounded Chromium launch/connectivity and private-storage write probe, no unsafe counter release paths, attempt ownership predicates, bounded preparation time, strict artifact basename/parent validation, and safe download errors. Repeated expiry removes hidden snapshots and retains expiry metadata until TTL. |
| Export UI / print — F24/F25 | Job retention was not scoped by account, late create responses could attach to another event, history was a fabricated empty query, and print could fire twice. | Account/event-scoped retained job IDs, response context guards, stable mutation reset function, removal of the fake history query, central authenticated downloads, and a single viewer-ready print attempt with manual-viewer fallback. |
| PDF pagination — F32 | A snapshot header outside a full-height A4 sheet split the first sheet. The 1,000-pass export produced 251 pages, including an orphaned footer page. Existing tests checked only PDF size. | Snapshot time is inside each sheet’s reserved footer area. Tests assert exactly two pages for six passes and exactly 250 pages for 1,000 passes. |
| Backup / restore — F26 | Backup emitted canonical EJSON but restore used an incompatible ad hoc parser. Manifest hashes were not checked. Database-tool stderr could expose connection details; restore did not forward TLS configuration. Production instructions wrote backups into ephemeral container storage. | BSON EJSON in both directions, manifest/hash/path verification before restore, rejection of unlisted files, empty backup directories, bounded subprocesses without raw tool output, TLS forwarding, private persistent backup bind mount and executable container commands. |
| Indexes — F28 | `Model.init()` did not create production indexes with `autoIndex:false`. Verification accepted any TTL value or any partial filter and often checked names only. | Explicit collection/index creation for the deployment command; readiness checks schema-declared keys, unique/sparse flags, exact partial filters and TTL values. No destructive index replacement is automatic. |
| Idempotency expiry — F28 | Expired records were treated as absent but still occupied the unique key until the TTL monitor ran, so replacement inserts collided. | Remove the expired occupant within the caller’s transaction before replacement. |
| Version / evidence policy — F29/F33 | CI Node and the Playwright dependency still used broad version declarations. Browser/PDF tests overwrote old evidence, and there was no actual frontend-to-API browser journey. | Pin the already-used Node 24.13.1 / Playwright 1.50.1 declarations, support a separate evidence directory, and add real integrated browser, operational and concurrency regressions. |

## Verification

The automated checks run with Node **24.13.1**, Playwright **1.50.1**, and installed standalone headless Chromium **153.0.8010.12**. The first run using this machine’s default Edge executable failed at browser launch; reruns explicitly set `CHROMIUM_PATH` to the working standalone runtime. This is not proof of the production Debian Chromium build.

| Check | Result |
| --- | --- |
| `npm test` | 137 passing: 41 contract, 69 API/integration, 27 web unit tests |
| `npm --prefix web run test:browser` | 12 passing browser cases across shell, guests, gate and exports |
| `npm run test:e2e` | 2 passing journeys: existing HTTP journey and new real browser → frontend → Express → MongoDB replica set journey |
| `npm run lint` | Pass, no warnings |
| `npm run design:check` | Pass, including provenance hashes, token parity and parent drift checks |
| `npm run build` | Production build passes |
| Queue regression | Eight simultaneous requests accept exactly three for one admin; competing admins stop at ten overall; terminal/expired jobs free capacity without counter cleanup |
| Backup / restore / purge | Actual CLI rehearsal on disposable replica-set databases; EJSON round trip, checksum corruption/unlisted-file rejection, scoped purge, and purge-fence rejection tests pass |
| PDF visual review | Actual PDF pages rasterized with Poppler; inspected single pass, four-up sheet, report and first/middle/last pages of corrected 1,000-pass export |

The new integrated browser test uses real cookies, CSRF, API DTOs, database writes and a same-origin HTTP proxy. It covers first-event creation, lifecycle opening, guest creation, CSV preview/commit, a selected event beyond the first 100, actual camera MediaStream attachment and QR decoding, cancelling pending camera acquisition, committed-but-lost admission response, a later admin reset, verification without discarding uncertain intent, session expiry/reauthentication, exact-key replay, and real logout revocation. Fault injection discards only the admission response after the real server processes it.

The old export browser test assumed panel closure discarded a ready job. It now verifies that reopening resumes it and explicitly starts a new export before testing expiry. The initial failure and corrected expectation are not treated as a production defect.

A later camera regression rerun exposed an unreliable synthetic canvas frame: the stream was live, but its updated QR image was not reliably delivered. The fixture now disables image smoothing and explicitly requests the updated frame; two consecutive integrated reruns then passed. Failed-run diagnostics are retained alongside passing logs. Companion stepper accessibility labels and blocked-print fallback feedback were also localized in both languages.

### Local capacity result

Final corrected run: **1,000 invitations → 250 A4 sheets**, **39,159 ms**, **11,176,224 bytes**, while **two reception sessions completed 200 admissions**. Combined preview-plus-admission p95: **541 ms**; maximum: **2,386 ms**. The local rehearsal budgets were export <90 seconds and combined p95 <1.5 seconds. The maximum is reported rather than hidden behind the percentile.

This uses an isolated database and an unthrottled test configuration. It does not certify production rate limiting, VPS CPU/RAM limits, printer quality or real-device camera performance. The full container report-load/forced-kill/resource-budget matrix remains a release verification task.

## F01–F33 disposition

| Findings | Disposition |
| --- | --- |
| F01–F04 | Prior repairs retained; source-ignore behavior and unit/build/browser ordering checked; actual session and first-event flow exercised. A committed clean-checkout/image release still needs validation. |
| F05–F11 | Additional defects repaired as above. Camera, real session expiry, original-key replay and admin-reset reconciliation exercised. |
| F12–F18 | Prior notice/header/reference fixes retained; further CSV, stale-dialog, freshness and event-selection defects repaired. Guest/import browser flows pass. |
| F19–F23 | Queue enforcement replaced with transaction serialization; worker/download/purge protections strengthened. Replica-set/PDF regression suites pass. |
| F24–F25 | Export retention, lifecycle and authenticated download/print behavior repaired; browser suite passes. Physical printer/native-viewer behavior still requires release-device checks. |
| F26–F28 | Operational defects repaired and EJSON CLI rehearsal, scoped purge, exact indexes and TTL-lag regression tested. BSON-tool/production TLS execution remains unverified locally. |
| F29–F31 | Version declarations tightened, focus/localization/provenance changes retained and browser/design checks pass. No blanket fresh AA/AAA contrast certification is claimed. |
| F32 | Additional pagination defect fixed; 1,000-pass local load and actual PDF sample inspection completed. Full maximum-length bilingual PDF matrix, full-report concurrent load, container CPU/RSS and forced-process-kill release evidence remain. |
| F33 | Real integrated browser journey and regression coverage now exist and pass. This report replaces unconditional completion claims. |

## Remaining release verification

1. Commit the intended check-in application, exports source, tests and workflow together; validate a clean checkout and the exact immutable API/web images. Docker was unavailable in this environment, so no rebuilt image or production deployment was certified.
2. Run the BSON `mongodump`/`mongorestore` branch with the production TLS configuration and an isolated target. Those binaries were unavailable here; the EJSON fallback was executed successfully. Establish the documented restore fixture: live event, pending and admitted guest, and audit history.
3. Finish the F32 matrix on the release images with their configured CPU/RAM limits, full attendance report load and forced worker interruption. Preserve all measured failures as well as passes.
4. Complete A28/A30: approved host/network/deployment settings and a real two-device/printer/scanner rehearsal, backup connectivity, production backup/restore and rollback evidence. None is inferred from local test success.

Uncertain admission/import intent is deliberately volatile and account/event scoped. It survives client navigation and reauthentication, but not a full browser reload or device loss. After that kind of loss, reconcile authoritative records before creating another operation; do not interpret missing local state as proof a write failed.

New logs, PDF samples, screenshots and capacity measurements are under `docs/evidence/hilton-guest-checkin/review-2026-09-10/`. Historical evidence was not overwritten by this review’s test runs.
