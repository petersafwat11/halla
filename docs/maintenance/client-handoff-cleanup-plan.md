# Client GitHub handoff: repository cleanup plan

Prepared 2026-09-16. Planning only: no existing files have been deleted, moved, staged, committed, or pushed during this review.

## Recommendation

Remove generated build output and local tooling artifacts aggressively. Remove runtime uploads and private data from the Git handoff while preserving any needed data outside the source tree. Consolidate historical documentation and one-off tooling. Keep application source, canonical assets, operational runbooks, migrations, and useful regression tests.

Keep the current application folder names for this handoff. Moving everything into `apps/` or renaming legacy component folders would change imports, Docker contexts, Expo/Metro settings, scripts and workflows without materially reducing repository size. Treat that as a separate refactor if wanted later.

Confirmed handoff model: keep two active repositories. `D:/halla` remains the owner's working project, connected to the existing GitHub repository and VPS deployment. Create a complete separate local copy first, clean and organize that copy, then initialize a fresh client repository with only the reviewed deliverables. The client repository receives occasional milestone updates and must not deploy to the owner's VPS.

The original workspace is not an archive to retire. Preserve its useful artifacts, documents, tests and Git history. Clean only verified disposable garbage there after the copy is verified. All broad document/script/test reductions and handoff reorganization in this plan apply to the client copy.

## Confirmed two-repository workflow

Proposed locations (names are suggestions, not directories created by this review):

```text
D:/halla/                         existing owner workspace; existing origin and VPS
D:/halla-client-staging/          full private copy first, then sanitized client workspace
D:/halla-handoff-records/         copy verification, exclusions, path mappings, release records
```

1. **Copy before cleanup.** Stop or identify active writers, then copy the entire current project, including uncommitted edits, new files, useful ignored artifacts and Git metadata, to the separate staging location. First check free disk space: the measured 7.2 GiB of Next output is only part of the footprint; dependencies and `.git` add more. Do not follow external junctions or symlinks recursively. Record skipped links and recreate dependencies as needed. Verify file counts/hashes for source, uncommitted work, assets and important data before deleting anything from the original.
2. **Treat the full copy as private.** It initially contains environment files, credentials, databases/backups or exports and an inherited `.git`. Do not run application/deployment scripts or connect it to the client remote while it is still a raw copy. A local duplicate is a working safeguard, not an off-device disaster-recovery backup.
3. **Protect the original identity.** Leave `D:/halla/.git`, its `origin`, production workflows, registry ownership, VPS secrets and deployment configuration unchanged. Record current source commit and working-tree changes; do not overwrite or drop the pending ticket/custom-design changes.
4. **Create a clean client identity.** In the verified staging path only, remove the copied `.git` before initializing fresh history. Clean private config/runtime data/generated output and organize the deliverable using the plan below. Remove or disable inherited deployment workflows in this copy before adding a client remote. Use app/setup examples and manual deployment instructions so the client has a usable project without access to the owner's server.
5. **Keep local owner cleanup narrow.** Remove reproducible `.next*` builds, caches, log files, bytecode and confirmed disposable screenshots after copy verification and after stopping their writers. Preserve meaningful QA evidence, plans, raw designs and backups in the owner workspace. Removing tracked garbage requires a deliberate owner-repo commit; avoid inadvertently triggering production deployment with unrelated handoff changes.
6. **Validate and publish the client copy.** Run clean-install/build/test checks there, verify its exact Git file list and secret scan, then create the first clean commit. Add only the client's repository as its remote. Push only after the final validation and destination checks; no client push is being performed in this planning task.

### Future milestone updates

