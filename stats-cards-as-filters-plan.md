# Stats Cards as Table Filters — Implementation Plan

## Overview

Make the RSVP stats cards (Confirmed, Declined, Maybe, No Response, Checked In) on single-event pages act as clickable filters for the guest table/list below them.

---

## Pages That Need This Feature

| # | Platform | Page | Stats Component | List Component | Priority |
|---|----------|------|----------------|----------------|----------|
| 1 | **Web** | Host Event Detail | `EventStats` | `GuestTable` | High |
| 2 | **Web** | Admin Event Detail | `EventStats` (same) | `GuestTable` (same) | High |
| 3 | **Mobile** | Event Details Screen | `StatsCards` | `GuestListItem` list | High |
| 4 | **Mobile** | Staff Portal (`PortalView`) | `StatCard` × 4 | `GuestCard` FlatList | Low |

Pages 1–3 are the primary targets — they have RSVP stats directly above a guest list with **no status filter** today. Page 4 already has separate filter chips but the stat cards are redundant and should be unified.

### Pages NOT in scope

- Host events list / Admin events list — show aggregate event-count stats, not guest RSVP stats
- Home dashboard / Vendor dashboard — no guest lists
- `EventDetailsCard` (admin) — display-only, no guest list below
- Create-event flow (`EventSummary`) — no table below

---

## Current State

| Capability | Web | Mobile |
|-----------|-----|--------|
| Backend supports `?status=` filter on `GET /guests/events/:id` | Yes | Yes |
| Table component has built-in filter UI | Yes (`Table` has `showFilter` + `filterOptions`) | Partially (status filter chips exist in `PortalView` but unused on `EventDetailsScreen`) |
| Stats cards are clickable today | No | No |
| Any page filters guests by status | No | Only `PortalView` (via separate chips, not cards) |
| Text search filters guests | Yes (client-side, all columns) | Yes (client-side, name + phone only) |

---

## Architecture: Shared Filter State

The parent page owns the filter state. Both stats cards and table receive it:

```
┌──────────────────────────────────────────┐
│  Parent Page / Wrapper Component         │
│                                          │
│  const [statusFilter, setStatusFilter]   │
│    = useState(null)  // null = show all  │
│                                          │
│  ┌─────────────────┐  ┌───────────────┐  │
│  │   Stats Cards    │  │  Guest Table  │  │
│  │                  │  │               │  │
│  │ activeFilter=    │  │ filter=       │  │
│  │   statusFilter   │  │  statusFilter │  │
│  │                  │  │               │  │
│  │ onPress →        │  │               │  │
│  │ setStatusFilter  │  │               │  │
│  └─────────────────┘  └───────────────┘  │
└──────────────────────────────────────────┘
```

**Interaction:**
- Tap a stat card → sets filter to that status
- Tap the active card again → clears filter (show all)
- Both search and status filter apply simultaneously (AND logic)

---

## Web Implementation

### Files to change

| File | Change |
|------|--------|
| `labbe/components/event-detail/EventStats.jsx` | Accept `activeFilter` + `onFilterPress`; cards become clickable with highlight |
| `labbe/components/event-detail/GuestTable/GuestRows.jsx` | Accept `statusFilter`; pass `filterOptions` + `showFilter={true}` to `Table` |
| `labbe/components/event-detail/GuestTable/index.jsx` | Accept `statusFilter`; thread to `GuestRows` |
| `labbe/components/event-detail/EventDetailClient.jsx` | **New** — client wrapper that owns `statusFilter` state |
| `labbe/app/[lang]/host/events/[id]/page.jsx` | Replace individual `EventStats` + `GuestTable` with new wrapper |
| `labbe/app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx` | Same as host page |
| `labbe/ui/commen/new-table/Table.js` | May need `activeFilter` prop to sync dropdown with stat selection |

### Step-by-step

#### 1. `EventStats.jsx`

New props:

