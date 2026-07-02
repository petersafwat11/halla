# SEC-01 — secret rotation + history-purge runbook (OWNER-ONLY)

**Status:** `BLOCKED_NEEDS_OWNER` · **Assessed:** 2026-07-02 · **Scope:** Session 4.

> **This runbook contains NO secret values.** It documents the tracking status and the exact
> owner-gated steps to rotate credentials and purge git history. Session 4 deliberately did
> **NOT** rotate any credential, did **NOT** run `git rm --cached` on the tracked secret
> files, and did **NOT** rewrite history — all three are OWNER-GATED and can break production
> deploy (the backend reads the tracked `config.env` to boot: `MOYASAR_API_KEY`, `DATABASE`,
> etc.). Execute this only with the owner, on a coordinated maintenance window, with a tested
> rollback.

## 1. Tracking status (verified, read-only)

Both files are **git-tracked** and contain real secrets (pre-existing — not introduced by
this work):

| File | Tracked? | In `.gitignore`? | Meaning |
|---|---|---|---|
| `labbe-backend-/config.env` | **YES** (`git ls-files`) | YES (`.gitignore:11`, `*.env`) | Tracked BEFORE it was gitignored; `.gitignore` does **not** untrack an already-committed file. Present in history. |
| `halla-mobile/.env` | **YES** (`git ls-files`) | YES (root `.gitignore:52`) | Same — tracked + ignored; present in history. |

`config.env.example` (secret-free template) is correctly kept via `!config.env.example`.
Because the live files are committed, their secrets are recoverable from **any clone and the
full history** — rotation is mandatory, and untracking-without-rotation is insufficient.

## 2. Rotation order (rotate BEFORE purge)

Rotate every credential that has ever been in a committed `config.env` / `.env`. Assume all
are compromised. Provider-by-provider (do NOT paste any value into this doc, evidence, chat,
or a commit):

1. **Database (MongoDB Atlas)** — create a new DB user / rotate the password (and the DB
   cert if tracked); update the deploy secret store; verify the VPS boots against the new
   creds; then delete the old user. (Note: `halaa-staging` is shared local+prod — coordinate.)
2. **Moyasar** — roll the API key(s) in the Moyasar dashboard; update the backend secret;
   confirm a test payment + webhook still authenticate.
3. **RevenueCat** — rotate the webhook auth value + any REST API key; update
   `REVENUECAT_WEBHOOK_AUTH` and the API key in the backend secret; re-verify webhook auth.
4. **AWS/S3** — rotate the IAM user's access key pair; update backend secrets; verify
   upload + delete still work; deactivate then delete the old key.
5. **Messaging (Taqnyat / Meta-WhatsApp) + email/SMS providers** — rotate API keys/tokens;
   update secrets; send a test message.
6. **JWT / session secrets** — rotate `JWT_SECRET` (and refresh secret). NOTE: rotating
   invalidates all existing sessions — expected; communicate the forced re-login.
7. **Sentry DSN / any push (FCM/APNs) keys** — rotate/replace; update secrets.
8. **Mobile `.env`** — any client-exposed keys that are actually secret must be rotated and
   moved to build-time secrets (EAS secrets), not committed. Truly public config can stay,
   but re-issue anything sensitive.

After rotation, the exposed history values are dead even if history is not yet purged
(defense first, cleanup second).

## 3. Untrack the files (owner-gated — breaks deploy if done blindly)

Do this AFTER the deploy reads secrets from a secret store / untracked local file, NOT from
the tracked `config.env`:

```bash
# 1. Ensure the deploy no longer depends on the TRACKED file:
#    - move the real config to an untracked path or the platform secret store,
#    - confirm a boot from that source in staging.
# 2. Untrack (keeps the working-tree file, removes it from the index going forward):
git rm --cached labbe-backend-/config.env halla-mobile/.env
git commit -m "chore(sec): stop tracking secret env files (SEC-01)"
# 3. .gitignore already covers them (config.env, *.env, **/.env, **/config.env),
#    so they won't be re-added.
```

## 4. Purge history (owner-gated — rewrites history, force-push, coordinate)

Choose ONE tool. Both rewrite every commit that touched the files → all collaborators must
re-clone; open PRs must be rebased.

**Option A — git filter-repo (recommended):**
```bash
pip install git-filter-repo
# From a FRESH mirror clone:
git clone --mirror <repo-url> halla-purge && cd halla-purge
git filter-repo \
  --path labbe-backend-/config.env \
  --path halla-mobile/.env \
  --invert-paths
git push --force --all
git push --force --tags
```

**Option B — BFG Repo-Cleaner:**
```bash
# From a fresh mirror clone:
java -jar bfg.jar --delete-files config.env --delete-files .env halla-purge.git
cd halla-purge.git && git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

After the force-push: everyone re-clones; invalidate caches; if the repo is on a host that
keeps stale refs (forks, PR refs, CI caches), purge those too. GitHub: contact support to
garbage-collect and consider that forks may retain the blobs.

## 5. Prevent recurrence

- Keep the `.gitignore` rules (already present).
- Add pre-commit + CI secret scanning (e.g. `gitleaks` / `git-secrets`) — a scan step that
  fails the build on a detected secret. (Enable AFTER rotation so it doesn't block on the
  pre-existing history.)
- Enforce that all real config lives in the platform secret store / EAS secrets, never a
  tracked file.

## 6. Halaa-specific readiness cross-checks (verified in Session 4)

- Native-billing config is fail-closed and Zod-validated at boot (`revenuecat.config.js` +
  `readiness.js`, BILL-10). `config.env.example` carries the secret-free RevenueCat block.
- Webhook fail-closed: the RevenueCat webhook rejects a bad `Authorization` (401) and a live
  processing lease returns 500 for retry (`billing-webhook.integration`); post-deletion
  webhooks are terminal (`account_deleted`, Session 4). Envelope validation dead-letters
  unknown/invalid events rather than granting.
- Rate limiting is mounted (`uploadLimiter` on media upload, etc.).

## 7. What is BLOCKED and why

- Rotating any credential — needs the owner (access to each provider console).
- `git rm --cached` on the tracked files — needs the deploy to first read secrets from a
  non-tracked source, else the backend fails to boot.
- History rewrite / force-push — destructive, needs owner coordination with all collaborators.

**SEC-01 = `BLOCKED_NEEDS_OWNER`.** Runbook path: this file.
