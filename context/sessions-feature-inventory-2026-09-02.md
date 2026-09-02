# The Sessions page, as it exists — a feature inventory

Read out of `openreplay-repo/frontend` on 2026-09-02, branch
`fix/dark-mode-tokens-0818`. This is the list the redesign has to survive: every
one of these is either kept, moved, or explicitly dropped with a reason. Nothing
here needs a backend change to keep working, and the redesign must not introduce
one.

**Where each thing lives today**

```
SessionsTabOverview
├── NoSessionsMessage                      the project has never recorded
├── SearchActions                          title · Saved Segments · Clear
├── MainSearchBar → SessionFilters         THE CARD: Events + Filters   ← the target
└── widget-wrapper
    ├── SessionHeader                      tags · date range · sort
    ├── LatestSessionsMessage              "N new sessions"
    └── SessionList → SessionItem × n      the cards, then the pager
```

---

## A. The page shell

| # | Feature | Where |
| --- | --- | --- |
| 1 | Page title, which renames itself to **Vault** / **Bookmarks** on that tab | `SearchActions` |
| 2 | **Saved Segments**: open the list (right drawer), Save / Update segment, Share (writes `?sid=` to the clipboard) | `SavedSearch`, `SaveFilterButton` |
| 3 | **Clear** — wipes filters and the loaded saved search; disabled when there is nothing to clear | `SearchActions` |
| 4 | "No sessions recorded" banner when the project has never recorded | `NoSessionsMessage` |
| 5 | Recording-status indicator, polled every 5s | `RecordingStatus` |
| 6 | **AI / natural-language search**: `aiFiltersStore` exists and `SearchActions` renders "Translating your query into search steps…" — but there is **no entry point on the sessions bar today** | `aiFiltersStore` |

## B. The search card — Events and Filters

This is the piece being redesigned. **The store already keeps ONE array**:
`searchStore.instance.filters`, each item carrying `isEvent`. The two-section UI
is the only thing that splits them; the payload does not.

