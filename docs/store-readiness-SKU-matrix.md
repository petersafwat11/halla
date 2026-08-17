# Path B store SKU matrix (§9.4/§9.5) — console config checklist

> **Authoritative machine-generated matrix (CAT-01, 2026-07-01):** the canonical,
> reproducible SKU matrix and provider maps are now **generated** from
> `labbe-backend-/src/shared/commerce/` — see
> `docs/evidence/store-readiness/generated/{sku-matrix,apple-product-map,google-product-map,revenuecat-mapping,metadata-inventory,expected-counts}.generated.md`
> and the manifest `labbe-backend-/src/shared/commerce/storeCatalog.generated.json`.
> Regenerate + drift-check: `cd labbe-backend- && npm run catalog:verify`. This file
> is retained for the console-workflow narrative below (promotions, sandbox matrix,
> not-sold-natively); on any conflict the generated artifacts govern. Totals:
> **six-tier / 34 plans → 32 sellable + 22 add-ons = 54 proposed products per platform**;
> all ids are PROPOSED (`com.halla.<code>`), not yet created.

Every row = one store product to create in **App Store Connect** + **Google Play**
+ map in **RevenueCat** and in `REVENUECAT_PRODUCT_PLAN_MAP` (JSON
`{ "<store_product_id>": "<plan_code>" }`). Type drives behavior: **subscription**
= auto-renewable (one subscription group, ordered levels); **consumable** = one-time
event package (backend creates an `EventEntitlement`, no force-cancel/auto-expiry).

Suggested product-id convention: `com.halla.<plan_code>` (keep ios = android id
so the single `REVENUECAT_PRODUCT_PLAN_MAP` covers both). Prices are set in the
store (the app renders `priceString`), NOT from backend SAR.

## Personal host — Basic (sell all 6 tiers each)
| plan_code | type |
|---|---|
| basic_event_25 / _50 / _75 / _100 / _150 / _200 | **consumable** |
| basic_monthly_25 / _50 / _75 / _100 / _150 / _200 | **subscription** (monthly) |

## Personal host — Premium
| plan_code | type |
|---|---|
| premium_event_25 / _50 / _75 / _100 / _150 / _200 | **consumable** |
| premium_monthly_25 / _50 / _75 / _100 / _150 / _200 | **subscription** (monthly) |

## Business — self-serve simplified tiers (setup fee/tax/quote waived in-app; D8)
| plan_code | type |
|---|---|
| business_event_25 / _50 / _75 / _100 / _150 / _200 | **consumable** |
| business_quarterly | **subscription** (quarterly) |
| business_annual | **subscription** (annual) |

## Add-ons (sell all; D8) — mobile picker → native IAP

Each add-on = one store product. The **RevenueCat package identifier must equal
the add-on code below** (the mobile `findPackageForAddon` matches by code, exactly
like plans). Map the store product id → the same code in the new env var
`REVENUECAT_ADDON_PRODUCT_MAP` so the webhook grants it.

| add-on code (= RC package identifier) | type | backend |
|---|---|---|
| `extra_invites_10` … `_20/_30/_40/_50/_75/_100/_125/_150/_200/_250/_300/_350/_400/_450/_500` (16 tiers) | **consumable** | bumps the active subscription's invite pool |
| `design_template_ready_made` / `_custom_male` / `_custom_themed` / `_animated` / `_3d` (5) | **consumable** (single-use managed service, DEC-03L; no restore; **non-refundable from creation**) | request → admin dashboard → assign designer → WhatsApp → revisions → complete |
| `business_customization` | **consumable** (managed service, DEC-03; refund = **legal review** before/after work — distinct from design) | org branding (provisioned by admin → `pending_provisioning`) |

```
REVENUECAT_ADDON_PRODUCT_MAP = {
  "com.halla.extra_invites_50": "extra_invites_50",
  "com.halla.design_template_animated": "design_template_animated",
  "com.halla.business_customization": "business_customization",
  ... one entry per add-on product ...
}
```

> Add-ons are bought as **separate** store products after the plan (IAP has no
> multi-product basket), so the mobile checkout opens one store sheet per
> selected add-on. Host add-ons: extra invites + design templates. Business
> add-ons: business customization (+ extra invites) — both now surfaced in-app.

## Not sold natively
- `trial` (free, auto-granted), `unlimited` (admin), `business_quarterly/annual`
  **managed/quote** contracts (the negotiated B2B flow stays web-only — only the
  simplified self-serve tiers above are in-app).

## Promotions
- No backend discount-code box in-app. Use **Apple Offer Codes** / **Google
  promo codes** redeemed in the store sheet.

## Sandbox matrix (§9.5) — test each
initial purchase · renewal · voluntary cancel (access remains) · expiration ·
billing grace/recovery/failure · refund · refund reversal · upgrade · deferred
downgrade · restore · reinstall · duplicate event · out-of-order event · transfer
· unknown product · webhook outage/retry · A→B account switch · (consumables)
duplicate delivery · attempted 2nd purchase while unused · durable grant ·
first-send consumption · refund before/after use.
