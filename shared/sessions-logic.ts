/* ═══════════════════════════════════════════════════════════════════════════
   THE SESSIONS SEARCH, as logic.

   Pure, deterministic, and shaped to the store it has to land on. The one
   design constraint that drove every decision in here:

     THE PRODUCTION STORE KEEPS ONE ARRAY.

   `searchStore.instance.filters` is a single list where every item carries
   `isEvent`, and `eventsOrder` is ONE value on the search instance. Today's UI
   is what splits that into two sections with two "+ Add" buttons; the payload
   never did. So the unified search this file models is not a new data model -
   it is the existing one, drawn once instead of twice. That is the whole reason
   Mehdi's "single button" is a cheap change rather than a migration.

   Everything a filter needs to be evaluated, ordered, counted or described
   lives here. The app decides how it looks; it never decides what it means.

   ⚠ No Math.random, no Date.now. Ages are minutes-ago integers.
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  CATALOGUE,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EVENT_PROPERTIES,
  SAVED_SEGMENTS,
  SESSIONS,
  VALUE_FIXTURES,
  type CatalogueEntry,
  type DataType,
  type IssueType,
  type SessionRow,
  type EventsOrder,
  type PropertyOrder,
  type SavedSegment,
  type SearchFilter,
  type ValueCandidate,
} from './sessions-data.ts';
import { DEFAULT_RANGE, minutesAgoWithin, type DateRangeValue } from './date-range.ts';

export type {
  CatalogueEntry,
  DataType,
  EventsOrder,
  IssueType,
  PropertyOrder,
  SavedSegment,
  SearchFilter,
  SessionRow,
  ValueCandidate,
};
export {
  CATALOGUE,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EVENT_PROPERTIES,
  SESSIONS,
  SAVED_SEGMENTS,
  VALUE_FIXTURES,
  bookmarked,
} from './sessions-data.ts';

/* ── OPERATORS ────────────────────────────────────────────────────────────────
   Copied from `app/mstore/types/filterConstants.ts`, values included, because
   the value is what goes over the wire. If a redesign invented `does_not_equal`
   where the backend says `!=`, the whole exercise would be a mock-up rather
   than a proposal.

   The `label` is the word drawn on the row. It is lower case and it reads as
   part of a sentence - "Country is not France" - because a row is a clause,
   not three form fields.
   ──────────────────────────────────────────────────────────────────────────── */

export interface Operator {
  value: string;
  label: string;
  /** No value field for these: the operator IS the whole clause. Production
   *  hides the value box for isAny / onAny / isUndefined; the same rule here,
   *  stated once as data instead of as a condition in a component. */
  nullary?: boolean;
}

export const OPERATORS: Record<DataType, readonly Operator[]> = {
  string: [
    { value: 'is', label: 'is' },
    { value: 'isAny', label: 'is any', nullary: true },
    { value: 'isNot', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'regex', label: 'regex' },
  ],
  number: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'does not equal' },
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' },
    { value: '>=', label: 'greater than or equals' },
    { value: '<=', label: 'less than or equals' },
  ],
  boolean: [
    { value: 'isTrue', label: 'is true', nullary: true },
    { value: 'isFalse', label: 'is false', nullary: true },
  ],
  array: [
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'hasAny', label: 'has any' },
    { value: 'isEmpty', label: 'is empty', nullary: true },
    { value: 'isNotEmpty', label: 'is not empty', nullary: true },
  ],
  /* The duration filter is special-cased in production too: one operator and a
     min/max pair rather than a value list. */
  duration: [{ value: '=', label: 'is' }],
};

export const operatorsFor = (t: DataType | undefined): readonly Operator[] =>
  OPERATORS[t ?? 'string'] ?? OPERATORS.string;

export const operatorLabel = (t: DataType | undefined, value: string): string =>
  operatorsFor(t).find((o) => o.value === value)?.label ?? value;

export const isNullary = (t: DataType | undefined, value: string): boolean =>
  operatorsFor(t).find((o) => o.value === value)?.nullary === true;

export const defaultOperator = (t: DataType | undefined): string => operatorsFor(t)[0]!.value;

/* ── THE SEARCH ───────────────────────────────────────────────────────────── */

/* ⚠ `SearchFilter`, `EventsOrder` and `PropertyOrder` MOVED TO
   `sessions-data.ts` on 2026-09-02, and are re-exported above so no callsite
   changed. They are store shapes - they mirror `searchStore.instance` - and
   data is the file whose job is "the API shapes". What forced it: a saved
   segment now carries its own rules, and a segment is a fixture, so the
   fixture file needs the type of a rule. The alternative was a second
   structural copy of the same interface, which is the thing this whole page
   was rebuilt to delete. */

/* THE WINDOW LIVES IN `shared/date-range.ts` since 2026-09-02, because four
   lists ask it and only this one could answer. What was here was a list of
   presets in minutes, which cannot express "the 3rd to the 18th" at all - so
   `custom` was a preset that quietly applied ninety days. See date-range.ts. */

/* ⚠ TWO FIELDS, AND IT IS A BACKEND LIMIT RATHER THAN A CHOICE (Mehdi,
   2026-09-02). Production offers exactly four orderings - `startTs-desc`,
   `startTs-asc`, `eventsCount-asc`, `eventsCount-desc` (see
   `SessionSort.tsx`'s `sortValues`) - and nothing else, because sorting on
   anything the index does not carry means reloading the whole list: "we have to
   reload the entire list because it might be like millions of sessions."

   So `errors` and `duration` are gone from here AND their column headers lose
   their sorters. A sortable header the backend cannot honour is the worst kind
   of affordance: it works in the prototype and gets filed as a bug later. */
export type SessionSortKey = 'recent' | 'oldest' | 'events' | 'fewest';