- The owner repository remains the engineering source of truth. The client repository is a maintained delivery copy with its own clean, accumulating history.
- Keep an explicit export policy outside the release tree or in maintained tooling: included source folders, excluded artifacts/private files, path mappings, ownership configuration and deleted-file handling.
- At each major milestone, record the owner commit/tag. Prefer committed source milestones so the delivery can be reproduced; if uncommitted changes are intentionally included, record the exact patch/file set.
- Export the allowed source into a temporary staging tree, apply the same path/config transformations, and compare it with the client working tree. Transfer intended deletions as well as additions and changes. Never use an unrestricted mirror command against the client repository or copy the owner's `.git`/env files.
- Preserve client-specific README/setup, remote identity and non-deploying CI configuration. Review any client-side commits before applying the new delivery; do not silently overwrite their work.
- Validate the merged delivery, summarize changes since the previous handoff, and make a normal client commit/PR/tag. Do not reset client history or force-push the owner's branch on subsequent updates.
- Keep a release ledger mapping owner commit/tag to client commit/tag, applied transformations, checks and known limitations. This allows occasional updates without exposing development artifacts or connecting the client repository to production.

## What was checked

- Inventoried filesystem paths, sizes and Git tracking status throughout the project, excluding `.git`, installed `node_modules`, and directory symlinks from the file walk.
- Read root manifests, ignore rules, application package scripts, Dockerfiles, Compose configuration, deployment workflows, and selected operational scripts.
- Traced references to documentation, tests, template sources, generated evidence and runtime data in build/deployment/maintenance tooling.
- Checked tracked filenames for common environment/credential patterns. The matching tracked environment files were examples; this is not a full content or Git-history secret scan.
- Produced `cleanup-inventory.json` with per-file proposed categories. Its classifications are a review aid, not an approved deletion manifest. Application files have not all been individually proven unused.

### Measured findings

| Area | Measured size/count | Meaning |
| --- | --- | --- |
| `halaa-web/.next` and all `.next-*` directories | About 7.2 GiB | Generated, already untracked/ignored. Biggest local disk cleanup. |
| `docs/` | 483 tracked files, 31.47 MiB | Mix of history, current guidance, generated evidence, scripts and operational inputs. |
| `halaa-backend/public/uploads/` | 82 tracked files, 67.62 MiB | Runtime-looking media should not be part of client source; preserve/check before removal. |
| Largest tracked upload | 56.51 MiB MP4 under `uploads/portfolios/` | Dominates removable current-tree media weight. |
| Web tests | 70 tracked files, about 0.24 MiB, plus two new runtime tests | Tiny compared with builds/media. |
| Mobile tests | 111 tracked files, about 0.49 MiB | CI runs them. |
| Check-in root tests | 3 tracked files, about 0.03 MiB | E2E and capacity scripts reference them. Other check-in tests also exist in its packages. |
| Root `.cache/` | About 64 MiB | Local verification artifacts. |
| `.playwright-mcp/` | About 4.8 MiB | Local session artifacts; already ignored. |
| Mobile `.cache`, `.expo`, `dist` | About 153 MiB combined | Reproducible local output; check active processes first. |
| Git object storage | About 559 MiB packed + 31 MiB loose; 68 MiB reported temporary garbage | Separate from the source tree. Current-file deletion does not remove historical blobs. |

Sizes are a point-in-time inventory, not guaranteed post-cleanup savings. Installed dependencies are excluded. Most disk savings will not change the push payload because build directories are already ignored.

## Folder-by-folder decisions for the client copy

These are client-deliverable decisions. In the original workspace, only verified disposable generated files are cleanup targets; retain useful artifacts and history.

