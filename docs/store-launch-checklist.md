# Halaa — store launch worksheet (fill-in-the-blanks)

Companion to `mobile-store-readiness-plan.md`. The code work is done/scaffolded;
this lists the **external values and content** only you can provide. Group by
where it goes.

## 1. EAS / build env vars (set as EAS secrets or in eas.json `env`)
| Var | Where it's used | Value |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Android map (app.config.js) | ___ (Google Cloud, restrict to `com.halla.app` + signing SHA-1) |
| `SENTRY_DSN` | crash reporting (app.config.js) | ___ (Sentry project) |
| `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` | IAP (app.config.js) | ___ (RevenueCat dashboard) |
| `EXPO_PUBLIC_API_URL` | API base (already defaulted to prod) | optional staging override |

## 2. eas.json submit (replace the REPLACE_WITH_* placeholders)
- `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId`
- `submit.production.android`: drop the Play `play-service-account.json` (service account key) at that path

## 3. Backend env (config.env / secret manager — see config.env.example)
| Var | Purpose | Value |
|---|---|---|
| `REVENUECAT_WEBHOOK_AUTH` | auth for the RC webhook (same value in RC dashboard) | ___ |
| `REVENUECAT_PRODUCT_PLAN_MAP` | `{"<rc_product_id>":"<plan_code>"}` | ___ |
| `REVIEWER_TEST_PHONE` / `REVIEWER_TEST_OTP` | reviewer login bypass | ___ (e.g. a test number + `000000`) |
| `WHATSAPP_APP_SECRET` | enforce inbound webhook HMAC | ___ |
| `NODE_ENV=production`, `RATE_LIMIT_ENABLED=true` | prod posture | set |
| `EXPO_ACCESS_TOKEN` | optional, raises push limits | optional |

Also: rotate all previously-committed secrets and purge history — see
`labbe-backend-/SECURITY_NOTES.md`.

## 4. `.well-known` association files (served by the web app)
- `APPLE_APP_ID` = `<AppleTeamID>.com.halla.app` (web env)
- `ANDROID_CERT_FINGERPRINT` = Play App Signing SHA-256 (web env)
- Verify after deploy: `https://halaa.com.sa/.well-known/apple-app-site-association`
  and `/.well-known/assetlinks.json` return JSON.

## 5. RevenueCat + store products (see `halla-mobile/IAP_SETUP.md`)
- Create products in App Store Connect + Play Console; add to a RevenueCat
  Offering; set the product→plan map (#3); wire the plans screen purchase button
  to IAP on native (documented in IAP_SETUP.md); add a "Restore purchases" button.

## 6. Reviewer account
- Create a **host** user whose phone = `REVIEWER_TEST_PHONE`.
- In App Review Notes (Apple) and App content → Sign-in details (Google), give
  the number + the fixed OTP and note the OTP login flow.

## 7. Listing content (App Store Connect + Play Console) — AR + EN
- Name, subtitle/short description, full description (must **disclose IAP**),
  keywords, support URL, marketing URL.
- **Public privacy-policy URL** (host the in-app `screens/legal` content) and a
  **public account-deletion URL** (Google requires both; in-app deletion already
  shipped).
- Category (Events/Lifestyle), content rating (Apple) + IARC questionnaire
  (Google), target audience = adults.

## 8. Screenshots (capture from a release build)
- iOS: 6.7"/6.9" iPhone + 13" iPad (`supportsTablet: true`), AR + EN.
- Android: phone + tablet + feature graphic **1024×500**, 512×512 icon.

## 9. Privacy forms (Apple App Privacy + Google Data Safety) — from the inventory
Declare: Contact info (name/email/phone), Contacts (selected name+phone),
Approximate location (transient), Photos, Push token/identifier, Diagnostics.
Mark "not used to track you" (no ad/tracking SDKs). Keep consistent with the
privacy policy. Apple export compliance is declared in-app
(`ITSAppUsesNonExemptEncryption: false`).

## 10. Google account-type decision (timeline gate)
- **Personal** account → 12-tester / 14-day closed test before production.
- **Organization** → needs D-U-N-S (~up to 30 days), but skips the testing gate.