export const SORT_CHOICES: ReadonlyArray<{ value: SessionSortKey; label: string }> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'events', label: 'Most events' },
  { value: 'fewest', label: 'Fewest events' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   THE ISSUE-TYPE STRIP — removed on the morning of 2026-09-02 and restored the
   same evening, and BOTH instructions were Mehdi's.

   Morning: "keep only the all sessions and bookmarks, remove the other tabs."
   Evening: "we're missing the tabs for errors, this and that... it's an easy
   win, because it should be the same tabs as we have in tests."

   ⚠ IT IS ONE DECISION, NOT A REVERSAL, and the missing half arrived with the
   second half of the sentence: THE ERRORS COLUMN GOES, and the strip is what
   replaces it. "It would be too much data to read and people wouldn't get it.
   That's why we made it as tabs." A column of 134 error counts and a strip of
   six choices answer the same question; only one of them is readable.

   ── AND IT IS ITS OWN STATE, WHICH IS THE PART I GOT WRONG ────────────────
   Deleting it, the argument was that `issueType` is already a catalogue
   property, so a strip is a second path to one filter. Production says
   otherwise and the distinction is real: `searchStore.activeTags` is SINGLE
   select and separate from `filters`, exactly as the Tests page's status strip
   is separate from its six filter dimensions. One narrows to a kind; the other
   composes. Both exist in production and this now matches it.

   Labels are production's own (`Types/session/issue`), which is why
   `js_exception` reads "Errors" rather than "JS exception" - and that is the
   word Mehdi used for the tab.

   ⚠ `mouse_thrashing` is hidden, as production hides it. Production also shows
   Click Rage OR Tap Rage by the project's platform; this fixture is one project
   holding desktop and mobile sessions together, so both are offered.
   ═══════════════════════════════════════════════════════════════════════════ */

/** `all` is the empty selection rather than a seventh type - the same call the
 *  Issues page made about Category, and production's own `types.ALL`. */
export type SessionTag = 'all' | IssueType;

export const ISSUE_TABS: ReadonlyArray<{ value: SessionTag; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'js_exception', label: 'Errors' },
  { value: 'bad_request', label: 'Bad Requests' },
  { value: 'click_rage', label: 'Click Rage' },
  { value: 'tap_rage', label: 'Tap Rage' },
  { value: 'crash', label: 'Crashes' },
  { value: 'incident', label: 'Incidents' },
];

/** How many of `rows` carry a type. The strip prints it, and it is counted
 *  against everything the search and the window already left - so the figure
 *  on a tab is the length of the list that tab produces. */
export const issueTypeCount = (rows: readonly SessionRow[], t: SessionTag): number =>
  t === 'all' ? rows.length : rows.filter((s) => s.issueTypes.includes(t)).length;

/* ⚠ NO `errors` FIELD. It was a column for one day and production has never
   drawn one: `errorsCount` is declared on `ISession` and in `SessionItem`'s
   props and rendered nowhere. Mehdi, 2026-09-02, checking it live: "I don't
   think we have errors... no, we don't" - and the design reason, which is the
   one worth keeping: "it would be too much data to read and people wouldn't get
   it. THAT'S WHY WE MADE IT AS TABS."

   So the question the column answered - which of these went wrong - is answered
   by the issue-type strip instead, where it is one choice rather than 134
   figures. The field is still in the payload if it is ever wanted. */
export type SessionField =
  | 'started'
  | 'events'
  | 'pages'
  | 'duration'
  | 'location'
  | 'device'
  | 'metadata';

export const FIELD_CHOICES: ReadonlyArray<{ value: SessionField; label: string }> = [
  { value: 'started', label: 'Started' },
  { value: 'events', label: 'Events' },
  { value: 'pages', label: 'Pages' },
  { value: 'duration', label: 'Duration' },
  { value: 'location', label: 'Location' },
  { value: 'device', label: 'Device' },
  { value: 'metadata', label: 'Metadata' },
];

export interface SessionDisplay {
  sort: SessionSortKey;
  fields: readonly SessionField[];
  /** Rows you have already opened, out of the way. A third state rather than a
   *  switch, for the same reason the Issues page's hidden control has three:
   *  "only the ones I have not watched" is a real question. */
  viewed: 'show' | 'hide' | 'only';
}

/** ⚠ METADATA IS ON (Mehdi, 2026-09-02: "then it should be by default").
 *  It was opt-in, which put the one column carrying the customer's OWN
 *  vocabulary - plan, cohort, account - behind a menu, while six columns of
 *  ours were on. Pages is the only opt-in left. */
export const DEFAULT_DISPLAY: SessionDisplay = {
  sort: 'recent',
  fields: ['started', 'events', 'duration', 'location', 'device', 'metadata'],
  viewed: 'show',
};

/* ⚠ THREE SECTIONS SINCE 2026-09-02 (Mehdi: "what if segments were a whole
   new tab in sessions, instead of just a button on the top"). It is the right
   shape for the same reason Bookmarked is a tab and not a filter: a section
   REPLACES the body, a filter narrows it. Segments is not a narrower list of
   sessions - it is a list of a different thing. */
export type SessionTab = 'all' | 'bookmarks' | 'segments';

export interface SessionsState {
  tab: SessionTab;
  /** ONE array. Events and properties, in order, exactly as the store keeps it.
   *  ONE array is also all there is: there is no second filter field on this
   *  state, which is what makes "why is my list short" answerable by reading
   *  the card. */
  filters: SearchFilter[];
  eventsOrder: EventsOrder;
  /** The issue-type strip's own choice. Single, and separate from `filters`
   *  because production keeps it separate (`searchStore.activeTags`) and
   *  because it narrows to a KIND rather than composing. See ISSUE_TABS. */
  tag: SessionTag;
  range: DateRangeValue;
  display: SessionDisplay;
  page: number;
  /** The saved segment currently loaded, if any. */
  savedSegmentId?: string;
  dataState: 'ready' | 'loading' | 'empty';
}

export const PAGE_SIZE = 12;

export const INITIAL_SESSIONS_STATE: SessionsState = {
  tab: 'all',
  filters: [],
  eventsOrder: 'then',
  tag: 'all',
  range: DEFAULT_RANGE,
  display: DEFAULT_DISPLAY,
  page: 1,
  dataState: 'ready',
};

/* ═══════════════════════════════════════════════════════════════════════════
   THE SEGMENTS THE APP CURRENTLY HAS.

   ⚠ ONE MUTABLE IN THIS FILE, and it is here on purpose. Segments became
   editable on 2026-09-02 - created, re-ruled, renamed, deleted - and three
   things have to see those edits: the evaluator (a search can filter BY a
   segment), the catalogue (the picker offers segments as entries), and
   `entryOf` (a row has to be able to name its own subject). Every one of them
   is reached from a call that has no business taking a segments argument:
   threading it would have changed five signatures - `filterSessions`,
   `matchEvents`, `eventPosition`, `matchProperty`, `describeFilter` - so that
   a leaf could look up a name.

   This is also the shape production has: the evaluator reads a store. `SESSIONS`
   is a fixture and `SAVED_SEGMENTS` is its seed; what the user has now is this.

   ⚠ THE APP MUST KEEP IT CURRENT. `useSessions` calls `setLiveSegments` in an
   effect whenever its list changes. Miss that and a new segment counts zero
   sessions everywhere except in the drawer that made it, which is exactly the
   bug this replaced.
   ═══════════════════════════════════════════════════════════════════════════ */

let liveSegments: readonly SavedSegment[] = SAVED_SEGMENTS;

export function setLiveSegments(next: readonly SavedSegment[]): void {
  liveSegments = next;
}

export const segmentById = (id: string): SavedSegment | undefined =>
  liveSegments.find((x) => x.id === id);

/** The catalogue as it stands, which is the fixed part plus whatever segments
 *  exist right now. The picker's default list: a segment you just saved is a
 *  thing you can filter by, and having to reload to see it would say the
 *  opposite. */