| # | Feature | Notes |
| --- | --- | --- |
| 7 | Two sections in one card: **Events** then **Filters**, divided by a rule | `SessionFilters` |
| 8 | Each section has its own **+ Add** button opening the same picker, scoped to `isEvent` / `!isEvent` | `FilterSelection` |
| 9 | **Events Order**: THEN / AND / OR, one value for the whole search, options gated per filter by `eventsOrderSupport`; refetches only when there is more than one event | `EventsOrder` |
| 10 | Event rows are **numbered 1..n and drag-to-reorder** (handle appears only when there is more than one), with a dashed drop indicator above/below the hovered row | `UnifiedFilterList` |
| 11 | Filter rows are **unordered**: no number, no handle, and an already-added property is disabled in the picker | `UnifiedFilterList` |
| 12 | **The picker**: 490px, debounced autofocused search, left category rail ("All Events" / "All Filters" + categories), virtualised right list, icon per kind (event = pointer, string = A-a, number = #), category printed on the item, two empty states ("No results found · Try different keywords", "All possible filters are added"), Escape closes | `FilterModal` |
| 13 | **Categories come from the backend.** `events` splits into `auto_captured` ("Autocapture") and `user_events` ("Events"); `features` become `TAG_TRIGGER` events; `segments` (saved searches) appear as events; any other category the API returns is passed through. `issue*` subcategories collapse into one `ISSUE` filter with the value pre-set | `filterStore.processFilterResponse` |
| 14 | **A row**: name button (icon + `category • name`) · source operator + source when `hasSource` · operator · value · add-property · remove | `FilterItem` |
| 15 | **Replace in place**: clicking the name button reopens the picker *at that filter's own category* | `initialCategory` |
| 16 | **Operators by data type** — string (is, is any, is not, contains, does not contain, starts with, ends with, regex), number (`=` `!=` `>` `<` `>=` `<=`), boolean, date, array, and a **duration** set for the autocaptured `duration` filter | `OPERATORS` |
| 17 | **Values**: remote autocomplete, local autocomplete, multi-value, dropdown, numerical, duration min/max, timestamp. `isAny` / `onAny` / `isUndefined` hide the value field entirely | `FilterValue` + 7 siblings |
| 18 | **Event properties (sub-filters)**: events only, never on `segments` or `features`; fetched per event; indented under the parent on a dashed rail; the first reads "where", the rest are a clickable AND/OR (`propertyOrder`) | `FilterItem` recursion |
| 19 | A separate **live** filter modal for the Assist variant | `LiveFilterModal` |

## C. The list header

| # | Feature | Notes |
| --- | --- | --- |
| 20 | **Issue-type segmented control**: All · JS Exception · Bad Request · Click Rage · Crash · Tap Rage · Incident. Platform-gated, collapses to a dropdown on mobile | `SessionTags` |
| 21 | **Date range**: Past 24 Hours · Past 7 Days · Past 30 Days · Custom Range | `SelectDateRange` |
| 22 | **Sort**: Newest · Oldest · Events Ascending · Events Descending | `SessionSort` |
| 23 | **Session settings** drawer: timezone (local vs the user's own), listing settings | `SessionSettingButton` |
| 24 | **"N new sessions"** message with a refresh action | `LatestSessionsMessage` |
| 25 | Total count | `sessionStore.total` |

## D. The session card

Everything below comes from the list payload. **Nothing else does** — no event
sequence, no thumbnail, no screenshot. That is the hard boundary on any redesign
of this card.

| # | Feature | Field |
| --- | --- | --- |
| 26 | Avatar, seeded and deterministic, with an active/live ring | `userNumericHash`, `active` |
| 27 | User display name, clickable to filter by that user; teal only when there is a real `userId` | `userDisplayName`, `userId`, `userAnonymousId` |
| 28 | Up to 3 metadata fields, each clickable to add itself as a filter | `metadata` |
| 29 | Started-at, in the chosen timezone, tooltip showing Local Time **and** the user's own time | `startedAt`, `timezone` |
| 30 | Events count · duration (a live session gets a running counter) | `eventsCount`, `duration`, `live` |
| 31 | Country flag with city/state | `userCountry`, `userCity`, `userState` |
| 32 | Browser · OS · device type | `userBrowser`, `userOs`, `userDeviceType` |
| 33 | **LAST PLAYED** label | `lastPlayedSessionId` |
| 34 | **CALL IN PROGRESS** label | `isCallActive`, `agentIds` |
| 35 | Play link with a **viewed / unviewed** state, hover prefetch, and the current query deep-linked so the player can highlight matching events | `viewed`, `queryParams` |
| 36 | Bookmark / favourite toggle (Vault on enterprise) | `favorite` |
| 37 | Multiview "add" mode, disabled when already added | `isAdd` |
| 38 | compact / slim / noWrap variants, used inside other surfaces | props |
| — | Also in the payload and **not shown on the card today**: `errorsCount`, `pagesCount`, `issueTypes`, `platform` | |

## E. The list

| # | Feature | Notes |
| --- | --- | --- |
| 39 | Pagination, total, and the no-content states | `SessionList` |
| 40 | Auto-refresh every 5 minutes; status poll every 5 seconds | `SessionList` |
| 41 | Sibling tabs: **Bookmarks / Vault**, **Notes** (notes carry tags and a team badge) | routes `/bookmarks`, `/notes` |

---

## What the redesign may and may not touch

**Free** — anything that is arrangement, wording, or drawing: how the picker is
laid out, where the operator lives, what the card leads with, which of the
payload's fields are shown, what the empty states say.

**Cheap** — anything that reads the *same* store differently.
`searchStore.instance.filters` is one array with `isEvent` per item, so a single
unified list is closer to the data than today's two sections. Same for
`eventsOrder`: one value on the search instance, wherever the control is drawn.

**Expensive, therefore out** — anything needing a field the list payload does
not carry. Specifically: a per-session **event sequence** or **journey strip**,
a **screenshot / still**, or **per-gap** event operators (the backend takes one
`eventsOrder` for the whole search, not one per pair).