| Path | Planned action | Conditions / retained content |
| --- | --- | --- |
| `halaa-web/.next`, `.next-azure-*`, `.next-e2e-*`, `.next-payment-links-*` | Delete generated copies | Stop dev/build/test processes using them first. Keep existing ignore patterns; rebuild as needed. |
| Any app's `.next*`, `.cache`, `.expo`, `dist`, coverage, reports or temporary build output | Delete verified generated content | Check actual purpose rather than assuming every directory with a generic name is disposable. Do not follow junctions. |
| Root `.cache`, `.playwright-mcp`, `qa-evidence`, `*.log`, test invitation image | Delete local artifacts | Preserve any unique handoff evidence outside the repo if needed. |
| `.claude/` | Remove from client repository | Contains tracked `launch.json` and `scheduled_tasks.lock`; document the useful dev command in README. Add ignore rule. |
| `halaa-web/.vscode/` | Remove local settings unless shared setup is intentional | Review its file first; prefer portable root editor configuration if genuinely useful. |
| `node_modules/` at any level | Keep ignored; omit from handoff | No need to uninstall locally merely to push. Validate reproducibility in a separate clean checkout. |
| `.git/` | Preserve existing repository | Never manually delete object files. Any history rewrite is separate from working-tree cleanup. |
| `.github/workflows/` | Keep and adapt for client ownership | Replace fixed registry owner, check branch triggers, gate production deployment, update changed paths and secrets documentation. |
| `data/`, `halaa-checkin/data/`, database backups | Exclude, preserve outside Git | Treat as potentially important runtime/private data. Identify disposable exports separately; do not blanket-delete backups. |
| `halaa-backend/public/uploads/` | Remove runtime files from version control | Back up and check DB/storage references first. Ignore the whole runtime upload tree, with a minimal placeholder only if needed. Preserve files needed by a running local environment. |
| `halaa-backend/certs/`, local env files and service-account files | Exclude from handoff | Retain securely outside Git; provide sanitized examples and instructions. Do not inspect or print secret values in reports. |
| `halaa-backend/src`, `models`, `email` | Keep | Core runtime code. Remove individual dead modules only with import/route/config evidence and tests. |
| `halaa-backend/scripts/` | Classify and consolidate | Keep migrations, backup/recovery, index setup, catalog/legal/privacy generation and operational provider tools. Review debug/repair/seed scripts individually. |
| `halaa-web/app`, `components`, `ui`, `hooks`, `services`, `stores`, `providers`, `utils`, `config`, `localization`, `styles` | Keep | Core app. No broad folder deletions or cosmetic renames during handoff cleanup. |
| `halaa-web/public/` | Audit assets; keep referenced files | Include CSS URLs, dynamic paths, manifests, domain verification files, icons and metadata in reference checks. Large SVGs are optimization candidates, not automatically dead assets. |
| `halaa-web/scripts/` | Keep reusable checks; archive one-off audits | Examples: keep working SEO/pricing/navigation verification; assess whether historical landing audits remain useful. |
| `halaa-mobile/screens`, `components`, `navigation`, `hooks`, `services`, `stores`, `contexts`, `config`, `constants`, `styles`, `utils`, `localization`, `assets` | Keep | Application and shipping assets. Verify dynamic asset loading and Expo config before deleting files. |
| `halaa-mobile/.maestro/` | Keep if visual QA workflow is retained | The manual direction-visual workflow depends on visual-test tooling. Remove workflow/profile references together if retiring it. |
| `halaa-web/__tests__`, `halaa-mobile/__tests__`, backend/shared test folders | Prune selectively | Keep behavior and high-risk regression coverage; remove obsolete, duplicate or implementation-string-only tests when equivalent protection remains. Do not delete whole suites. |
| `halaa-checkin/` | Keep as a separate nested workspace | Has its own lockfile, contracts, API, web, design validation, deployment and CI. It is not disposable test scaffolding. |
| `halaa-checkin/ui-ux-audit-screenshots/` | Delete generated screenshots | Already untracked/ignored. |
| `halaa-checkin/tests/` and package test folders | Keep useful coverage | `test:e2e`, `test:capacity` and CI refer to these paths. Prune only with corresponding script/workflow changes. |
| `halaa-checkin/design/` | Keep canonical design inputs | `design:sync` and `design:check` use this workflow. Review generated duplicates individually. |
| `halaa-checkin/deploy/` | Keep | Backup/restore, capacity rehearsal and independent deployment documentation are operationally relevant. |
| `shared/src`, package export map | Keep | Consumed by web, mobile and backend. Do not remove modules based on only one application's imports. |
| `shared/scripts/` | Keep or relocate with callers | Includes legal/store-metadata verification. |
| `template-cards/` | Keep canonical backgrounds | Backend Dockerfile explicitly copies it; seeding/recovery scripts reference it. Fix stale `labbe` paths in retained scripts. |
| Root `scripts/` | Remove if confirmed empty | Inventory found no regular files; Git does not preserve empty folders anyway. |
| `deploy/`, `docker-compose.yml`, `Caddyfile`, app Dockerfiles | Keep and reconcile | These are active deployment inputs. Keep current paths initially to avoid breaking deployment. |
| Root `deploy-2026-06-21.sh` | Archive/remove after comparison | Historical dated deployment script; retain any unique current procedure in `deploy/README.md`. |
| Root PDFs, DOCX and cutover JPEG | Move to external client/reference archive | Extract unresolved requirements into an issue list before removing the reports from the handoff tree. |
| `docs/__pycache__/...pyc` | Delete and untrack | Confirmed tracked generated Python bytecode. Add `**/__pycache__/` and `**/*.pyc` ignores. |
| Root and application package manifests | Keep | Update scripts whenever their target files move or are removed. |
| Lockfiles | Consolidate after install-path review | Root lockfile for main workspaces, check-in lockfile for its independent workspace. Main-app nested lockfiles are candidates only after clean installs and Docker/EAS checks. |