export const catalogueNow = (): readonly CatalogueEntry[] => [
  ...CATALOGUE.filter((e) => e.category !== 'segments'),
  ...liveSegments.map((seg) => segmentEntry(seg)),
];

/** ⚠ `name` is the SEGMENT'S OWN NAME, which is what the backend key is for a
 *  segment - not a constant like `TAG_TRIGGER`. And `hasProperties: false`,
 *  because a segment is a search and a search has no properties of its own;
 *  that is production's rule rather than an omission. */
const segmentEntry = (seg: SavedSegment): CatalogueEntry => ({
  id: seg.id,
  name: seg.name,
  displayName: seg.name,
  category: 'segments',
  isEvent: true,
  dataType: 'string',
  hasProperties: false,
  hint: 'Saved segment',
});

/* ── the catalogue, looked up and grouped ─────────────────────────────────── */

const BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));
const PROP_BY_ID = new Map(EVENT_PROPERTIES.map((e) => [e.id, e]));

/** ⚠ Segments are resolved from the LIVE list first, so a renamed segment is
 *  renamed in every row that names it and a new one resolves at all. The map
 *  above is built once at load and cannot know about either. */
export const entryOf = (id: string): CatalogueEntry | undefined => {
  const seg = segmentById(id);
  if (seg) return segmentEntry(seg);
  return BY_ID.get(id) ?? PROP_BY_ID.get(id);
};

export const categoryLabel = (key: string): string =>
  CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

export interface CatalogueGroup {
  key: string;
  label: string;
  entries: CatalogueEntry[];
}

/** Grouped and ordered for the picker. Categories the API did not send simply
 *  do not appear - the order list is a preference, not a schema. */
export function groupCatalogue(entries: readonly CatalogueEntry[]): CatalogueGroup[] {
  const byCat = new Map<string, CatalogueEntry[]>();
  for (const e of entries) {
    const list = byCat.get(e.category) ?? [];
    list.push(e);
    byCat.set(e.category, list);
  }
  const known = CATEGORY_ORDER.filter((k) => byCat.has(k));
  const rest = [...byCat.keys()].filter((k) => !CATEGORY_ORDER.includes(k)).sort();
  return [...known, ...rest].map((key) => ({
    key,
    label: categoryLabel(key),
    entries: byCat.get(key)!,
  }));
}

/** The picker's search. Matches the entry's own name, its category's label and
 *  its hint, so typing "flag" finds the features and typing "rage" finds both
 *  the autocapture event and the saved segment. */
export function searchCatalogue(
  query: string,
  entries: readonly CatalogueEntry[] = CATALOGUE,
): CatalogueEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(
    (e) =>
      e.displayName.toLowerCase().includes(q) ||
      categoryLabel(e.category).toLowerCase().includes(q) ||
      (e.hint ?? '').toLowerCase().includes(q),
  );
}

/* ── building a row ───────────────────────────────────────────────────────── */

let seq = 0;
/** Row keys are a counter, not a timestamp: the fixture has to be identical
 *  between two renders of the same state. Callers that need a fresh search
 *  reset it. */
export const nextFilterKey = (): string => `f${(seq += 1)}`;
export const resetFilterKeys = (): void => {
  seq = 0;
};

export function makeFilter(entry: CatalogueEntry): SearchFilter {
  const base: SearchFilter = {
    key: nextFilterKey(),
    entryId: entry.id,
    isEvent: entry.isEvent,
    operator: entry.isEvent ? 'is' : defaultOperator(entry.dataType),
    value: [],
  };
  /* A segment or a feature carries its own id as the value and has nothing to
     choose - which is exactly what production does when it builds these. */
  if (entry.category === 'segments' || entry.category === 'features') {
    base.value = [entry.id];
  }
  if (entry.dataType === 'duration') {
    base.min = 0;
    base.max = 0;
  }
  if (entry.isEvent && entry.hasProperties) {
    base.properties = [];
    base.propertyOrder = 'and';
  }
  return base;
}

/* ── WHAT A SESSION CONTAINS ──────────────────────────────────────────────────
   ⚠ READ THIS BEFORE TRUSTING AN EVENT FILTER IN THE PROTOTYPE.

   The list payload carries no event stream - that is the boundary the whole
   redesign is drawn inside, and it is why the table shows counts rather than a
   journey. But the SEARCH is evaluated by the backend, which does have the
   events. So the fixture models what the backend knows: a deterministic,
   ordered event list per session, derived from the numbers the session already
   has.

   It is a stand-in and it is stated as one. What it buys is the only thing that
   matters for reviewing this design: THEN, AND and OR produce three different
   result counts, so the control in the header is demonstrably doing something.
   ──────────────────────────────────────────────────────────────────────────── */

const EVENT_IDS: readonly string[] = CATALOGUE.filter(
  (e) => e.isEvent && e.category !== 'segments' && e.category !== 'features',
).map((e) => e.id);

const eventCache = new Map<string, string[]>();

/** The ordered event ids a session contains.
 *
 *  TWO PROPERTIES IT HAS TO HAVE, and they pull against each other. The order
 *  must usually be the CATALOGUE'S order, because that order is the shape of a
 *  normal journey (search, then cart, then checkout) and a THEN sequence
 *  anybody would actually type has to match something. And it must SOMETIMES
 *  not be, or THEN and AND are the same question and the control in the header
 *  is decoration.
 *
 *  So: the subset is chosen by hash and kept in catalogue order, and a THIRD of
 *  sessions did it backwards. That is what makes the three orders three
 *  different counts, which `sessions-check` asserts. */
export function sessionEvents(s: SessionRow): string[] {
  const hit = eventCache.get(s.sessionId);
  if (hit) return hit;
  /* ~40% of the catalogue per session, and a busier session catches more of it
     because `eventsCount` moves the threshold. */
  const inSet = new Set(
    EVENT_IDS.filter((_, i) => (s.numericHash * (i + 3) + s.eventsCount) % 5 < 2),
  );
  /* The stand-in has to agree with the fields that are REAL: a session with
     errors contains the error event, whatever the hash says. */
  if (s.errorsCount > 0) inSet.add('error');
  if (s.issueTypes.includes('crash')) inSet.add('crash');
  if (s.issueTypes.includes('click_rage')) inSet.add('rageclick');
  const ordered = EVENT_IDS.filter((id) => inSet.has(id));
  const out = s.numericHash % 3 === 0 ? [...ordered].reverse() : ordered;
  eventCache.set(s.sessionId, out);
  return out;
}

