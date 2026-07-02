# MCP capability report — provider console configuration (Session 8 / MCP-01)

**Date:** 2026-07-02 · **Author:** Claude Code (release/provider-configuration engineer, Session 8)
**Scope:** master plan Phase 5 step 1 (`store-readiness-CLAUDE-MASTER-PLAN.md`), external runbook §1
(`store-readiness-EXTERNAL-MCP-RUNBOOK.md`).
**Verdict:** `BLOCKED_NEEDS_OWNER` — **no provider console MCP is connected or even registrable this
session.** No console write, and no before-state export, is possible. This report enumerates what is
connected, what each provider would require, and the resolved-input blockers.

> **This report contains NO secret values.** Provider credentials/secrets are referenced by **name**
> only (external runbook safety rule 2). Nothing was authenticated; no product, offering, price, or
> console object was created or simulated.

---

## 1. Finding (headline)

| Provider console | Authenticated MCP this session? | Connector exists in the registry to authorize later? | Console write possible? | Before-state export possible? |
|---|---|---|---|---|
| **Apple** App Store Connect / Apps API | **NO** | **NO** (registry search returned 0 results) | No | No |
| **Google Play** Console / Android Publisher | **NO** | **NO** (0 results) | No | No |
| **RevenueCat** API v2 / MCP | **NO** | **NO** (0 results) | No | No |
| **EAS / Expo** (build/submit/secrets) | **NO** | **NO** (0 results) | No | No |

**Answer to the session question "which provider consoles have an authenticated MCP":** **none.**
Not only is nothing authenticated — the MCP registry has **no connector** for any of the four
provider consoles to authorize in a later interactive session, so this is a stronger gap than "not
logged in."

## 2. What IS connected this session (evidence)

Probed **read-only** via the MCP registry tools (`mcp__mcp-registry__list_connectors`,
`mcp__mcp-registry__search_mcp_registry`) — no authentication attempted, no credentials requested.

- `list_connectors` → `{"connectors":[]}` (no installed connectors rendered).
- `search_mcp_registry` for each provider returned **empty results**:
  - `["Apple","App Store Connect","iOS","App Store"]` → `[]`
  - `["Google Play","Android Publisher","Play Console"]` → `[]`
  - `["RevenueCat","subscriptions","in-app purchase","billing"]` → `[]`
  - `["EAS","Expo","mobile build","app deployment"]` → `[]`

The MCP servers actually present in this session are **non-provider** tooling, none of which can
write to a store/billing console:

| Connected/available server (this session) | Category | Can configure Apple/Google/RevenueCat/EAS? |
|---|---|---|
| Postman (`78371654-…`) | API design / collections | No |
| Figma (`a5777004-…`) | Design | No |
| `claude-in-chrome`, `computer-use`, `plugin_playwright` | Browser / desktop automation | No — not an authenticated provider API; cannot be used to drive a logged-out console, and no credentials/session exist |
| `mcp-registry`, `ccd_session*`, `scheduled-tasks`, `context7` | Session / registry / docs tooling | No |

Additionally, the harness reported these **plugin** MCP servers need OAuth before any use (all
**non-provider-console**): `design:asana`, `design:atlassian`, `design:intercom`, `design:linear`,
`design:notion`, `design:slack`, `figma:figma`. None is Apple/Google/RevenueCat/EAS. Authorizing any
of them would **not** unblock store configuration.

**Conclusion:** there is no path in this session to perform a provider console write or a
before-state export. Both are `BLOCKED_NEEDS_OWNER`.

## 3. What each provider console MCP/API would require (to become usable later)

Per external runbook §1 "Official API boundaries" — and note that even a fully authorized MCP cannot
perform the manual bootstrap actions in the right-hand column.