## Documentation reduction

Keep a concise current reference set instead of hundreds of chronological plans. Proposed final documentation:

```text
docs/
  README.md
  architecture/       # current system boundaries, data flow, shared contracts
  development/        # setup, environment variables, testing, conventions
  operations/         # backups, restores, migrations, incident recovery
  integrations/       # payments, messaging, app-store setup
  release/            # release checks, store metadata guidance, client handoff
```

- `docs/audit`, `docs/modules`, `docs/implementation`, feature-planning and completed rework folders: extract current decisions and open issues; remove superseded planning rounds from the handoff snapshot. Preserve the old repository or an external archive.
- `docs/evidence`: remove historical screenshots, PDFs, transcripts, payload exports and generated reports from the source handoff after extracting any current runbooks and required inputs. Write future generated evidence to an ignored `artifacts/` directory or CI artifacts.
- `docs/store-readiness`: preserve current submission metadata, privacy/data-safety answers and release instructions. Store marketing binaries in a deliberate release-assets location or client asset archive. They are not all disposable screenshots.
- Taqnyat catalogs: select the current authoritative manifests and retain submission-state inputs needed for safe reconciliation; archive superseded versions and document the source of truth.
- Move scripts currently inside `docs/` to the relevant package tooling folder if still useful. Do not keep executable tools hidden among prose documents.

### Known path dependencies that must be migrated together

1. `shared/scripts/validate-aso-metadata.mjs` reads `docs/store-readiness/store-metadata`.
2. `halaa-backend/scripts/submit-business-taqnyat-templates.js` reads/writes the Taqnyat manifest and submission-state JSON under `docs/`.
3. Catalog, legal and privacy generators write generated evidence under `docs/evidence/store-readiness/generated`; inspect their check modes before removing expected output.
4. Provider tooling uses store graphics, screenshots and generated payload locations. Several paths need review for portability, including a hardcoded `d:/halla/...` reference.
5. `halaa-web/scripts/test-business-hub.cjs` writes screenshots to `docs/evidence/business-guest-hub`.
6. Template scripts still reference the former `labbe/public/template-cards` path. Decide whether to repair or retire each script; do not move/delete the canonical assets first.

Proposed destinations: authoritative machine-readable inputs under the owning package's `config/` or a named tooling data directory; generated outputs under ignored `artifacts/`; human procedures under `docs/operations` or `docs/integrations`. Update every caller and test in the same batch.

## Test cleanup policy

The listed web/mobile test folders together occupy less than 1 MiB. Deleting all tests provides little size benefit and weakens client maintenance. Tests are source assets; generated screenshots and reports are build artifacts.

