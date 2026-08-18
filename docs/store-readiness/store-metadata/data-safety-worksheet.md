# Apple App Privacy and Google Play Data Safety — console-ready worksheet

**Code audit date:** 2026-08-13  
**Package:** `com.halaa.app`  
**Status:** `APPLIED_AND_PUBLISHED` (Google Play Data Safety applied via API Status 204; Apple App Privacy published on App Store Connect)  
**Scope:** the mobile app, its backend account, enabled SDKs, and data the app sends to Halaa or its service providers.

This is the canonical answer sheet to enter in App Store Connect and Play Console. It is not evidence that the console forms were submitted. Re-run the dependency/permission audit and compare console exports immediately before submission.

## Verified global answers

| Question | Answer | Code basis |
|---|---|---|
| Data collected | **Yes** | Account, event, guest, content, purchase, diagnostics and device data are transmitted off device |
| Data sold | **No** | No sale path or advertising SDK found |
| Cross-app/site advertising tracking | **No** | No ad/attribution SDK; ATT is not requested |
| Advertising purpose | **No** | Sentry performance tracing is diagnostics, not advertising |
| Encryption in transit | **Yes** | Production API/provider traffic uses HTTPS; verify production endpoints during signed-build QA |
| Account deletion | **Yes** | In-app authenticated/re-authenticated flow plus public `https://halaa.com.sa/<lang>/delete-account` |
| Whole address book uploaded | **No** | Contacts are read locally; only contacts explicitly selected as guests are sent |
| Full card number/CVV stored by Halaa | **No** | Store/payment provider handles credentials; backend retains limited method/transaction metadata |
| Optional permissions | Contacts, location, photos/documents, notifications | Requested in context; Android fine location/camera/audio/media-library access are blocked |

## Apple App Privacy entries

For every row marked **Yes**, select **Linked to the User: Yes** unless the final Sentry export proves the diagnostic row cannot be linked. Select **Used for Tracking: No** for every row.

| Apple data type | Collect | Purposes to select | Notes |
|---|---:|---|---|
| Contact Info — Name | Yes | App Functionality; Developer Communications | Account, guest, vendor and support workflows |
| Contact Info — Email Address | Yes | App Functionality; Developer Communications | Account, auth, receipts/support |
| Contact Info — Phone Number | Yes | App Functionality; Developer Communications | Account, guests, invitations and support |
| Contact Info — Physical Address | No | — | Event venue belongs under Location/Other User Content; change to Yes if a home/billing address field is added |
| Health | Yes | App Functionality | Optional guest dietary restrictions can reveal health/allergy information |
| Financial Info — Payment Info | No | — | Native payment credentials are handled by Apple/Google; Halaa receives transaction/method metadata only |
| Financial Info — Credit Info | No | — | Not collected |
| Financial Info — Other Financial Info | No | — | Not collected beyond purchase history |
| Location — Precise Location | Yes | App Functionality | User-selected map coordinates and venue coordinates can be precise |
| Location — Coarse Location | Yes | App Functionality | Android requests coarse foreground location; user may deny |
| Sensitive Info | Yes | App Functionality | Vendor national ID/commercial-verification documents and identifiers |
| Contacts | Yes | App Functionality | Only explicitly selected contacts are transmitted as guests |
| User Content — Photos or Videos | Yes | App Functionality | Profile, service, event and post-event media |
| User Content — Customer Support | Yes | App Functionality; Developer Communications | Support ticket content and attachments where enabled |
| User Content — Other User Content | Yes | App Functionality | Events, guest/RSVP/check-in data, comments, invitation text and vendor content |
| Browsing History | No | — | No browser-history collection found |
| Search History | No | — | Marketplace/location search is not intentionally retained as a user search-history profile; reclassify if logging changes |
| Identifiers — User ID | Yes | App Functionality; Analytics | Internal account/guest IDs and RevenueCat App User ID |
| Identifiers — Device ID | Yes | App Functionality | Push token/install-associated provider identifier; not advertising ID |
| Purchases — Purchase History | Yes | App Functionality | Product, transaction, subscription, entitlement and refund state |
| Usage Data — Product Interaction | Yes | Analytics; App Functionality | Feature interaction, operational counters and Sentry performance traces |
| Usage Data — Advertising Data | No | — | No ads/advertising SDK |
| Diagnostics — Crash Data | Yes | Analytics; App Functionality | Sentry when DSN is enabled; PII scrubber and `sendDefaultPii:false` configured |
| Diagnostics — Performance Data | Yes | Analytics; App Functionality | Sentry tracing uses a production sample rate of 0.2 |
| Diagnostics — Other Diagnostic Data | Yes | Analytics; App Functionality | Device/OS/app version, errors and operational logs |