| Provider | To authorize an MCP/API you need (by NAME, never value) | Manual actions no MCP/API can do (owner-only) |
|---|---|---|
| **Apple** | An **App Store Connect API key** (`.p8`) with least privilege (App Manager) → record **Key ID** + **Issuer ID** + **Team ID** only; `.p8` stays in the secret manager. | Create the **iOS app record** (Apple Apps API cannot create app records — done on the ASC website); accept **Paid Apps agreement**; complete **Tax/Banking**; **age-rating** questionnaire; final review submission. |
| **Google** | A **Play service-account JSON** linked in Play Console (least privilege: manage releases + store listing), stored as a file secret. | Create the **Play app record** for `com.halla.app`; verified **developer + payments profile**; enroll **Play App Signing**; **Data Safety** form; content rating; production rollout. |
| **RevenueCat** | A **RevenueCat secret API key** (v2) with minimum permissions (server-side) + **public SDK keys** for the app. | Create the **project**; add the **iOS + Android apps** under it; upload **Apple in-app-purchase key / App Store Server Notifications** + **Google Play credentials / RTDN Pub-Sub**; sign the **transfer/restore behavior** setting. |
| **EAS / Expo** | An **Expo account** owning project `petersafwat` / EAS project id `d5570c5a-d11b-4716-81d6-108939d72b22` (already in `app.json`), with `eas-cli >= 18`. | Interactive **`eas login`**; register EAS secrets by name (`eas env:create`); accept Apple/Google **agreements**; run `eas build` / `eas submit`. |

## 4. Resolved-input blockers (what is missing before any product config)

The full secret-free variable sheet lives in **`PROVIDER-CONFIG-RUNBOOK.md` §2 (Resolved inputs)**.
The **required** values still missing (each an explicit blocker) are:

- Apple: `APPLE_TEAM_ID`, `APPLE_ASC_APP_ID`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_SKU`.
- Google: `GOOGLE_PLAY_APP_RECORD`, `GOOGLE_SERVICE_ACCOUNT` (email), `GOOGLE_APP_SIGNING_SHA256`, `GOOGLE_UPLOAD_SHA256`.
- RevenueCat: `REVENUECAT_PROJECT_ID`, `REVENUECAT_IOS_APP_ID`, `REVENUECAT_ANDROID_APP_ID` (public SDK keys + secret API key by name).
- Owner/legal contact carried from Session 5 (still `BLOCKED_NEEDS_OWNER`): legal entity name, support email (`support@halaa.net` vs `support@halaa.com.sa` conflict), support phone/WhatsApp, postal address, support SLA.
- Owner/marketing carried from Session 6 (ASO README §"BLOCKED list"): all persuasive listing copy, categories, EULA/copyright, age-rating answers, screenshots.

**Known / not blocked** (secret-free, already signed — see runbook §2 for the full list): bundle/package
`com.halla.app`; recurring entitlement `recurring_access`; catalog version `1.0.0` + hash
`32eeeac40ea355e2a77c7a35d0b8b28cd7fd623e802947e2c5e893782220737d`; the 4 RevenueCat offering ids
(`host_plans`, `business_plans`, `host_addons`, `business_addons`); canonical origin
`https://halaa.com.sa` + the Session-5 legal/support URLs; EAS project id + owner.

## 5. Before-state export (explicitly not possible)

External runbook §4 requires read-only "before/" exports of Apple/Google/RevenueCat/EAS state, then a
diff against the signed manifest. **Because no provider MCP/API is connected, no before-state export
can be produced.** There is nothing to snapshot and nothing to diff yet. The readback + zero-drift
diff **procedure** (what to export and how to compare it against
`storeCatalog.generated.json`) is fully specified in `PROVIDER-CONFIG-RUNBOOK.md` §8 so it can run the
moment console access exists — but it cannot execute here.

## 6. Status mapping

| Task | State | Note |
|---|---|---|
| **MCP-01** capability report + before exports | **capability report DELIVERED (this file); before-state export = `BLOCKED_NEEDS_OWNER`** | No provider MCP → the "before exports" half cannot run. |
| MCP-02 (Apple) / MCP-03 (Google) / MCP-04 (RevenueCat) / MCP-05 (readback diff) | **`BLOCKED_NEEDS_OWNER`** | Runbook written (`PROVIDER-CONFIG-RUNBOOK.md`); execution needs authenticated console access + owner bootstrap. |

**End state:** `BLOCKED_NEEDS_OWNER` — provider console configuration requires authenticated
Apple/Google/RevenueCat/EAS access (no provider MCP connected, none registrable) plus owner
account/agreement/credential bootstrap. See `PROVIDER-CONFIG-RUNBOOK.md` for the exact, manifest-derived
steps to run once that access exists.
