# Halaa provider automation toolkit

The generated store catalog is the only product source. Commands are fail-closed and never load a repository `.env` file.

## Safe local commands

```text
npm run providers:test
npm run providers:generate
npm run providers:preflight
npm run providers:plan
```

`providers:plan` is a dry-run and performs zero network writes. Generated, secret-free payloads are written to `docs/evidence/store-readiness/provider-payloads/`.

Optional approvals are loaded explicitly with `--approvals <path>` or `PROVIDER_APPROVALS_PATH`. Start from `provider-approvals.template.json`. The overlay is bound to the frozen catalog hash and contains no credentials. Blank Apple price-point IDs or subscription levels remain blockers; the tool never invents them.

## Read-only provider exports

```text
node scripts/providers/cli.js export --provider apple
node scripts/providers/cli.js export --provider google
node scripts/providers/cli.js export --provider revenueCat
node scripts/providers/cli.js regions-version --provider google
node scripts/providers/cli.js price-review --provider apple --approvals <approved-overlay.json>
```

Credential values and private keys must remain outside `D:\halla`. Configure only these process environment names when the corresponding account prerequisite is complete:

- Apple: `APPLE_APP_ID`, `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`
- Google: `GOOGLE_PACKAGE_NAME` (defaults to `com.halaa.app`), `GOOGLE_SERVICE_ACCOUNT_PATH`
- RevenueCat: `REVENUECAT_PROJECT_ID` (defaults to `projc49d20a4`), `REVENUECAT_API_KEY`

Exports are read-only, paginate provider results, retry rate limits/transient errors, and omit credentials. RevenueCat webhook signing secrets are deliberately excluded from exported evidence.

## Strict comparison

```text
node scripts/providers/cli.js diff --provider apple --actual <normalized-export.json>
```

Exit code `0` means exact match; exit code `2` means drift. The comparison ignores observation timestamps but treats missing, extra, or changed configuration as drift.

## Apply and resume safety

`apply` and `resume` require a read-only export, a blocker-free sealed plan, and the exact reviewed plan hash. Google, RevenueCat, and staged Apple writes are journaled and resumable. Apple currently supports reviewed `shells`, `prices`, `availability`, `localization`, and `iap_availability` stages. App-level metadata orchestration remains fail closed until implemented and separately reviewed.

Current Apple continuation state (2026-08-16, post-`business_annual` removal):

- Catalog: hash `20d07092…`; **53 store products per platform = 13 subscriptions + 40 consumables**. Current approvals overlay: `provider-payloads/provider-approvals.catalog-53.json`.
- `shells`: complete — one group, 13 subscriptions (annual deleted by owner), 40 consumables;
- `prices`: complete — 53/53 applied and read back; the prices stage is now idempotent (applied price points are skipped; mismatches become `APPLE_PRICE_MISMATCH` conflicts);
- `availability`: complete — 13/13 Saudi-only `UPFRONT` subscription-plan availability records;
- `localization`: complete — 106/106 ar-SA + en-US records on all 53 products, content-verified;
- `iap_availability`: complete — 40/40 Saudi-only consumable availability records;
- **all five stages report 0 operations / 0 conflicts against the live export (product-level zero drift).** Do not re-run apply stages.
- Apple annual: the previous higher-price-access gate is closed permanently — `business_annual` creates zero store products by owner directive.

Provider writes are permitted only after:

1. the account/container prerequisite is complete;
2. a read-only export and independently reviewed plan exist;
3. Apple price points, subscription levels, and generated AR/EN fallback descriptions are approved;
4. the existing RevenueCat Test Store offering disposition is approved;
5. the exact reviewed plan hash is supplied to the apply command.

No provider apply command may submit an app, product, build, release, or store review.