### Apple console checks before saving

1. Confirm the production Sentry project has IP storage/scrubbing and retention configured as declared.
2. Confirm no new analytics, attribution, advertising or social-login SDK was added to the signed build.
3. Export the completed App Privacy answers and compare every selected type and purpose to this table.

## Google Play Data Safety entries

Use **Collected: Yes** for every row below. Use **Shared: No** only while each transfer is covered by Google's service-provider or user-initiated exception and the applicable contracts/configuration support that characterization. If any provider uses the data for its own unrelated purposes, mark the affected type as shared.

| Google category / data type | Required or optional | Purpose selections | Processing notes |
|---|---|---|---|
| Personal info — Name | Required for relevant account/guest/vendor flows | App functionality; Account management; Developer communications | Linked to account/event |
| Personal info — Email address | Required for email-based account/vendor/support flows | App functionality; Account management; Developer communications | Linked |
| Personal info — User IDs | Required | App functionality; Account management; Fraud prevention/security | Includes internal and billing IDs |
| Personal info — Phone number | Required for primary account/guest invitation flows | App functionality; Account management; Developer communications | Linked |
| Personal info — Address | Optional | App functionality | Event/venue or vendor service location; not claimed as home address |
| Personal info — Other info | Optional | App functionality | Business/vendor profile and verification information |
| Financial info — Purchase history | Optional (required when purchasing) | App functionality; Fraud prevention/security; Account management | Store/Moyasar/RevenueCat transaction and refund state |
| Health and fitness — Health info | Optional | App functionality | Dietary restrictions supplied for RSVP/guest handling |
| Location — Approximate location | Optional | App functionality | Foreground coarse permission |
| Location — Precise location | Optional | App functionality | Map-selected/current event coordinates |
| Messages — Other in-app messages | Optional | App functionality; Developer communications | Comments, invitation/event messages and support content |
| Photos and videos — Photos | Optional | App functionality | User-selected uploads |
| Photos and videos — Videos | Optional | App functionality | Post-event/user-selected uploads where enabled |
| Files and docs — Files and docs | Optional | App functionality; Account management | Vendor verification/profile documents and selected uploads |
| Contacts — Contacts | Optional | App functionality | Only selected contacts leave the device |
| App activity — App interactions | Required while using app | Analytics; App functionality | Operational interaction/performance data |
| App info and performance — Crash logs | Automatic when Sentry enabled | Analytics; App functionality | PII scrubbed before send |
| App info and performance — Diagnostics | Automatic when Sentry enabled | Analytics; App functionality | Performance/device/app diagnostics |
| Device or other IDs — Device or other IDs | Required for enabled notifications/billing | App functionality; Fraud prevention/security | Push and provider/install identifiers; no advertising ID |

### Google form-level answers

| Form question | Answer |
|---|---|
| Is all collected data encrypted in transit? | **Yes** — verify signed production endpoints before submission |
| Can users request deletion? | **Yes** |
| Account deletion web URL | `https://halaa.com.sa/en/delete-account` (Arabic: `/ar/delete-account`) |
| Is data collection optional? | **Mixed** — account identifiers/contact are required for core flows; permissions/uploads/purchases are optional or feature-triggered |
| Independent security review | **No**, unless a qualifying published review is completed later |
| Families / children | Do not select a children-directed audience unless the final age-rating/target-audience decision and child-data controls support it |

## Processor/recipient mapping

| Recipient | Data involved | Purpose |
|---|---|---|
| MongoDB Atlas; AWS/S3 | Account, event, guest, content and files | Hosting/storage |
| Apple; Google; RevenueCat | User/billing IDs, product, purchase, subscription and entitlement data | Native billing |
| Moyasar | Web payment and limited payment-method/transaction data | Web billing |
| Expo/APNs/FCM | Push token, message payload and delivery metadata | Notifications |
| Sentry | Redacted crash, error, performance and device/app context | Diagnostics |
| Google Maps | Coordinates/address queries required by map use | Event/vendor location |
| Taqnyat; SMS/email providers; Meta/WhatsApp | Recipient contact and invitation/operational message data | User-requested communications |

## Remaining external confirmations

- Enter and export both console forms; repository files cannot prove console state.
- Confirm production processor contracts, regions, sub-processors and retention settings.
- Confirm the signed binary contains only the audited SDKs and permissions.
- Saudi counsel must approve legal bases, processor characterization, final retention wording, and treatment of dietary/identity-verification data.
