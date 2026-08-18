# Halaa minimum store-submission checklist

This is the only owner-facing launch checklist. Other privacy, DPIA, processor,
retention and evidence documents are engineering/reference material and do not
add owner tasks unless a store reviewer specifically asks for them.

## Already complete in the repository

- AR/EN legal pages, entity/contact details and refund consistency.
- Public privacy, support and account-deletion URLs.
- Account deletion, UGC report/block/moderation and Sentry PII controls.
- Store catalog: 54 products/platform, 14 subscriptions, 40 consumables.
- RevenueCat entitlement/offering mapping and backend billing lifecycle.
- Apple App Privacy and Google Data Safety answer worksheets.
- General-audience, not-child-directed decision.
- Store metadata templates and reviewer-account seeding tooling.

## Only remaining launch work

1. Open authenticated Apple Developer, Play Console and RevenueCat accounts.
2. Complete Apple paid-app agreements/banking/tax and Google developer/payment verification.
3. Create/import the approved products and connect RevenueCat:
   - 54 Apple products and 54 Google products;
   - 14 subscriptions attached to `recurring_access`;
   - 40 consumables with no entitlement;
   - four offerings;
   - webhook, Apple notifications and Google RTDN.
4. Build signed iOS and Android release candidates and upload them.
5. Enter the mandatory store forms using the prepared answers:
   - listing copy and URLs;
   - Apple privacy and age rating;
   - Google Data Safety, content rating and target audience;
   - reviewer login/instructions.
6. Seed the three reviewer accounts and capture the required AR/EN screenshots from the signed builds.
7. Run one successful subscription purchase, one consumable purchase, restore/reconcile and refund test in each store sandbox.
8. Run the generated zero-drift comparison, perform the requested final independent review, then submit.

## Explicitly not launch blockers

- Backup restore testing when Halaa has no backup system.
- Processor-region/DPA research or manually resolving every processor worklist row.
- A separate mobile post-logout deletion-status screen.
- Publishing support hours or numeric SLAs.
- DPIA/DPO paperwork, additional compliance registers or optional evidence packs.
- Production retention execution before initial store submission.
- Any additional owner decision already recorded in the decision files.

If Apple or Google raises a specific review question, answer that exact question;
do not expand the launch scope pre-emptively.
