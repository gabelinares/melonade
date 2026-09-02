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
  SESSIONS,
  VALUE_FIXTURES,
  type CatalogueEntry,
  type DataType,
  type IssueType,
  type SessionRow,
  type ValueCandidate,
} from './sessions-data.ts';

export type { CatalogueEntry, DataType, IssueType, SessionRow, ValueCandidate };
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

export type EventsOrder = 'then' | 'and' | 'or';
export type PropertyOrder = 'and' | 'or';

export interface SearchFilter {
  /** A row's own identity. Two rows can sit on the same catalogue entry - two
   *  Clicks in a sequence is the normal case - so the entry id cannot be the
   *  key. */
  key: string;
  entryId: string;
  isEvent: boolean;
  operator: string;
  /** Always an array, as in production, even for a single value. */
  value: string[];
  /** Duration only: seconds. Kept apart from `value` because the backend takes
   *  a pair, not a list. */
  min?: number;
  max?: number;
  /** An event's properties. Absent on properties themselves - the nesting is
   *  one level deep in production and there is no reason to model two. */
  properties?: SearchFilter[];
  /** One value per event, as in production: the word between an event's own
   *  properties, toggled by clicking it. */
  propertyOrder?: PropertyOrder;
}

export type DateRange = '24h' | '7d' | '30d' | 'custom';

export const DATE_RANGES: ReadonlyArray<{ value: DateRange; label: string; minutes: number }> = [
  { value: '24h', label: 'Past 24 hours', minutes: 24 * 60 },
  { value: '7d', label: 'Past 7 days', minutes: 7 * 24 * 60 },
  { value: '30d', label: 'Past 30 days', minutes: 30 * 24 * 60 },
  /* Custom carries the widest window here: a prototype has no date picker and
     a range that filtered nothing would look broken rather than unimplemented. */
  { value: 'custom', label: 'Custom range', minutes: 90 * 24 * 60 },
];

export const rangeMinutes = (r: DateRange): number =>
  DATE_RANGES.find((d) => d.value === r)!.minutes;

export type SessionSortKey = 'recent' | 'oldest' | 'events' | 'errors' | 'duration';

export const SORT_CHOICES: ReadonlyArray<{ value: SessionSortKey; label: string }> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'events', label: 'Most events' },
  { value: 'errors', label: 'Most errors' },
  { value: 'duration', label: 'Longest' },
];

/* ⚠ THE ISSUE-TYPE STRIP IS GONE (Mehdi, 2026-09-02: keep only the two tabs)
   AND SO IS ITS STATE. It used to be `issueTypes: IssueType[]` on the search,
   filtered separately in `filterSessions` - which was a SECOND path to a filter
   the catalogue already offers as `issueType`, an array property with the same
   five values and the same backend key. Two paths to one filter is the
   duplication this whole exercise is about deleting, and the property version
   is strictly better: it arrives through the one button, it composes with
   contains / has any / is empty, and the value picker shows each type's share
   of traffic where the strip could only show a count.

   The five labels now live in `sessions-data.ts` as that property's `options`.
   ─────────────────────────────────────────────────────────────────────────── */

export type SessionField =
  | 'started'
  | 'events'
  | 'errors'
  | 'pages'
  | 'duration'
  | 'location'
  | 'device'
  | 'metadata';

export const FIELD_CHOICES: ReadonlyArray<{ value: SessionField; label: string }> = [
  { value: 'started', label: 'Started' },
  { value: 'events', label: 'Events' },
  { value: 'errors', label: 'Errors' },
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

/** Eight columns is too many to read; the default is the six that answer
 *  "is this session worth watching". Pages and metadata are opt-in. */
export const DEFAULT_DISPLAY: SessionDisplay = {
  sort: 'recent',
  fields: ['started', 'events', 'errors', 'duration', 'location', 'device'],
  viewed: 'show',
};

export type SessionTab = 'all' | 'bookmarks';

export interface SessionsState {
  tab: SessionTab;
  /** ONE array. Events and properties, in order, exactly as the store keeps it.
   *  ONE array is also all there is: there is no second filter field on this
   *  state, which is what makes "why is my list short" answerable by reading
   *  the card. */
  filters: SearchFilter[];
  eventsOrder: EventsOrder;
  range: DateRange;
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
  range: '30d',
  display: DEFAULT_DISPLAY,
  page: 1,
  dataState: 'ready',
};

/* ── the catalogue, looked up and grouped ─────────────────────────────────── */

const BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));
const PROP_BY_ID = new Map(EVENT_PROPERTIES.map((e) => [e.id, e]));

