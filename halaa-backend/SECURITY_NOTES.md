# Backend security — required manual steps before launch

The code-level hardening (trust proxy, webhook HMAC verification, the
`USER_STATUS.DELETED` fix, account-deletion endpoint, `.gitignore` for secrets,
and `config.env.example`) is in the repo. The following steps **cannot be done
safely from an automated change** and must be performed by a maintainer with
access to the deployment and the third-party consoles.

## 1. Stop tracking the committed secrets (deploy-coordinated)

`config.env` and `certs/mongodb-x509.pem` are still tracked in git history with
real (currently staging/test) credentials. They are now git-ignored, but still
present in the index/history. Untracking them changes the deploy contract — if
the server deploys via `git pull`, removing them from the tree will delete them
on the server. So provision the env out-of-band **first**, then:

```bash
# After the server reads its env from a secret manager / .env provisioned
# out-of-band (NOT from git):
git rm --cached config.env certs/mongodb-x509.pem
git commit -m "chore(security): stop tracking secrets; provision via env"
```

## 2. Rotate every previously-committed secret (external)

Because they were in git history, treat all of these as compromised and
**rotate** them in their respective consoles:

- `JWT_SECRET` (invalidates all sessions — expected)
- `MOYASAR_API_KEY`, `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_WEBHOOK_SECRET`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (rotate the IAM key)
- MongoDB credentials / re-issue the X.509 cert (`DATABASE`, `DATABASE_PASSWORD`)
- `TAQNYAT_API_KEY`, `EMAIL_PASSWORD`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Set `WHATSAPP_APP_SECRET` to the real Meta App Secret (required to enforce
  inbound webhook HMAC verification — see `messaging.webhook.controller.js`).

## 3. Purge the secrets from git history (destructive)

Rewrites history and requires a force-push + coordination with all collaborators:

```bash
# Example with git-filter-repo (preferred over filter-branch):
git filter-repo --invert-paths --path config.env --path certs/mongodb-x509.pem
# then force-push and have everyone re-clone
```

## 4. Production environment values

Ensure the production env sets:

- `NODE_ENV=production` — dev mode leaks stack traces, serves Swagger publicly,
  and disables the Secure cookie flag.
- `RATE_LIMIT_ENABLED=true` — when `false`, every limiter (login, OTP, password
  reset, refresh) is a no-op, i.e. no brute-force protection.
- `MOYASAR_WEBHOOK_IP_WHITELIST` populated (defense-in-depth on the webhook).

See `config.env.example` for the full template.