/* ── WHAT ONE OCCURRENCE CARRIED ──────────────────────────────────────────────
   The second half of the event fixture, and it exists for one reason: the
   EVENT-LEVEL filter had nothing to filter.

   `sessionEvents` models WHICH events a session contains. That was enough while
   the funnel was decoration, and it stopped being enough the moment the two
   scopes had to be told apart on screen: a group filter narrows the session, an
   event filter narrows ONE EVENT, and if an event's properties are unreadable
   the two produce identical lists and the distinction is a caption.

   ⚠ THE VALUES COME FROM `VALUE_FIXTURES`, WITH ITS WEIGHTS. The picker draws a
   proportion bar off those weights, so an occurrence sampled from any other
   distribution would make the bar a lie - "/checkout, 31% of traffic" followed
   by a filter that returns four sessions. Same list, same weights, one source.

   Deterministic per (session, event, attribute): the same row filtered twice
   returns the same sessions, and a session that matched before an unrelated
   edit still matches after it.
   ──────────────────────────────────────────────────────────────────────────── */

export type EventAttributes = Record<string, string | number | undefined>;

/** Which attributes an event of this kind carries. Production fetches this per
 *  event (`filterStore.getEventFilters(id)`); here it is a table, because what
 *  the design needs is that DIFFERENT EVENTS OFFER DIFFERENT PROPERTIES - a
 *  network request has a status code and a rage click does not. */
const ATTRS_BY_EVENT: Record<string, readonly string[]> = {
  click: ['selector', 'label', 'url'],
  input: ['selector', 'label', 'url', 'value'],
  location: ['url'],
  rageclick: ['selector', 'label', 'url'],
  deadclick: ['selector', 'label', 'url'],
  error: ['value', 'url'],
  request: ['url', 'status', 'method', 'durationMs'],
  graphql: ['label', 'status', 'method', 'durationMs'],
  statechange: ['label', 'url'],
  crash: ['value'],
  taprage: ['selector', 'url'],
  swipe: ['selector', 'url'],
};
/** A customer's own event carries the page it fired on and nothing else the
 *  tracker can see. */
const DEFAULT_ATTRS: readonly string[] = ['url'];

export const attributesFor = (eventId: string): readonly string[] =>
  ATTRS_BY_EVENT[eventId] ?? DEFAULT_ATTRS;

/** FNV-1a over a string, avalanched. The same hash `avatar.ts` uses and for the
 *  same reason: the low bits of a plain FNV barely move between neighbouring
 *  keys, and every use of this is a modulo. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** One value from a weighted candidate list, chosen by hash. The weights are
 *  the picker's own, so a value holding a third of the bar holds roughly a
 *  third of the occurrences. */
function weightedPick(candidates: readonly ValueCandidate[], seed: number): string | undefined {
  if (candidates.length === 0) return undefined;
  const total = candidates.reduce((n, c) => n + c.weight, 0);
  let at = seed % total;
  for (const c of candidates) {
    if (at < c.weight) return c.value;
    at -= c.weight;
  }
  return candidates[candidates.length - 1]!.value;
}

const attrCache = new Map<string, EventAttributes>();

/** What this session's occurrence of this event carried. */
export function eventAttributes(s: SessionRow, eventId: string): EventAttributes {
  const cacheKey = `${s.sessionId}\u0000${eventId}`;
  const hit = attrCache.get(cacheKey);
  if (hit) return hit;
  const out: EventAttributes = {};
  for (const name of attributesFor(eventId)) {
    const seed = hash32(`${s.sessionId}|${eventId}|${name}`);
    if (name === 'durationMs') {
      /* A long tail, because that is what request timings are: most fast, a few
         awful. The threshold filter is only interesting if both exist. */
      out[name] = 20 + (seed % 40) * (seed % 17 === 0 ? 120 : 6);
      continue;
    }
    const picked = weightedPick(VALUE_FIXTURES[name] ?? [], seed);
    if (picked != null) out[name] = picked;
  }
  attrCache.set(cacheKey, out);
  return out;
}

/**
 * Whether a session is in a saved segment - by RUNNING THE SEGMENT'S OWN RULES.
 *
 * ⚠ This used to be a switch with one `case` per segment, saying in TypeScript
 * what a segment is supposed to hold as data. Two things were wrong with it and
 * only one was obvious. The obvious one: a segment's rules could not be read,
 * edited or shown, so the tab and the drawer Mehdi asked for had nothing to
 * draw. The other: it was a SECOND definition of the same segment, so the day
 * somebody edited "Mobile rage clicks" the list it produced would have gone on
 * matching the old rule with no error anywhere.
 *
 * Now a segment is evaluated by the same two functions the live search is, so
 * "what does this segment contain" and "what does this search contain" cannot
 * give different answers.
 *
 * ⚠ `seen` guards the one thing rules-as-data allows that a switch did not: a
 * segment whose rules name a segment. Production allows it too; what it must
 * not do is recurse forever. A cycle matches nothing, which is the honest
 * answer to "sessions in a segment that is defined as being in itself".
 */
function inSegment(s: SessionRow, segmentId: string, seen: ReadonlySet<string> = new Set()): boolean {
  if (seen.has(segmentId)) return false;
  const seg = segmentById(segmentId);
  if (!seg) return false;
  const { events, properties } = splitFilters(seg.filters);
  const inner = new Set([...seen, segmentId]);
  return (
    properties.every((f) => matchProperty(s, f)) && matchEvents(s, events, seg.eventsOrder, inner)
  );
}

/**
 * THE FILTER, AS ONE LINE OF ENGLISH.
 *
 * It was a local `sentence()` inside SearchCard, which was fine while the card
 * was the only thing that had to say what a search contains. It now has three
 * callers - the collapsed strip, the live region a screen reader hears, and
 * every row of the segments tab - and a segment IS a saved search, so the
 * sentence a segment prints and the sentence the card prints have to be the
 * same sentence or the two stop looking like one idea.
 */
export function describeRules(
  events: readonly SearchFilter[],
  properties: readonly SearchFilter[],
  order: EventsOrder,
): string {
  if (!events.length && !properties.length) return 'Every session';
  const parts: string[] = [];
  if (events.length) parts.push(events.map(describeFilter).join(` ${order} `));
  if (properties.length) parts.push(properties.map(describeFilter).join(' and '));
  return parts.join(', ');
}

/** A segment's own rules as that sentence. */
export const describeSegment = (seg: SavedSegment): string => {
  const { events, properties } = splitFilters(seg.filters);
  return describeRules(events, properties, seg.eventsOrder);
};

/**
 * How many of `rows` a segment holds. The tab prints it beside every segment,
 * and it is the same count the list would show if you applied it.
 *
 * ⚠ IT TAKES THE SEGMENT, not its id. Called with an id it resolved through the
 * live registry, which is right for a row inside a search and wrong for the tab
 * - the tab is drawing a segment it holds in its own state, sometimes one that
 * has not been saved yet, and looking it up by id to count it meant a new
 * segment reported zero sessions in the same list that had just created it.
 */
export const segmentCount = (seg: SavedSegment, rows: readonly SessionRow[]): number => {
  const { events, properties } = splitFilters(seg.filters);
  return rows.filter(
    (s) => properties.every((f) => matchProperty(s, f)) && matchEvents(s, events, seg.eventsOrder),
  ).length;
};

