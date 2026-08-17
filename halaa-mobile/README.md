# Halaa Mobile (`halaa-mobile`)

The Halaa mobile app for **iOS, Android, and web**, built with **Expo SDK 54** and
**React Native 0.81**. One app serves hosts, vendors, admins, staff, and guests, in Arabic
(default, RTL) and English.

Part of the [Halaa monorepo](../README.md).

---

## Tech stack

| Area               | Choice                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| Runtime            | Expo SDK `54` · React Native `0.81.5` · React `19.1.0`                   |
| Navigation         | React Navigation `7` (native stack + bottom tabs)                       |
| Client state       | Zustand `5`                                                             |
| Server state       | TanStack React Query `5`                                                |
| HTTP client        | Axios with token-refresh + a custom `apiFetch` wrapper (auto-retry 401) |
| Forms / validation | React Hook Form + Zod (schemas shared from `@halaa/shared`)             |
| i18n               | i18next + react-i18next (`ar` default, `en`, RTL)                       |
| Fonts              | **Cairo only** (`@expo-google-fonts/cairo`) — applied app-wide          |
| Native modules     | Notifications, SecureStore, Location, Contacts, Image/Document Picker, Maps |
| Other              | QR codes (`react-native-qrcode-svg`), Excel export (`xlsx`)            |

> **Font note:** the app is Cairo-only by design. A global `Text` patch
> (`utils/fontOverride.js` + `utils/cairoFont.js`) applies Cairo to all text — don't introduce
> other font families.

---

## Prerequisites

- Node.js 20 LTS
- [Expo CLI](https://docs.expo.dev/) (runs via `npx expo`, included as a dependency)
- **Expo Go** app on a device, or an emulator/simulator, or an EAS dev client
- For native builds: an **Expo / EAS** account

---

## Getting started

From the monorepo root (workspaces install all packages):

```bash
npm install                 # run once at the repo root
```

Start the Expo dev server:

```bash
npm run start -w halaa-mobile   # or: cd halaa-mobile && npm start
```

Then press `i` (iOS), `a` (Android), or `w` (web) in the Expo CLI — or scan the QR code with
Expo Go.

---

## Scripts

| Script    | Command                       | Description                       |
| --------- | ----------------------------- | --------------------------------- |
| `start`   | `expo start`                  | Start the Metro / Expo dev server |
| `ios`     | `expo start --ios`            | Open in the iOS simulator         |
| `android` | `expo start --android`        | Open in the Android emulator      |
| `web`     | `expo start --web`            | Run in the browser                |
| `lint`    | `eslint . --max-warnings 0`   | Lint (zero-warning policy)        |

---

## Configuration

The API base URL is set in **`config/api.js`** (production: `https://halaa.com.sa/api/v2`).
Point this at your local backend during development.

Environment file — `halaa-mobile/.env`:

```bash
EXPO_PUBLIC_HALAA_WHATSAPP_NUMBER=966552619282
```

App config lives in `app.json` / `eas.json`:

- **Scheme / deep links:** `halaa://` plus universal links on `https://halaa.com.sa`
  (used for reset-password, invitation, and payment-return flows).
- **Permissions:** Location (fine/coarse) and Contacts (with an Arabic permission prompt).
- **New Architecture** is enabled.
- **EAS** build profiles (`development`, `preview`, `production`) are defined in `eas.json`.

---

## Project structure

```
halaa-mobile/
├── App.js            # entry: providers, fonts, navigation root
├── assets/           # icons, logos, splash
├── navigation/       # AppNavigator, AdminNavigator (stacks + tabs)
├── screens/          # screens by role: auth, host, vendor, admin, common, guest-portal, legal
├── components/        # feature components (createEvent, events, guests, plans, admin-dashboard…)
├── hooks/            # React Query hooks by feature (auth, events, guests, payments, admin…)
├── services/         # http.js (auth-aware fetch), secureStorage.js, authErrors.js
├── stores/           # Zustand stores (authStore)
├── contexts/         # QueryProvider, ToastContext
├── localization/     # i18next setup + locales (en, ar)  — see localization/README.md
├── config/           # api.js (base URL), React Query client
├── constants/        # statusColors, etc.
├── styles/           # design tokens, typography, colors  — see styles/README.md
└── utils/            # cairoFont, fontOverride, schemas, contacts, xlsx, payment browser…
```

There is additional documentation in [`localization/README.md`](localization/README.md)
(i18n usage) and [`styles/README.md`](styles/README.md) (design system).

---

## Roles & features

- **Host** — create-event wizard, guest lists & invitations, RSVP tracking, plans & checkout
  (Moyasar 3-D Secure), dashboard stats, post-event media sharing, staff access management.
- **Vendor** — public profile, service catalog, marketplace presence.
- **Admin** — manage hosts / vendors / moderators / business accounts, plan assignment,
  event moderation, payments, discounts & addons.
- **Guest** — open invitations via link (no login), RSVP, view event details.
- **Staff** — scoped guest-list access via staff tokens.
- **Cross-cutting** — Arabic/English with RTL, push notifications, contact import, file uploads,
  location selection, QR check-in.

---

## Building & releasing

Native builds and store submissions go through EAS:

```bash
eas build --platform ios
eas build --platform android
eas submit -p ios
eas submit -p android
```

(`production` builds auto-increment the version — see `eas.json`.)