Keep authentication/authorization, tenant isolation, payments/webhooks, invitations/check-in, validation, migrations, Arabic/English behavior and current feature regressions, including the recent ticket media tests.

For each test file, classify it as behavioral regression, contract, required helper/fixture, obsolete feature, duplicate, or historical source-text assertion. Remove obsolete cases and duplicate assertions only after checking remaining coverage. Preserve fixtures/helpers that surviving tests import.

Use clear feature-based names within existing package test roots. Do not rename `__tests__` to `tests` solely for appearance; that requires discovery/glob/import updates without simplifying behavior. Move useful smoke tests out of `docs/implementation` into their owning test suite, then retire historical phase wrappers.

Keep tests in Git but exclude them from production Docker/EAS upload contexts when appropriate. Backend Docker currently copies the whole backend tree, so image contents should be narrowed or ignores refined while retaining operational scripts needed in the image.

## Proposed retained top-level structure

```text
halaa-web/           # app, assets, tests, reusable scripts, Dockerfile, README
halaa-mobile/        # app, assets, tests, Expo/EAS config, README
halaa-backend/       # API, models, emails, tests, operational scripts, Dockerfile
shared/             # shared source, contracts/tests, verification tools
halaa-checkin/       # independent nested workspace and deployment
template-cards/     # canonical seeding/recovery assets, documented
deploy/             # main stack deployment/bootstrap documentation
docs/               # consolidated current reference set
.github/workflows/  # client-adapted CI and controlled deployment
package.json
package-lock.json
docker-compose.yml
Caddyfile
.gitignore
.dockerignore
.easignore
README.md
```

Ignored local-only `artifacts/`, runtime storage, dependencies and builds may still exist on a developer's machine. They should not be included in the client snapshot.

## Execution sequence and checkpoints

### 1. Make and verify the full copy, then establish the client baseline

- Preserve the uncommitted ticket/custom-design implementation and its new files. Record the exact working-tree state before cleanup; do not reset or use broad `git clean -fdx`.
- Complete the full-copy verification described above before cleanup. Record baseline install/build/test results. Begin fresh client Git history only in the sanitized copy; existing failures must be recorded separately from cleanup regressions.
- Convert the inventory proposals into a concrete per-file action manifest with reasons, destination for moves, and dependency notes. Uncertain runtime/data files remain protected.
- Identify running processes that own build/cache directories before removing their output.

### 2. Remove reproducible artifacts

- Delete the verified `.next*`, cache, export, log and screenshot outputs.
- Remove tracked bytecode and local agent/editor metadata.
- Resolve every deletion target inside the explicitly selected workspace. For client cleanup use the verified staging root; for narrow owner garbage cleanup use `D:/halla`. Reject symlinks/junctions or unexpected paths. Use native literal-path deletion, never an unrestricted recursive wildcard over either project.
- Extend ignore rules for Python caches, local tools, runtime uploads and new artifact paths. Inspect `git ls-files` as well as `.gitignore`: ignored files already tracked still need untracking.

### 3. Separate application data and reference material

- Back up tracked runtime uploads before untracking them. Confirm local/production storage is independent and needed template assets are retained.
- Keep secrets, certificates, exports and database backups out of the handoff; store them separately with client setup instructions.
- Move historical reports/design references to the private archive and extract unresolved requirements.

### 4. Consolidate docs, scripts and tests

- Migrate current docs and machine-readable inputs; update exact path references first.
- Classify backend scripts into migrations, maintenance, generation and development seeds. Keep stable paths until caller updates are ready; preserve old-path wrappers temporarily only where externally used.
- Review high-risk one-off scripts such as drop-index, delete, prune, reseed and provider-submission utilities. Document invocation/environment requirements; archive obsolete versions rather than shipping ambiguous tools.
- Prune obsolete tests and phase artifacts while keeping useful regression coverage.
- Audit static assets with route/CSS/config/dynamic-reference checks before deleting candidates.