| Prop | Type | Description |
|------|------|-------------|
| `activeFilter` | `string \| null` | Currently selected status key, or `null` for "show all" |
| `onFilterPress` | `(key: string \| null) => void` | Called when a stat card is tapped |

Changes:
- Each `CardLayout` gets wrapped in a clickable element (`<button>` or `<div onClick>`)
- `cursor: pointer` on hover
- Active card: `outline: 2px solid currentColor` or `boxShadow` ring
- Click handler: if `activeFilter === cardKey` → call `onFilterPress(null)`; else → call `onFilterPress(cardKey)`

#### 2. `GuestRows.jsx`

New prop: `statusFilter` (`string | null`)

Changes:
- Build `filterOptions` array:
  ```js
  const filterOptions = [
    { label: t("all"), value: "" },
    { label: t("confirmed"), value: "confirmed" },
    { label: t("declined"), value: "declined" },
    { label: t("maybe"), value: "maybe" },
    { label: t("pending"), value: "invited" },
    { label: t("checkedIn"), value: "checked_in" },
  ];
  ```
- Pass `showFilter={true}` and `filterOptions={filterOptions}` to `Table`
- Pass `activeFilter={statusFilter}` if `Table` supports it (or extend `Table`)

#### 3. `GuestTable/index.jsx`

New prop: `statusFilter` (`string | null`)

- Thread to `<GuestRows statusFilter={statusFilter} />`

#### 4. New: `EventDetailClient.jsx`

```jsx
"use client";
import { useState } from "react";
import EventStats from "./EventStats";
import GuestTable from "./GuestTable";

export default function EventDetailClient({ eventId }) {
  const [statusFilter, setStatusFilter] = useState(null);

  return (
    <>
      <EventStats eventId={eventId} activeFilter={statusFilter} onFilterPress={setStatusFilter} />
      <GuestTable eventId={eventId} statusFilter={statusFilter} />
    </>
  );
}
```

#### 5. Host page (`page.jsx`)

Replace:
```jsx
<EventStats eventId={id} />
...
<GuestTable eventId={id} />
```

With:
```jsx
<EventDetailClient eventId={id} />
```

#### 6. Admin page (`EventDetailsContent.jsx`)

Same replacement as host page.

---

## Mobile Implementation

### Files to change

| File | Change |
|------|--------|
| `halla-mobile/components/events/StatsCards.js` | Accept `activeFilter` + `onFilterPress`; `TouchableOpacity` with highlight |
| `halla-mobile/screens/common/EventDetailsScreen.js` | Add `guestStatusFilter` state; wire to `StatsCards`; update `filteredGuests` |

### Step-by-step

#### 1. `StatsCards.js`

New props:

| Prop | Type | Description |
|------|------|-------------|
| `activeFilter` | `string \| null` | Currently selected status key, or `null` for "show all" |
| `onFilterPress` | `(key: string \| null) => void` | Called when a stat card is tapped |

Changes:
- Change `<View>` to `<TouchableOpacity>` with `onPress` on each card
- Active card style: `borderWidth: 2, borderColor: card.textColor`
- Toggle logic: tap active → `onFilterPress(null)`, tap other → `onFilterPress(key)`
- `activeOpacity={0.7}`

#### 2. `EventDetailsScreen.js`

New state:
```js
const [guestStatusFilter, setGuestStatusFilter] = useState(null);
// null = show all; "confirmed" | "declined" | "maybe" | "pending" = filter by that status
```

Updated `filteredGuests`:
```js
const filteredGuests = useMemo(() => {
  let result = guests;

  // Apply status filter
  if (guestStatusFilter) {
    // "confirmed" filter includes "checked_in" guests
    if (guestStatusFilter === "confirmed") {
      result = result.filter(g => g.status === "confirmed" || g.status === "checked_in");
    } else {
      result = result.filter(g => g.status === guestStatusFilter);
    }
  }

  // Apply text search
  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(g =>
      (g.name || "").toLowerCase().includes(q) ||
      (g.phone || "").includes(q)
    );
  }

  return result;
}, [guests, search, guestStatusFilter]);
```