/* ── evaluating a filter ──────────────────────────────────────────────────── */

/** The session's own value for a property entry. `null` means the session does
 *  not carry that field at all, which `isBlank`-style operators care about. */
function fieldValue(s: SessionRow, entryId: string): string | number | boolean | string[] | null {
  if (entryId.startsWith('meta.')) return s.metadata[entryId.slice(5)] ?? null;
  switch (entryId) {
    case 'userId':
      return s.userId ?? null;
    case 'userAnonymousId':
      return s.userAnonymousId;
    case 'userCountry':
      return s.country;
    case 'userCity':
      return s.city;
    case 'userState':
      return s.city;
    case 'duration':
      return s.durationSec;
    case 'eventsCount':
      return s.eventsCount;
    case 'errorsCount':
      return s.errorsCount;
    case 'pagesCount':
      return s.pagesCount;
    case 'viewed':
      return s.viewed;
    case 'favorite':
      return s.favorite;
    case 'issueType':
      return s.issueTypes;
    case 'userBrowser':
      return s.browser;
    case 'userOs':
      return s.os;
    case 'userDeviceType':
      return s.deviceType;
    case 'platform':
      return s.deviceType === 'desktop' ? 'web' : s.os === 'iOS' ? 'ios' : 'android';
    default:
      return null;
  }
}

function matchString(op: string, actual: string, values: string[]): boolean {
  const a = actual.toLowerCase();
  const vs = values.filter(Boolean).map((v) => v.toLowerCase());
  if (vs.length === 0) return true; /* an unfilled row narrows nothing */
  switch (op) {
    case 'is':
      return vs.includes(a);
    case 'isNot':
      return !vs.includes(a);
    case 'contains':
      return vs.some((v) => a.includes(v));
    case 'notContains':
      return !vs.some((v) => a.includes(v));
    case 'startsWith':
      return vs.some((v) => a.startsWith(v));
    case 'endsWith':
      return vs.some((v) => a.endsWith(v));
    case 'regex':
      /* A bad pattern matches nothing rather than throwing: somebody is typing. */
      return vs.some((v) => {
        try {
          return new RegExp(v, 'i').test(actual);
        } catch {
          return false;
        }
      });
    default:
      return true;
  }
}

function matchNumber(op: string, actual: number, values: string[]): boolean {
  const v = Number(values[0]);
  if (values.length === 0 || Number.isNaN(v)) return true;
  switch (op) {
    case '=':
      return actual === v;
    case '!=':
      return actual !== v;
    case '>':
      return actual > v;
    case '<':
      return actual < v;
    case '>=':
      return actual >= v;
    case '<=':
      return actual <= v;
    default:
      return true;
  }
}

function matchArray(op: string, actual: string[], values: string[]): boolean {
  switch (op) {
    case 'isEmpty':
      return actual.length === 0;
    case 'isNotEmpty':
      return actual.length > 0;
    case 'contains':
      return values.length === 0 || values.every((v) => actual.includes(v));
    case 'notContains':
      return values.length === 0 || !values.some((v) => actual.includes(v));
    case 'hasAny':
      return values.length === 0 || values.some((v) => actual.includes(v));
    default:
      return true;
  }
}

/** One property row against one session. */
export function matchProperty(s: SessionRow, f: SearchFilter): boolean {
  const entry = entryOf(f.entryId);
  if (!entry) return true;
  if (entry.dataType === 'duration') {
    const lo = f.min ?? 0;
    const hi = f.max ?? 0;
    if (!lo && !hi) return true;
    return s.durationSec >= (lo || 0) && (hi ? s.durationSec <= hi : true);
  }
  const actual = fieldValue(s, f.entryId);
  if (entry.dataType === 'boolean') {
    return f.operator === 'isTrue' ? actual === true : actual === false;
  }
  if (entry.dataType === 'array') {
    return matchArray(f.operator, Array.isArray(actual) ? actual : [], f.value);
  }
  if (f.operator === 'isAny') return actual != null;
  if (actual == null) return false;
  if (entry.dataType === 'number') return matchNumber(f.operator, Number(actual), f.value);
  return matchString(f.operator, String(actual), f.value);
}

/**
 * Where an event row sits in the session's own event order, or -1.
 *
 * ⚠ AND IT NOW HONOURS THE ROW'S OWN PROPERTIES, which is the whole difference
 * between the two scopes Mehdi walked through on 2026-09-02. Until 09-04 the
 * funnel wrote sub-rows that `matchEvents` never read: "Click where URL is
 * /checkout" returned exactly what "Click" returned, so the control that
 * expresses event scope was the one control on the page that could not change
 * a result. A distinction you cannot demonstrate is a distinction the reviewer
 * has to take on trust, and this one is the point of the section headings.
 *
 * An event's occurrence carries attributes (`eventAttributes`), so a property
 * on the row is matched against THAT OCCURRENCE and nothing else - while a
 * group filter is matched against the session. That is the contrast in one
 * sentence, and now both halves of it are true.
 */
export function eventPosition(s: SessionRow, f: SearchFilter, seen?: ReadonlySet<string>): number {
  const entry = entryOf(f.entryId);
  if (!entry) return -1;
  /* ⚠ NEITHER TAKES PROPERTIES, and production says so too: `hasProperties` is
     false on both, so the funnel never appears on them and there is nothing to
     honour here. */
  if (entry.category === 'segments') return inSegment(s, entry.id, seen) ? 0 : -1;
  if (entry.category === 'features') {
    /* a flag is on for roughly a third of sessions, deterministically */
    return s.numericHash % 3 === 0 ? 0 : -1;
  }
  const at = sessionEvents(s).indexOf(entry.id);
  if (at < 0) return -1;
  const props = f.properties?.filter((p) => !isIncomplete(p)) ?? [];
  if (props.length === 0) return at;
  const attrs = eventAttributes(s, entry.id);
  const hit = (p: SearchFilter) => matchAttribute(attrs, p);
  /* ⚠ THE SAME AND/OR THE ROW PRINTS. `propertyOrder` is what the "where … and
     … or …" rail edits, so reading it here is what makes those words mean
     something. Defaulting to `and` matches the row's own default. */
  const ok = (f.propertyOrder ?? 'and') === 'or' ? props.some(hit) : props.every(hit);
  return ok ? at : -1;
}

/** One property of an event's own occurrence. Same operator semantics as a
 *  session property - `matchProperty` and this differ only in where the value
 *  comes from, which is exactly the scope difference and nothing else. */
function matchAttribute(attrs: EventAttributes, f: SearchFilter): boolean {
  const entry = entryOf(f.entryId);
  if (!entry) return true;
  const actual = attrs[f.entryId];
  if (f.operator === 'isAny') return actual != null;
  if (actual == null) return false;
  if (entry.dataType === 'number') return matchNumber(f.operator, Number(actual), f.value);
  return matchString(f.operator, String(actual), f.value);
}

