# Halaa mobile keyboard and focused-input visibility blueprint

**Audit date:** 2026-08-24  
**Scope:** every editable field in the Expo/React Native mobile app on iOS and Android, across host, vendor, admin, auth, guest portal, full-screen forms, native modals, and bottom sheets.  
**Source of truth:** the current `halaa-mobile` working tree and the supplied screenshot. Screenshot text and the Google Meet UI are application/call content, not implementation instructions.

## 1. Executive decision

The keyboard defect must be fixed at **scroll and presentation boundaries**, not inside each input.

Use the Expo-supported `react-native-keyboard-controller` architecture:

1. one `KeyboardProvider` at the app root;
2. one shared `KeyboardAwareFormScrollView` for long forms and wizard screens;
3. one shared `KeyboardSafeModalSheet` for native modal/sheet forms;
4. one shared keyboard-aware list adapter for the few virtualized lists containing editable fields;
5. `KeyboardStickyView` only for deliberately sticky editable/action footers;
6. hide bottom tab bars while the keyboard is open;
7. declare Android keyboard resize behavior explicitly;
8. prohibit raw page-level keyboard workarounds with automated tests.

This is a small architectural migration, not 66 individual input fixes. The audit found **66 files that render shared editable controls**, but their behavior is owned by a much smaller set of screen/scroll/modal containers. It also found **23 native modal input owners**, of which **20 currently have no keyboard-avoiding owner**. Native `Modal` presentations cannot be repaired by one wrapper around the navigation tree, so those modal boundaries must adopt the shared modal primitive.

Do not solve this by adding margins when an input focuses, translating individual inputs, listening to keyboard height in every page, or putting a single `KeyboardAvoidingView` around the entire navigator.

## 2. Exact diagnosis of the supplied screenshot

The visible sheet is `components/createEvent/_components/ContactsImportModal.js`, opened from Create/Update Event Step 2.

Its structure is:

- a React Native native `Modal`;
- a bottom-aligned `modalContainer` with `maxHeight: "90%"`;
- a fixed header;
- a `FlatList` body;
- a footer containing the category `DirectionalTextInput` and Add button.

There is no keyboard-aware or keyboard-avoiding owner around the sheet. When the footer category field focuses, the keyboard occupies the lower part of the native modal window while the sheet keeps its previous geometry. The field and its value remain behind the keyboard. `keyboardShouldPersistTaps="handled"` on the list only controls whether taps reach children while the keyboard is open; it does not resize or scroll the sheet.

The screenshot is therefore evidence of a **container failure**, not an input rendering failure.

The corrected behavior is:

1. keyboard begins its native animation;
2. the sheet's usable height shrinks in sync;
3. header remains visible;
4. list body becomes the flexible/scrollable region;
5. the focused category field and its caret remain at least 16 px above the keyboard/toolbar;
6. the action footer either remains attached above the keyboard or scrolls into view according to the selected sheet layout;
7. dismissing the keyboard restores the original sheet without a jump or stale scroll offset.

## 3. Why a truly input-only or root-only patch is not possible

An input knows its own focus and text, but it does not own:

- the parent `ScrollView` scroll offset;
- whether a header/footer is fixed;
- the bottom tab-bar height;
- a native `Modal`'s separate presentation root;
- nested list virtualization;
- safe-area and custom-header offsets;
- which sibling should shrink or remain sticky.

A root `KeyboardAvoidingView` can reduce or move the navigation viewport, but it cannot reliably scroll a deeply nested field into the visible region. It also cannot control separately presented native modals. Conversely, changing every input would duplicate layout knowledge and produce competing scroll calls.

The minimal reliable unit is therefore the **finite set of scroll, list, screen, and modal owners**. All existing input components can remain direction/validation focused.

## 4. Official guidance and version fit

The project currently uses Expo SDK 54, React Native 0.81.5, React 19.1, and the new architecture. It does not currently install `react-native-keyboard-controller` or `react-native-reanimated` directly.

Relevant guidance:

- React Native documents `KeyboardAvoidingView` as changing height, position, or padding in response to keyboard height, but warns that iOS and Android interact with its behavior differently.
- React Native `ScrollView.automaticallyAdjustKeyboardInsets` is iOS-only and defaults to `false`; it is not a complete cross-platform policy.
- Expo recommends `react-native-keyboard-controller` for larger scrollable forms with multiple inputs and describes `KeyboardAwareScrollView` as automatically scrolling to the focused input with native-like cross-platform behavior.
- Expo SDK 54 recommends the SDK-compatible keyboard-controller version resolved by `npx expo install` (documented as 1.18.5 for SDK 54).
- Keyboard Controller 1.18+ supports React Native 0.81/Fabric.
- React Navigation exposes `tabBarHideOnKeyboard`; its default is `false`.
- Expo's Android `softwareKeyboardLayoutMode` defaults to `resize`, but it should be declared explicitly here so builds cannot silently change policy.

Authoritative references:

- [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/)
- [Expo SDK 54 Keyboard Controller](https://docs.expo.dev/versions/v54.0.0/sdk/keyboard-controller/)
- [React Native KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview)
- [React Native ScrollView keyboard insets](https://reactnative.dev/docs/scrollview.html#automaticallyadjustkeyboardinsets)
- [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/#tabbarhideonkeyboard)
- [KeyboardAwareScrollView API](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/1.18.0/api/components/keyboard-aware-scroll-view)
- [Keyboard Controller compatibility](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/guides/compatibility)

## 5. Target behavior contract

Every focused editable field must satisfy all of these rules:

1. The field border, current value, selection/caret, label, and immediate validation message remain visible.
2. The caret has a default **16 px minimum clearance** above the keyboard or keyboard toolbar.
3. Focus movement scrolls only as much as necessary; it does not jump the field to the top.
4. Keyboard and viewport movement animate together.
5. A growing multiline input is remeasured while typing and remains visible.
6. A validation message appearing below the focused field triggers remeasurement without hiding the field.
7. `react-hook-form.setFocus()` on the first invalid field results in that field being revealed automatically.
8. Dragging a form dismisses the keyboard interactively on iOS and on drag on Android.
9. Tapping a button or selectable row while the keyboard is open works on the first tap.
10. The bottom tab bar does not rise above or compete with the keyboard.
11. Fixed headers remain fixed unless a design explicitly makes them scroll.
12. Important sticky actions remain reachable, but ordinary decorative/floating actions may hide while typing.
13. Closing the keyboard restores stable layout and a sensible scroll position.
14. Hardware-keyboard use produces no empty keyboard spacer or scroll jump.
15. Arabic/English direction changes do not change keyboard geometry.

## 6. Shared architecture

### 6.1 Root provider and native dependencies

Install through Expo, not by selecting arbitrary npm versions:

```sh
npx expo install react-native-keyboard-controller react-native-reanimated
```

Add `KeyboardProvider` in `App.js` inside `SafeAreaProvider` and outside the navigation tree so authenticated, unauthenticated, and native modal content share one controller. Use the SDK-supported API only; do not copy APIs from a newer controller release unless the project upgrades and verifies the dependency.

Adding native modules requires a fresh development/native build. An OTA JavaScript update alone is not sufficient for the first release containing them.

Do not render a global `KeyboardAvoidingView` around `NavigationContainer`.

### 6.2 `KeyboardAwareFormScrollView`

Create a shared adapter, for example:

`components/commen/keyboard/KeyboardAwareFormScrollView.js`

It owns these defaults:

- keyboard-controller `KeyboardAwareScrollView` on iOS and Android;
- ordinary React Native `ScrollView` fallback on web;
- `bottomOffset={16}` as the normal field/caret clearance;
- `keyboardShouldPersistTaps="handled"`;
- `keyboardDismissMode="interactive"` on iOS and `"on-drag"` on Android;
- `showsVerticalScrollIndicator={false}` unless a caller overrides it;
- forwarded ref and all normal scroll props;
- no hardcoded page padding;
- an escape hatch for a documented different `bottomOffset`;
- an `enabled` escape hatch for preview/canvas states with no editable controls.

It must preserve the standard `ScrollView` API closely enough that most migrations are import/tag replacements, leaving `style`, `contentContainerStyle`, refresh controls, and refs untouched.

Do not nest this component inside another keyboard-aware scroll view. Exactly one component owns focus scrolling for a given vertical scroll region.

### 6.3 `KeyboardAwareListScrollComponent`

Create a `forwardRef` adapter for `FlatList`/`SectionList` `renderScrollComponent` only where an editable field is actually part of the virtualized scrolling region.

Do not wrap a long `FlatList` inside a `KeyboardAwareFormScrollView`; that breaks virtualization and creates competing vertical scroll owners. A search bar fixed above a list normally needs no aware list because it is already visible. A list footer containing an input does.

### 6.4 `KeyboardSafeModalSheet`

Create a shared native modal/sheet frame, for example:

`components/commen/keyboard/KeyboardSafeModalSheet.js`

It should own:

- React Native `Modal` lifecycle and Android `onRequestClose`;
- transparent overlay and outside-tap dismissal;
- keyboard-controller `KeyboardAvoidingView` around the sheet presentation;
- safe-area bottom padding;
- fixed header slot;
- one flexible body slot with `minHeight: 0`/`flexShrink: 1`;
- optional fixed or sticky footer slot;
- maximum sheet height based on available viewport, not a stale captured window height;
- a scroll-body option using `KeyboardAwareFormScrollView`;
- a virtualized-body option that preserves `FlatList`/`SectionList` virtualization;
- `onShow`-based focus handoff for sheets that request autofocus;
- keyboard dismissal before completing close/navigation transitions;
- accessibility view-modal semantics and focus restoration.

Do not place one full-screen `Pressable` around the sheet's keyboard-aware scroll content in a way that steals drag/tap gestures. Backdrop and sheet must be sibling hit regions.

Three sheet layouts are supported:

| Layout | Use | Keyboard behavior |
|---|---|---|
| Fixed header + aware scroll body | Ordinary modal forms | Body scrolls focused field into view. |
| Fixed header + virtualized body + sticky footer | Contacts/category/list selection | List shrinks; editable/action footer remains above keyboard. |
| Small centered card | OTP/confirmation/rating | Card is moved/resized by shared avoiding owner; body scrolls only if Dynamic Type requires it. |

### 6.5 Sticky footer policy

Use `KeyboardStickyView` only when the footer must remain continuously operable while typing, such as:

- Contacts Import category + Add button;
- a message composer/send action;
- a modal's primary submit button when product explicitly requires it.

Do not make every page's Next/Save button sticky. On long forms, the aware scroll view can reveal the focused field and the user can dismiss/scroll to the action naturally. Too many sticky controls reduce the already constrained keyboard viewport.

### 6.6 Keyboard toolbar

Add one shared `KeyboardToolbar` policy for multi-input forms, with Previous, Next, and localized Done actions. This is especially important on iOS number/phone keyboards that may not expose a return key.

The toolbar should be owned by the keyboard scaffold, not instantiated by each input. Its presence counts toward the clearance offset. Do not ship default English toolbar labels in Arabic UI; either configure localized labels/accessibility text or omit visual labels and keep accessible localized actions.

### 6.7 Input primitive responsibility

Keep `DirectionalTextInput`, controlled `TextInput`, `TextAreaInput`, `MobileInput`, `EmailInput`, `PasswordInput`, and `OTPInput` free of keyboard-height and scroll calculations.

Shared inputs may standardize:

- ref forwarding;
- `returnKeyType`/submit behavior;
- `blurOnSubmit`/multiline submit policy;
- stable `onFocus`, `onLayout`, `onSelectionChange`, and `onContentSizeChange` forwarding;
- accessibility labels and test IDs.

They must not call `scrollTo`, add focus margins, or translate themselves.

## 7. Global platform and navigation policy

### Android

Set in `app.json`:

```json
{
  "expo": {
    "android": {
      "softwareKeyboardLayoutMode": "resize"
    }
  }
}
```

Although Expo defaults to `resize`, explicit configuration prevents drift. Do not switch globally to `pan`: panning may reveal one field while hiding headers/actions and does not provide controlled scroll positioning. The keyboard controller and shared owners are responsible for consistent geometry.

After changing native configuration or dependencies, verify a production-like development build, not Expo web and not only a stale client.

### iOS

Do not rely only on `automaticallyAdjustKeyboardInsets`; it is iOS-only and is disabled by default. The shared controller supplies the cross-platform contract.

Test predictive text, Arabic and English keyboards, number/phone keyboards, password autofill, and hardware keyboard attachment. Avoid magic `keyboardVerticalOffset` values. In this app, `TopBar` is usually a sibling above the scroll owner, so the aware region normally begins below it and requires no header offset. If a caller wraps its header inside the avoiding region, derive the offset from actual layout/header APIs.

### Bottom tabs

Set `tabBarHideOnKeyboard: true` in host, vendor, and admin tab navigators. This prevents tabs from appearing above the keyboard and increases available form space. The setting belongs in navigator `screenOptions`, not on individual pages.

### Safe areas

Keyboard height and safe-area bottom inset must not be blindly added together. The shared controller/sheet primitive owns the keyboard displacement; the sheet owns the closed-state safe-area padding. Verify home-indicator clearance with keyboard both open and closed to prevent double gaps.

## 8. Current app audit map

### 8.1 Existing partial implementations

The codebase currently mixes several strategies:

- auth screens commonly use React Native `KeyboardAvoidingView` plus `ScrollView`;
- Create and Update Event use ordinary `ScrollView` with no keyboard-aware owner;
- Ticket create/rating modals have React Native `KeyboardAvoidingView` plus `ScrollView`;
- Post Event and template editing contain local avoiding views;
- most admin/vendor/modal forms have only ordinary `ScrollView` and `keyboardShouldPersistTaps`;
- the screenshot's Contacts Import sheet has a `FlatList` and editable footer but no avoiding owner;
- `CategoryPickerSheet` uses immediate `autoFocus` in a native modal without an on-show focus handoff;
- Android keyboard layout mode is currently implicit rather than declared;
- host, vendor, and admin bottom tab bars do not set `tabBarHideOnKeyboard`.

This inconsistency explains why some fields appear correct while the same input component fails elsewhere.

### 8.2 Migration by container owner

Legend: **P0** screenshot/current-user blocking, **P1** normal product forms, **P2** admin/vendor completeness, **Inspect** no migration unless the input can enter an obscured region.

| Area | Container owners | Priority | Action |
|---|---|---:|---|
| Create event | `components/admin-dashboard/events/CreateEventForm.js` | P0 | Replace its ordinary form `ScrollView` with `KeyboardAwareFormScrollView`; all five shared steps benefit at once. |
| Update event | `screens/common/update-event/UpdateEventScreen.js` | P0 | Same replacement; update wrappers reuse create steps. |
| Contacts import | `components/createEvent/_components/ContactsImportModal.js` | P0 | Move to `KeyboardSafeModalSheet`, flexible list body, sticky category/Add footer. This directly fixes the screenshot. |
| Guest/category sheets | `CategoryPickerSheet`, `EditGuestOrModeratorsModal`, `ReuseGuestsModal`, `VCardImportModal`, `AddGuestOrmoderatorPopup` | P0/P1 | Use shared modal sheet; focus search on modal `onShow`; choose list/body/sticky-footer layout per content. |
| Create Step 3 editor modal | `components/createEvent/StepThree.js` | P1 | Replace local RN avoiding view/scroll pair with the shared aware owner; ensure canvas/preview coordinates are not resized when no input is active. |
| Auth/profile | Login, Signup, Forget/Reset Password, Complete Profile, Vendor Signup, Force Password Change | P1 | Replace repeated RN `KeyboardAvoidingView` + `ScrollView` pairs with the one shared form scroll owner. |
| Account/settings | `AccountSettings`, `BusinessSettings`, email verification, delete account confirmation | P1 | One aware screen owner for account settings; shared safe centered/sheet modal for confirmations/OTP. Avoid nested wrappers in child sections. |
| Tickets | `TicketModal`, `TicketRatingModal`, phone/attachment states | P1 | Migrate existing RN avoiding wrappers to `KeyboardSafeModalSheet`; preserve modal animation and scroll behavior. |
| Plans/checkout | Plans Summary, Add-ons Purchase, discount/payment inputs | P1 | Put the checkout scroll owner on the aware adapter; do not wrap individual cards. Verify StoreKit/Google Play native sheets separately. |
| Marketplace | filter popup/input owners and vendor search | P1/Inspect | Top search is already visible; migrate the filter modal/sheet, not the marketplace list unless a list footer becomes editable. |
| Event details/list actions | `EventDetailsScreen`, tabs/search, send/add guest modals | P1 | Keep top search ordinary if always visible; migrate add/send modal form owners. |
| Post event | `PostEventScreen`, thank-you and comment inputs | P1 | Replace the local RN avoiding/list composition with the proper aware-list or sticky-composer layout; never nest aware scrolls. |
| Guest portal/staff portal | `InvitationScreen`, `LoginView`, `PortalView`, `QRModal` | P1 | Aware page form/list owner; safe card modal for QR code entry. |
| Vendor account/services | Personal Info, Service Details, Additional Links, account setup/settings | P2 | Replace their top-level ordinary scroll form owner once; child field components remain unchanged. |
| Vendor modals | Add Service, phone-change OTP | P2 | Shared modal/small-card variants. |
| Admin creation/edit modals | Add Business/Host/Moderator, Manage Plan, Edit Plan, Discount, Notification, Assign/Resolve Ticket, Rating, Payment detail | P2 | Migrate the modal frame, not each form field. Remove duplicate RN avoiding views after migration. |
| Admin page searches | common `SearchBar`, host/event/ticket lists | Inspect | Usually top-visible and not affected. Use aware list adapter only where the editable search moves into a constrained modal or list footer. |
| Map/location | `MapPicker`, `LocationSelector` | P1 | Search modal becomes keyboard-safe; results stay virtualized; selection dismisses keyboard before closing. |

## 9. Exact first implementation slice

The first slice should prove the architecture and fix the reported flow:

1. install SDK-compatible dependencies and add root provider;
2. add shared constants and the three adapters;
3. explicitly set Android `resize`;
4. set `tabBarHideOnKeyboard: true` for host/vendor/admin;
5. migrate CreateEventForm and UpdateEventScreen scroll owners;
6. migrate ContactsImportModal;
7. migrate CategoryPickerSheet and its autofocus to modal `onShow`;
8. add guardrail tests and one device flow for the screenshot;
9. only after this slice passes, perform mechanical container migrations by the audit table.

This first slice fixes all Create/Update Event fields through two screen-owner changes, plus the separately presented sheets through their shared modal boundary.

## 10. Modal focus and transition rules

- Do not focus a modal input before the native modal reports `onShow`.
- If a base-screen input has the keyboard open when launching another editable modal, dismiss/transfer focus through the shared modal lifecycle; do not let two owners compete.
- Close buttons call keyboard dismissal before final unmount when an active input would otherwise leave a stale frame.
- Dropdowns/date pickers that do not need typing should not open the software keyboard.
- Selecting a search/category result dismisses the keyboard before closing/navigating if the transition otherwise tears.
- Android back closes the keyboard first according to native behavior, then the modal on a subsequent back action unless product requirements say otherwise.

## 11. Anti-patterns prohibited by the plan

- A focus-time `marginBottom`, `top`, or `translateY` on an input.
- Per-page `Keyboard.addListener` used only to calculate keyboard height/padding.
- `Dimensions.get("window").height - keyboardHeight` stored as page state.
- Delayed `scrollTo` calls with arbitrary 100/300/500 ms timers.
- A root-only `KeyboardAvoidingView` presented as a complete fix.
- Nested vertical `ScrollView` + `KeyboardAwareScrollView` owners.
- Wrapping `FlatList` in `ScrollView` and disabling virtualization.
- Stacking RN `KeyboardAvoidingView`, keyboard-controller avoiding view, Android resize, and manual bottom padding without one clear owner.
- Copying different `keyboardVerticalOffset` numbers into pages.
- Setting Android globally to `pan` to hide the underlying architecture problem.
- Using `keyboardShouldPersistTaps` as if it performs avoidance.
- Closing a modal immediately while the keyboard animation and focused input remain active.

## 12. Automated guardrails

Add static contract tests under `__tests__/keyboard/`:

1. root `App.js` contains exactly one `KeyboardProvider`;
2. `app.json` explicitly declares Android `softwareKeyboardLayoutMode: "resize"`;
3. all host/vendor/admin tab navigators set `tabBarHideOnKeyboard: true`;
4. raw React Native `KeyboardAvoidingView` is prohibited outside the shared adapter and a reviewed allowlist;
5. native `Modal` files containing editable inputs must use `KeyboardSafeModalSheet` or be explicitly allowlisted with a reason;
6. full-screen form owners must use `KeyboardAwareFormScrollView`;
7. no input primitive imports keyboard height/controller hooks;
8. no `Keyboard.addListener` + manual padding/translation pattern appears outside a specialized reviewed component;
9. no keyboard-aware scroll is nested in another known keyboard-aware owner;
10. keyboard constants/offsets come from the shared module, not page-local magic numbers.

Keep the static scan based on responsibilities, not on fragile formatting. The test should print actionable file paths when it fails.

Add component behavior tests for:

- default props and web fallback of `KeyboardAwareFormScrollView`;
- modal header/body/footer structure;
- `onShow` autofocus timing;
- sticky footer variant;
- prop/ref forwarding;
- no double safe-area padding;
- keyboard dismissal during modal close.

## 13. Device and E2E verification matrix

Static tests cannot prove visibility. The release gate requires real native builds.

### Required device states

| Platform | Keyboard/input state | Required coverage |
|---|---|---|
| iOS | English predictive keyboard | top/middle/bottom single-line fields; multiline growth; validation error. |
| iOS | Arabic predictive keyboard | same, including RTL caret and mixed Latin value. |
| iOS | number/phone/email/password | toolbar/Done behavior, autofill, no trapped keyboard. |
| iOS | hardware keyboard | no phantom inset or scroll jump. |
| Android | Gboard English/Arabic | same form and modal matrix. |
| Android | number/phone/password | resize and back-button behavior. |
| Both | smallest supported phone + 200% text | field, label, error, and action remain reachable. |

### Canonical flows

1. Create Event Step 1: focus Address and Time-adjacent fields near the lower viewport.
2. Create Event Step 2: focus Guest Name, Phone, Category.
3. Contacts Import: focus footer Category; type until text changes width; Add remains reachable.
4. Category Picker: modal opens, then search focuses; rows remain scrollable.
5. Update Event: repeat Steps 1 and 2.
6. Account Settings: focus every password field and trigger an error.
7. Ticket create/rating: focus multiline field and grow it.
8. Checkout: focus discount/card fields near sticky summary/actions.
9. Vendor Service form: focus the last field.
10. Admin Add/Edit modal: focus the last field and submit while keyboard is open.

### Measurable acceptance

For the focused control and its immediate error region:

```text
visibleBottom <= keyboardTop - 16px
visibleTop >= scrollViewportTop
```

Allow a smaller gap only when a native keyboard accessory view occupies the space and the caret remains fully visible. Capture before/after screenshots and screen recordings; keyboard motion should not flash, jump twice, or leave blank bottom space.

## 14. Rollout and risk control

1. Land shared architecture plus the Create/Update/Contacts proof slice.
2. Test development builds on one physical iPhone and one physical Android device.
3. Migrate existing RN avoiding-view screens next, because replacement is mechanical and removes inconsistent behavior.
4. Migrate the remaining native modal owners by shared layout variant.
5. Migrate vendor/admin form owners.
6. Enable the static rule in warning/report mode while the migration is incomplete.
7. Remove the allowlist and make the rule blocking once all editable boundaries are covered.
8. Release behind the normal mobile staged rollout and monitor input-related Sentry navigation/render errors; do not log entered values.

Main risks:

- double avoidance during partial migration;
- native dependency not present in an old development build;
- nested scroll owners;
- sticky footer consuming too much small-screen space;
- modal autofocus happening before presentation measurement;
- Android edge-to-edge/status-bar configuration changing effective insets;
- tests performed only in Expo web or a meeting screen-share instead of a production-like native build.

## 15. Definition of done

The keyboard project is complete only when:

1. every editable vertical region has exactly one declared keyboard owner;
2. every editable native modal uses the shared modal/sheet frame or a documented specialized equivalent;
3. the screenshot flow keeps category value/caret and Add action visible;
4. Create and Update Event obtain the fix from shared scroll owners, not step-local patches;
5. all host, vendor, admin, auth, and guest/staff editable surfaces pass the device matrix;
6. bottom tabs hide while typing;
7. Android resize policy is explicit and verified in a native build;
8. there are no duplicated keyboard listeners, magic offsets, focus margins, or delayed scroll hacks;
9. inputs remain responsible only for value, direction, validation, and focus semantics;
10. automated guardrails prevent a new unowned input modal/form from being merged.
