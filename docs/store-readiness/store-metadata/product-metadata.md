# Store product (IAP/subscription) metadata rules (ASO-01, §8)

**Session:** 6 · **Date:** 2026-07-02.

Per-store-**product** (plan/add-on) names/descriptions must be **generated from
the same canonical catalog** the backend and mobile use — no separate spreadsheet
drift (§8). Session 6 does **not** re-author them; it points to the CAT-01
generated inventory and states the behavior-accuracy rules the copy must satisfy.

## Single source (do not duplicate)

- Canonical catalog: `labbe-backend-/src/shared/commerce/` +
  `storeCatalog.generated.json` (34 plans / 22 add-ons; regenerate via
  `npm run catalog:generate`, drift-gate via `npm run catalog:verify`).
- Generated AR/EN product metadata inventory:
  `docs/evidence/store-readiness/generated/metadata-inventory.generated.md`.
- Store product/base-plan maps:
  `apple-product-map.generated.md`, `google-product-map.generated.md`,
  `revenuecat-mapping.generated.md`. All external identifiers are **PROPOSED**
  (`com.halla.<code>`) — no console products created.

## Behavior-accuracy rules (the product copy MUST satisfy)

- **Recurring products** (monthly/quarterly/annual): state the **period** and the
  **invite tier**.
- **Event packages** (consumable): state **one event** and the **invite
  allowance**.
- **Add-ons:** state the **exact quantity/deliverable** and whether **repeatable**:
  - Extra invites — consumable, repeatable top-up; state the invite count.
  - Design templates — single-use managed **service request** (assigned designer
    → WhatsApp → revisions → complete); **non-refundable from creation**
    (DEC-03L); never described as a reusable/restorable asset.
  - Business customization — managed/provisioned service (admin, ~1-week SLA).
- **No backend price in product text** — the store shows price + Saudi VAT (15%).
- **No promise of immediate fulfillment** where provisioning is manual (design /
  business customization).
- Trial + unlimited are **internal only** — never store products.

## Store-eligible counts (proven by CAT-01 contract tests)

- 34 DB plans → **32 store-eligible plans** (2 internal: trial + unlimited).
- **22 add-ons.**
- **54 proposed products / platform.**
- Six-tier only (no 250/300/350/400).

## Not done here

- Immutable SKU creation + console product setup (later, MCP-02/03/04).
- Final marketing wording of the product descriptions is owner-gated where it
  becomes persuasive; the behavior facts above are derived from signed decisions.