/** The events clause, under whichever of the three orders is set.
 *
 *  THEN is a sequence: every event present, in the order the rows are in.
 *  AND is presence in any order. OR is any one of them. Which is exactly what
 *  `eventsOrder` means to the backend, and the reason it is one value for the
 *  whole search rather than one per gap. */
export function matchEvents(
  s: SessionRow,
  events: SearchFilter[],
  order: EventsOrder,
  seen?: ReadonlySet<string>,
): boolean {
  if (events.length === 0) return true;
  const positions = events.map((f) => eventPosition(s, f, seen));
  if (order === 'or') return positions.some((p) => p >= 0);
  if (positions.some((p) => p < 0)) return false;
  if (order === 'and') return true;
  /* then: strictly increasing */
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i]! <= positions[i - 1]!) return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE ELEVEN VERBS, AS ARRAY TRANSFORMS.

   Every one of these lived inside `useSessions` as a `setState` updater, which
   was fine while the live search was the only thing in the app holding a list
   of filter rows. It is not, since 2026-09-02: A SEGMENT IS ONE SAVED SEARCH,
   so the segment drawer edits the same rows with the same verbs, and the only
   difference between the two is where the array is kept.

   So the verbs are `SearchFilter[] -> SearchFilter[]` here, and React binds
   them - twice, to two different owners. Copying them into the drawer would
   have been eleven chances for "add an event" to mean something subtly
   different in the two places you can do it.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Events keep their sequence and properties follow them, so a new event lands
 *  after the last event rather than at the end of everything. The array stays
 *  ONE array; only the insertion point knows about kind. */
/**
 * Narrow a search to ONE PERSON, which is what clicking a name in the list
 * does.
 *
 * ⚠ IT REPLACES RATHER THAN APPENDS, and that is the whole design of it. The
 * two identity properties are `userId` and `userAnonymousId`, and both are
 * single-valued per session - so a second one added beside the first is two
 * conditions that cannot both be true, and the list goes empty. Clicking a
 * second name has to mean *show me this person instead*, because there is no
 * reading of it that means *and*.
 *
 * Everything else in the search survives. Clicking a name inside a search for
 * rage clicks on iOS asks "which of these are hers", not "start again".
 */
export function filterToIdentity(
  rules: readonly SearchFilter[],
  entry: CatalogueEntry,
  value: string,
): SearchFilter[] {
  const kept = rules.filter((f) => f.entryId !== 'userId' && f.entryId !== 'userAnonymousId');
  const f: SearchFilter = { ...makeFilter(entry), operator: 'is', value: [value] };
  /* Properties sit after the events, which is where `addToRules` puts them and
     what the picker's two groups say they are: the events happened in an order,
     the conditions apply to the whole search. */
  return [...kept, f];
}

export function addToRules(rules: readonly SearchFilter[], entry: CatalogueEntry): SearchFilter[] {
  const f = makeFilter(entry);
  const at = f.isEvent ? rules.filter((x) => x.isEvent).length : rules.length;
  const next = [...rules];
  next.splice(at, 0, f);
  return next;
}

/** Several at once - what the sentence path hands back. Same rule about kind,
 *  applied to the whole batch. */
export const addManyToRules = (
  rules: readonly SearchFilter[],
  rows: readonly SearchFilter[],
): SearchFilter[] => [
  ...rules.filter((f) => f.isEvent),
  ...rows.filter((f) => f.isEvent),
  ...rules.filter((f) => !f.isEvent),
  ...rows.filter((f) => !f.isEvent),
];

export const updateInRules = (
  rules: readonly SearchFilter[],
  key: string,
  p: Partial<SearchFilter>,
): SearchFilter[] => rules.map((f) => (f.key === key ? { ...f, ...p } : f));

/** Replace a row's subject in place, keeping its position. This is production's
 *  "click the name and pick another" path, and it has to keep the row where it
 *  is: re-picking the second of three events must not send it to the bottom. */
export const replaceInRules = (
  rules: readonly SearchFilter[],
  key: string,
  entry: CatalogueEntry,
): SearchFilter[] => rules.map((f) => (f.key === key ? { ...makeFilter(entry), key: f.key } : f));

export const removeFromRules = (rules: readonly SearchFilter[], key: string): SearchFilter[] =>
  rules.filter((f) => f.key !== key);

/** Drag-to-reorder, over the EVENTS only. Both indices are event indices; this
 *  maps them back into the one array so the properties never move. */
export function moveEventInRules(
  rules: readonly SearchFilter[],
  from: number,
  to: number,
): SearchFilter[] {
  const events = rules.filter((f) => f.isEvent);
  if (from === to || from < 0 || to < 0 || from >= events.length || to >= events.length) {
    return [...rules];
  }
  const reordered = [...events];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved!);
  return [...reordered, ...rules.filter((f) => !f.isEvent)];
}

export const addPropertyInRules = (
  rules: readonly SearchFilter[],
  eventKey: string,
  entry: CatalogueEntry,
): SearchFilter[] =>
  rules.map((f) =>
    f.key === eventKey ? { ...f, properties: [...(f.properties ?? []), makeFilter(entry)] } : f,
  );

export const updatePropertyInRules = (
  rules: readonly SearchFilter[],
  eventKey: string,
  propKey: string,
  p: Partial<SearchFilter>,
): SearchFilter[] =>
  rules.map((f) =>
    f.key === eventKey
      ? { ...f, properties: (f.properties ?? []).map((x) => (x.key === propKey ? { ...x, ...p } : x)) }
      : f,
  );

export const removePropertyInRules = (
  rules: readonly SearchFilter[],
  eventKey: string,
  propKey: string,
): SearchFilter[] =>
  rules.map((f) =>
    f.key === eventKey
      ? { ...f, properties: (f.properties ?? []).filter((x) => x.key !== propKey) }
      : f,
  );

/** The word between an event's own properties. One value per event, as in
 *  production, and clicking it is the only way to change it. */
export const togglePropertyOrderInRules = (
  rules: readonly SearchFilter[],
  eventKey: string,
): SearchFilter[] =>
  rules.map((f) =>
    f.key === eventKey ? { ...f, propertyOrder: f.propertyOrder === 'or' ? 'and' : 'or' } : f,
  );


/* ── the list ─────────────────────────────────────────────────────────────── */

export const splitFilters = (filters: readonly SearchFilter[]) => ({
  events: filters.filter((f) => f.isEvent),
  properties: filters.filter((f) => !f.isEvent),
});