### 5. Make the repository portable for the client

- Rewrite README from actual configuration: it currently mentions the old `labbe` workspace, omits check-in from the main map, and describes S3 where the current Compose stack uses local persistent uploads.
- Add sanitized backend/mobile environment examples if absent, based on config validation; verify existing web/check-in examples. Include required variables without real values.
- Make installs reproducible: audit nested lockfiles and backend Docker's range-based `npm install`; choose a documented lockfile-based strategy and validate it in clean Linux builds.
- In the client copy only, replace fixed `petersafwat11` deployment examples with documented configurable values. Review default branch names and validation workflow path triggers, including root manifest/lockfile changes. Keep publishing disabled until the client independently configures hosting.
- Keep the client repository non-deploying: remove/disable automatic production deployment and package-publishing workflows in the client copy, retain CI validation and portable manual deployment instructions. Do not supply owner VPS secrets. Leave the existing owner workflow unchanged; it automatically rolls out on matching `master` pushes.
- Review Expo owner/project ID, app-store submission account identifiers, domain verification and service configuration with the client. Transfer/reconfigure ownership deliberately; do not blindly remove live app identifiers.
- Review `.easignore`'s explicit service-account inclusion and document a secure submission workflow. Keep credentials out of Git and avoid shipping unrelated private data in build contexts.
- Ensure the standalone check-in app is excluded from mobile build uploads where unnecessary and all required workspace manifests remain available.

### 6. Validate from clean checkouts

- Main workspace clean dependency install from the selected lockfile.
- Shared lint/tests and applicable legal/catalog/privacy/store-metadata checks after relocation.
- Web lint, retained tests and production build.
- Mobile lint/tests, Expo public config validation and Android production bundle, followed by iOS/Android smoke checks for affected flows.
- Backend isolated-database tests, startup smoke and migration dry-run/integration checks; no live mutations as a cleanup test.
- Check-in clean install, design check, lint, package tests, production build, browser and E2E tests; retain the documented capacity command.
- Build main and check-in Docker images and validate Compose configuration using sanitized test env values. Inspect image/build-context contents for uploads, reports and credentials.
- Scan remaining imports, script paths, package exports, CI paths and documentation links. Check filenames/case on Linux.
- Scan current files and, if retaining history, historical commits for credentials and private artifacts with redacted reporting.

### 7. Prepare the handoff and push

- Provide a final changed-file manifest, before/after tracked size, validation results, current architecture/setup docs and outstanding ownership/setup items.
- Use the confirmed fresh-client-repository approach. Verify the final staged file list explicitly; never push the raw full copy. Client history begins with the cleaned project and accumulates normal milestone commits afterward.
- Preserve the owner's current repository and its history. No owner remote changes, history rewrite or force-push is needed for this handoff.
- Configure the actual client destination and default branch. Check workflows cannot publish to owner registries or target the VPS. Push when requested after validation; the current task is planning only.
- Save the first source-to-client release mapping and the repeatable export policy for future milestone updates.

## Completion criteria

- No build caches, dependencies, bytecode, runtime uploads, private exports, credentials or historical bulk evidence in the delivered source tree.
- No broken imports, fixtures, manifests, CI commands, operational scripts or documentation paths after moves.
- All required assets, migrations, setup examples and recovery procedures retained and documented.
- Current test/build gates pass from a clean checkout, with any pre-existing failures explicitly identified.
- Owner GitHub/VPS linkage is unchanged. Client repository has fresh history, no owner credentials, and no automatic connection to production.
- A repeatable, reviewed milestone-update procedure and source-to-client release mapping are documented.
- Current feature changes remain intact. The production ticket-priority migration is still a separate deployment step, not something cleanup executes.

The two files under `docs/maintenance/` created for this review are working planning artifacts. Keep these in the owner workspace or external handoff records as desired; omit the large working inventory from the client deliverable and include only the concise handoff/setup documentation.
