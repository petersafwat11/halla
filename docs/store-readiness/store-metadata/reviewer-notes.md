# App review reviewer notes & access (ASO-01, §7.2/§7.3/§8)

**Session:** 6 · **Date:** 2026-07-02 · **Gate:** credentials provided at
submission time (NEVER committed).

Reviewer-facing notes for Apple App Review + Google Play review. Facts here are
observable in code; the reviewer **credentials** are env-only (REV-01,
`scripts/seedReviewerAccounts.js`) and must be supplied in the console at
submission, not stored in the repo.

## Demo / reviewer accounts (roles the reviewer should test)

`scripts/seedReviewerAccounts.js` (REV-01) seeds, each with a paid plan and a
scripted smoke login, and passwords supplied via env only:

- **Personal host** — default plan `premium_monthly_100` (valid six-tier code;
  no silent `trial` fallback — the script fails closed if the paid code is
  missing).
- **Business host** — `business_quarterly` (exercises the DEC-02 business
  self-serve path on web + mobile).
- **Vendor** — approved vendor for the marketplace/vendor-profile flows.

> Provide the actual reviewer email + password in App Store Connect "App Review
> Information" and Play "App access" at submission. Do NOT paste credentials into
> this file or any committed doc.

## How reviewers reach in-app purchases (Apple IAP + Google Billing)

- Native purchases use RevenueCat; store price/period come from the store package
  (the backend catalog omits price — Session 3). Sign in as the host, open Plans
  → a plan/add-on → the purchase sheet (`PlansSummaryScreen` /
  `AddonsPurchaseScreen`) shows the actual store paywall.
- Subscriptions (monthly/quarterly/annual) show auto-renew + Manage-Subscription;
  one-time event packages + add-ons show single-use disclosures; design add-ons
  are disclosed **non-refundable from creation** (DEC-03L); business customization
  is a managed/provisioned service. Restore Purchases is offered for subscriptions
  only (consumables are reconciled via the authenticated backend ledger).

## Product behavior accuracy (§8)

- Each store product's name/description says its exact behavior: recurring
  products state the period + invite tier; event packages state one event + invite
  allowance; add-ons state the exact quantity/deliverable and whether repeatable.
- No backend price appears in any product text (store shows price/VAT).
- Products requiring manual provisioning (design templates, business
  customization) do **not** promise immediate fulfillment — they are managed
  service requests (admin dashboard → assigned designer/provisioning). This
  matches the refund copy and the Session-2/3 fulfillment behavior.

## Legal / policy links (live, indexable)

- Terms: `https://halaa.com.sa/<lang>/terms`
- Privacy: `https://halaa.com.sa/<lang>/privacy`
- Refund/Subscription: `https://halaa.com.sa/<lang>/refund`
- Community Rules: `https://halaa.com.sa/<lang>/community-rules`
- Support: `https://halaa.com.sa/<lang>/support`
- Delete Account/Data: `https://halaa.com.sa/<lang>/delete-account`

## Territory

- Saudi Arabia storefront only (signed D2). Reviewers should test in the SA
  storefront.

## BLOCKED_NEEDS_OWNER

- Support contact email/phone shown to reviewers (Session-5 blocked conflict).
- Any EULA choice beyond Apple's standard EULA (owner).
- Final "What's New" / release notes text.