export function filterSessions(state: SessionsState, rows: readonly SessionRow[] = SESSIONS): SessionRow[] {
  const { events, properties } = splitFilters(state.filters);
  const out = rows.filter((s) => {
    if (state.tab === 'bookmarks' && !s.favorite) return false;
    if (state.tag !== 'all' && !s.issueTypes.includes(state.tag)) return false;
    /* The segments tab draws segments, not sessions - but the sessions it
       would have drawn are what every segment's count is measured against, so
       the pipeline runs and only the body of the page changes. */
    if (!minutesAgoWithin(s.startedAgoMin, state.range)) return false;
    if (state.display.viewed === 'hide' && s.viewed) return false;
    if (state.display.viewed === 'only' && !s.viewed) return false;
    if (!properties.every((f) => matchProperty(s, f))) return false;
    return matchEvents(s, events, state.eventsOrder);
  });
  return sortSessions(out, state.display.sort);
}

export function sortSessions(rows: SessionRow[], key: SessionSortKey): SessionRow[] {
  const out = [...rows];
  switch (key) {
    case 'recent':
      return out.sort((a, b) => a.startedAgoMin - b.startedAgoMin);
    case 'oldest':
      return out.sort((a, b) => b.startedAgoMin - a.startedAgoMin);
    case 'events':
      return out.sort((a, b) => b.eventsCount - a.eventsCount);
    case 'fewest':
      return out.sort((a, b) => a.eventsCount - b.eventsCount);
    default:
      return out;
  }
}

export const pageOf = (rows: readonly SessionRow[], page: number): SessionRow[] =>
  rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/* ── describing the search ────────────────────────────────────────────────── */

/** A row, as one line of English. Used by the collapsed summary, the saved
 *  segment list and the screen reader, so all three say the same thing. */
export function describeFilter(f: SearchFilter): string {
  const entry = entryOf(f.entryId);
  if (!entry) return 'Unknown filter';
  const name = entry.displayName;
  if (entry.category === 'segments') return `in ${name}`;
  if (entry.category === 'features') return `${name} is on`;
  if (entry.isEvent) {
    const props = f.properties?.length
      ? ` where ${f.properties.map(describeFilter).join(` ${f.propertyOrder ?? 'and'} `)}`
      : '';
    return `${name}${props}`;
  }
  if (entry.dataType === 'duration') {
    const lo = f.min ?? 0;
    const hi = f.max ?? 0;
    if (!lo && !hi) return `${name} is any`;
    if (lo && hi) return `${name} ${formatDuration(lo)} to ${formatDuration(hi)}`;
    return `${name} over ${formatDuration(lo || hi)}`;
  }
  const op = operatorLabel(entry.dataType, f.operator);
  if (isNullary(entry.dataType, f.operator)) return `${name} ${op}`;
  const vals = f.value.filter(Boolean);
  return vals.length ? `${name} ${op} ${vals.join(', ')}` : `${name} ${op}…`;
}

/** The live search's own sentence. One line, because `describeRules` above is
 *  the implementation and this is the state that happens to hold a search -
 *  there were two copies of this arithmetic for a day and they agreed by luck. */
export function describeSearch(state: SessionsState): string {
  const { events, properties } = splitFilters(state.filters);
  return describeRules(events, properties, state.eventsOrder);
}

/** A row is incomplete when its operator wants a value and it has none. The
 *  card marks these rather than silently ignoring them, which is what
 *  production does. */
export function isIncomplete(f: SearchFilter): boolean {
  const entry = entryOf(f.entryId);
  if (!entry || entry.isEvent) return false;
  if (entry.dataType === 'duration') return !(f.min || f.max);
  if (isNullary(entry.dataType, f.operator)) return false;
  return f.value.filter(Boolean).length === 0;
}

export const incompleteCount = (state: SessionsState): number =>
  state.filters.filter(isIncomplete).length;

/* ── formatting ───────────────────────────────────────────────────────────── */

/** "6m 03s". Seconds are two digits so a column of them shares an edge. */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

/* ── the display menu's own arithmetic ────────────────────────────────────── */

export function toggleSessionField(d: SessionDisplay, f: SessionField): SessionDisplay {
  const on = d.fields.includes(f);
  /* The last column cannot be turned off: a table with no columns is not a
     denser table. Same rule as the issues display. */
  if (on && d.fields.length === 1) return d;
  return { ...d, fields: on ? d.fields.filter((x) => x !== f) : [...d.fields, f] };
}

export function displayCount(d: SessionDisplay, base: SessionDisplay = DEFAULT_DISPLAY): number {
  let n = 0;
  if (d.sort !== base.sort) n += 1;
  if (d.viewed !== base.viewed) n += 1;
  const added = d.fields.filter((f) => !base.fields.includes(f)).length;
  const removed = base.fields.filter((f) => !d.fields.includes(f)).length;
  return n + added + removed;
}

/* ── the empty state ──────────────────────────────────────────────────────── */

export type EmptyReason = 'none' | 'no-data' | 'filters' | 'bookmarks' | 'range';

export function emptyReason(state: SessionsState, shown: number): EmptyReason {
  if (shown > 0) return 'none';
  if (state.dataState === 'empty') return 'no-data';
  if (state.tab === 'bookmarks' && state.filters.length === 0 && state.tag === 'all') return 'bookmarks';
  if (state.filters.length || state.tag !== 'all') return 'filters';
  return 'range';
}

/* ── NATURAL LANGUAGE ─────────────────────────────────────────────────────────
   `aiFiltersStore` exists in production and prints "Translating your query into
   search steps…", and nothing on the sessions bar opens it. Mehdi, 2026-09-02:
   it should be the same single button - you type, and if what you typed is not
   the name of a filter, the field offers to read it as a sentence.

   THIS IS A MOCK TRANSLATOR AND IT IS DELIBERATELY DUMB. It matches phrases and
   returns real `SearchFilter` rows, because the only question the design has to
   answer is what the affordance looks like and what comes back: a search you
   can then edit row by row, not a black box that returns a list. The real
   endpoint replaces `translate` and nothing else.
   ──────────────────────────────────────────────────────────────────────────── */

export interface Phrase {
  /** What has to appear in the sentence. */
  match: RegExp;
  /** The rows it becomes. */
  build: () => SearchFilter[];
  /** Printed as the step, so somebody can see what was understood. */
  says: string;
}

const withValue = (entryId: string, operator: string, value: string[]): SearchFilter => {
  const entry = entryOf(entryId)!;
  return { ...makeFilter(entry), operator, value };
};