Updated `StatsCards` usage:
```jsx
<StatsCards
  stats={stats}
  eventStatus={event?.status}
  activeFilter={guestStatusFilter}
  onFilterPress={setGuestStatusFilter}
/>
```

#### 3. Checked-in chip (separate row)

Also make the "Checked In" chip clickable:
```jsx
<TouchableOpacity
  style={styles.checkedInChip}
  onPress={() => setGuestStatusFilter(
    guestStatusFilter === "checked_in" ? null : "checked_in"
  )}
>
  {/* icon, label, value */}
</TouchableOpacity>
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| **"Confirmed" includes "checked_in"** | `checked_in` is a sub-status of confirmed. Filtering by "confirmed" must also show checked-in guests. |
| **Card not visible for event status** | Cards only render when relevant (e.g., "Checked In" only for live/completed). Filter can only be set for visible cards. |
| **Filter persists across tab switch** (mobile) | Yes. Switching between guests/moderators keeps the filter. Moderator list is not affected. |
| **Filter + search combined** | Both apply simultaneously (AND logic): first filter by status, then text search within results. |
| **Clearing the filter** | Tap the active stat card again → clear. Also show a small visual indicator on the active card (e.g., subtle "×" or chevron). |
| **No guests match filter** | Table shows empty state. Stat card still shows the total count for that status. |
| **Server-side vs client-side** | Client-side filtering for both platforms. Events rarely have thousands of guests. The backend `?status=` param is available for optimization later. |
| **`no_show` status** | Backend has it but frontend doesn't render a badge for it. Skip until badge is fixed. |

---

## What NOT to Change

- **Aggregate stats pages** (host events list, admin events list, home/vendor dashboards) — their stats are event counts, not guest RSVP stats
- **`PortalView`** (Staff Check-in) — already has working status filter chips. Stat cards there could optionally sync with the chip row as a future polish item
- **`EventDetailsCard`** (admin dashboard) — display-only, no guest list
- **Create-event flow** (`EventSummary`) — stats in creation/preview, no table

---

## Implementation Order (Recommended)

1. **Mobile first** — simpler architecture (all client-side, fewer components), quicker to verify
2. **Web** — requires coordinating `EventStats` → wrapper → `GuestTable` → `GuestRows` → `Table` across two pages

---

## Key File Paths Reference

### Web
| Path | Purpose |
|------|---------|
| `labbe/components/event-detail/EventStats.jsx` | RSVP stats cards |
| `labbe/components/event-detail/GuestTable/index.jsx` | Guest table container |
| `labbe/components/event-detail/GuestTable/GuestRows.jsx` | Table config (columns, filters, renderers) |
| `labbe/components/event-detail/GuestTable/GuestPopups.jsx` | Edit/delete/send popups |
| `labbe/components/event-detail/GuestTable/useGuestTableActions.js` | Action handlers |
| `labbe/ui/commen/new-table/Table.js` | Shared generic Table component |
| `labbe/app/[lang]/host/events/[id]/page.jsx` | Host single event page |
| `labbe/app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx` | Admin single event page |
| `labbe/hooks/events/queries/useEventGuests.js` | Guest data fetching hook |
| `labbe/hooks/events/queries/useSingleEventStats.js` | Stats data fetching hook |
| `labbe/components/event-detail/index.js` | Barrel exports |

### Mobile
| Path | Purpose |
|------|---------|
| `halla-mobile/components/events/StatsCards.js` | RSVP stats cards |
| `halla-mobile/screens/common/EventDetailsScreen.js` | Event details screen (host + admin) |
| `halla-mobile/components/events/GuestListItem.js` | Individual guest row |
| `halla-mobile/hooks/guests/queries.js` | `useEventGuests` hook |
| `halla-mobile/hooks/events/queries.js` | `useSingleEventStats` hook |

### Shared
| Path | Purpose |
|------|---------|
| `shared/src/constants/eventStatus.js` | `EVENT_STATUS`, `EVENT_STATUS_GROUPS` enum |