export const entryOf = (id: string): CatalogueEntry | undefined =>
  BY_ID.get(id) ?? PROP_BY_ID.get(id);

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

/** Which saved segment a session belongs to. Deterministic, and only so a
 *  segment used as an event narrows the list rather than emptying it. */
function inSegment(s: SessionRow, segmentId: string): boolean {
  switch (segmentId) {
    case 'seg-118':
      return s.metadata.plan === 'paid';
    case 'seg-204':
      return s.deviceType === 'mobile' && s.issueTypes.includes('click_rage');
    case 'seg-311':
      return s.metadata.plan === 'trial';
    case 'seg-402':
      return s.issueTypes.includes('crash');
    default:
      return false;
  }
}

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

/** Where an event row sits in the session's own event order, or -1.
 *  An event's PROPERTIES cannot be evaluated against the fixture - the stand-in
 *  models which events a session contains, not what each one carried - so a
 *  property on an event narrows nothing here and says so in the row's own
 *  tooltip. That is the one place the prototype knowingly under-filters, and
 *  it is under rather than over on purpose. */
export function eventPosition(s: SessionRow, f: SearchFilter): number {
  const entry = entryOf(f.entryId);
  if (!entry) return -1;
  if (entry.category === 'segments') return inSegment(s, entry.id) ? 0 : -1;
  if (entry.category === 'features') {
    /* a flag is on for roughly a third of sessions, deterministically */
    return s.numericHash % 3 === 0 ? 0 : -1;
  }
  return sessionEvents(s).indexOf(entry.id);
}

/** The events clause, under whichever of the three orders is set.
 *
 *  THEN is a sequence: every event present, in the order the rows are in.
 *  AND is presence in any order. OR is any one of them. Which is exactly what
 *  `eventsOrder` means to the backend, and the reason it is one value for the
 *  whole search rather than one per gap. */
export function matchEvents(s: SessionRow, events: SearchFilter[], order: EventsOrder): boolean {
  if (events.length === 0) return true;
  const positions = events.map((f) => eventPosition(s, f));
  if (order === 'or') return positions.some((p) => p >= 0);
  if (positions.some((p) => p < 0)) return false;
  if (order === 'and') return true;
  /* then: strictly increasing */
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i]! <= positions[i - 1]!) return false;
  }
  return true;
}

/* ── the list ─────────────────────────────────────────────────────────────── */

export const splitFilters = (filters: readonly SearchFilter[]) => ({
  events: filters.filter((f) => f.isEvent),
  properties: filters.filter((f) => !f.isEvent),
});

export function filterSessions(state: SessionsState, rows: readonly SessionRow[] = SESSIONS): SessionRow[] {
  const { events, properties } = splitFilters(state.filters);
  const window = rangeMinutes(state.range);
  const out = rows.filter((s) => {
    if (state.tab === 'bookmarks' && !s.favorite) return false;
    if (s.startedAgoMin > window) return false;
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
    case 'errors':
      return out.sort((a, b) => b.errorsCount - a.errorsCount || b.eventsCount - a.eventsCount);
    case 'duration':
      return out.sort((a, b) => b.durationSec - a.durationSec);
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

export function describeSearch(state: SessionsState): string {
  const { events, properties } = splitFilters(state.filters);
  if (!events.length && !properties.length) return 'Every session';
  const parts: string[] = [];
  if (events.length) parts.push(events.map(describeFilter).join(` ${state.eventsOrder} `));
  if (properties.length) parts.push(properties.map(describeFilter).join(' and '));
  return parts.join(', ');
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
  if (state.tab === 'bookmarks' && state.filters.length === 0) return 'bookmarks';
  if (state.filters.length) return 'filters';
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