export const PHRASES: readonly Phrase[] = [
  {
    match: /\brage\b|\bfrustrat/i,
    says: 'Rage click',
    build: () => [makeFilter(entryOf('rageclick')!)],
  },
  {
    match: /\berror|\bexception|\bfail/i,
    says: 'Errors count greater than 0',
    build: () => [withValue('errorsCount', '>', ['0'])],
  },
  {
    match: /\bcrash/i,
    says: 'Crash',
    build: () => [makeFilter(entryOf('crash')!)],
  },
  {
    match: /\bcheckout\b/i,
    says: 'checkout_start',
    build: () => [makeFilter(entryOf('checkout_start')!)],
  },
  {
    match: /\bmobile\b|\bphone\b/i,
    says: 'Device is mobile',
    build: () => [withValue('userDeviceType', 'is', ['mobile'])],
  },
  {
    match: /\bdesktop\b/i,
    says: 'Device is desktop',
    build: () => [withValue('userDeviceType', 'is', ['desktop'])],
  },
  {
    match: /\bpaid\b|\bpaying\b/i,
    says: 'plan is paid',
    build: () => [withValue('meta.plan', 'is', ['paid'])],
  },
  {
    match: /\btrial\b/i,
    says: 'plan is trial',
    build: () => [withValue('meta.plan', 'is', ['trial'])],
  },
  {
    match: /\bfrance\b|\bfrench\b/i,
    says: 'Country is France',
    build: () => [withValue('userCountry', 'is', ['France'])],
  },
  {
    match: /\bsafari\b/i,
    says: 'Browser is Safari',
    build: () => [withValue('userBrowser', 'is', ['Safari'])],
  },
  {
    match: /\bchrome\b/i,
    says: 'Browser is Chrome',
    build: () => [withValue('userBrowser', 'is', ['Chrome'])],
  },
  {
    match: /\blong(er)?\b|\bover (a|one)? ?(\d+)? ?minute/i,
    says: 'Duration over 5m',
    build: () => [{ ...makeFilter(entryOf('duration')!), min: 300 }],
  },
  {
    match: /\bnot (watched|viewed|seen)\b|\bunwatched\b|\bnew\b/i,
    says: 'Viewed is false',
    build: () => [withValue('viewed', 'isFalse', [])],
  },
  {
    match: /\bbounce|\bone page\b|\bsingle page\b/i,
    says: 'Pages count equals 1',
    build: () => [withValue('pagesCount', '=', ['1'])],
  },
];

export interface Translation {
  /** The rows the sentence became. Empty means nothing was understood. */
  filters: SearchFilter[];
  /** One line per phrase that matched, so the result is inspectable before it
   *  is accepted. */
  steps: string[];
  /** Words that matched nothing, printed so it is obvious what was ignored
   *  rather than silently dropped. */
  ignored: string[];
}

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'with', 'who', 'that',
  'show', 'me', 'find', 'all', 'sessions', 'session', 'users', 'user', 'people',
  'where', 'had', 'have', 'has', 'was', 'were', 'from', 'their', 'they', 'then',
]);

/** Read a sentence as a search. Returns rows, the steps it took, and the words
 *  it could not use - all three, because a translator that returns only the
 *  answer cannot be corrected. */
export function translate(query: string): Translation {
  const q = query.trim();
  if (!q) return { filters: [], steps: [], ignored: [] };
  const filters: SearchFilter[] = [];
  const steps: string[] = [];
  let consumed = q;
  for (const p of PHRASES) {
    const m = p.match.exec(q);
    if (!m) continue;
    filters.push(...p.build());
    steps.push(p.says);
    consumed = consumed.replace(p.match, ' ');
  }
  const ignored = consumed
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  /* Events first, then properties, so what comes back is already in the order
     the card draws - a translation that arrives shuffled reads as a different
     search from the one you asked for. */
  filters.sort((a, b) => Number(b.isEvent) - Number(a.isEvent));
  return { filters, steps, ignored: [...new Set(ignored)] };
}

/** Whether a typed string looks like prose rather than a filter name. Drives
 *  the picker's offer: two words that match no entry is a sentence. */
export function looksLikeSentence(query: string, matches: number): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 && matches === 0;
}

/* ── WHAT A VALUE FIELD OFFERS ────────────────────────────────────────────────
   Every candidate, with the SHARE of sessions it accounts for.

   The share is the most useful thing on the control and the reason production
   draws a bar under every row: it tells you whether a filter is worth applying
   BEFORE you apply it. "France 41" turns picking a value from a guess into a
   decision.

   COUNTED WHERE THE FIELD IS REAL. `userCountry`, `userBrowser`, `plan` and the
   rest read the sessions themselves, against whatever the date range and the
   other filters already left - so the menu and the table can never disagree,
   and the numbers move as the search narrows, which is what makes them worth
   reading. Where there is nothing on a session to count - a URL, a selector, an
   error string - the candidates come from `VALUE_FIXTURES` with weights.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ValueOption {
  value: string;
  /** How many sessions carry it. */
  count: number;
  /** 0..1 of the widest candidate, so the bars are comparable to each other
   *  rather than to the whole. A 4% winner next to a 3% runner-up says more as
   *  a full bar beside a three-quarter one than as two slivers. */
  share: number;
  /** Counted from the sessions, or listed in the fixture. Printed nowhere; it
   *  is here so a reviewer can tell which is which. */
  counted: boolean;
}

/** Which session field an entry reads, or null if it reads nothing. */
const COUNTABLE = new Set([
  'userCountry',
  'userCity',
  'userState',
  'userBrowser',
  'userOs',
  'userDeviceType',
  'platform',
  'issueType',
  'meta.plan',
  'meta.cohort',
]);

export function valueOptions(
  entryId: string,
  rows: readonly SessionRow[],
  query = '',
): ValueOption[] {
  const q = query.trim().toLowerCase();
  let out: ValueOption[];

  if (COUNTABLE.has(entryId)) {
    const tally = new Map<string, number>();
    for (const s of rows) {
      const v = fieldValue(s, entryId);
      if (v == null) continue;
      /* an array field contributes each of its members, which is what makes
         "issue type" answer "how many sessions have a crash" rather than "how
         many have exactly this set" */
      for (const one of Array.isArray(v) ? v : [String(v)]) {
        tally.set(one, (tally.get(one) ?? 0) + 1);
      }
    }
    out = [...tally.entries()]
      .map(([value, count]) => ({ value, count, share: 0, counted: true }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  } else {
    const fixture: readonly ValueCandidate[] = VALUE_FIXTURES[entryId] ?? [];
    out = fixture.map((c) => ({ value: c.value, count: c.weight, share: 0, counted: false }));
    /* A closed option set with no fixture still has to offer its options - a
       value field that lists nothing is worse than one that lists no counts. */
    if (out.length === 0) {
      const entry = entryOf(entryId);
      out = (entry?.options ?? []).map((v) => ({ value: v, count: 0, share: 0, counted: false }));
    }
  }

  const top = out.reduce((m, o) => Math.max(m, o.count), 0);
  const withShare = out.map((o) => ({ ...o, share: top ? o.count / top : 0 }));
  return q ? withShare.filter((o) => o.value.toLowerCase().includes(q)) : withShare;
}

/** Whether a value field has anything to offer at all. A free-text field with
 *  no fixture takes typed values only, and the picker says so rather than
 *  opening an empty menu. */
export const hasValueOptions = (entryId: string): boolean =>
  COUNTABLE.has(entryId) || (VALUE_FIXTURES[entryId]?.length ?? 0) > 0 ||
  (entryOf(entryId)?.options?.length ?? 0) > 0;
