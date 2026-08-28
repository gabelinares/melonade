/* ══════════════════════════════════════════════════════════════════════════
   The Issues domain logic, shared by BOTH design options.

   Deliberately PURE: no React, no imports beyond the data file. Two reasons.

   1. The two options are a question about design, so they must differ in design
      only: same data, same filters, same derivations, same counts. If option B
      looked better because it also quietly changed the ranking, the comparison
      would be worthless.
   2. Each app owns its own React and its own node_modules. A hook living here
      would resolve a second copy of React and break hooks at runtime, so the
      layering is: pure domain here, a thin useState binding inside each app.
   ══════════════════════════════════════════════════════════════════════════ */

import {
  ALL_TAGS,
  CRITICAL_RULES,
  ISSUES,
  SEGMENTS,
  impactLevel,
  type CategoryName,
  type CriticalRule,
  type ImpactLevel,
  type Issue,
  type IssueSession,
} from './issues-data.ts';
/* The only other shared module this one reaches for, and only for the
   shortlist: how clearly a session fails is a fact about the recording, so it
   is read from the replay layer rather than re-derived here. */
import { durationSeconds, failureMoment, replayMarkers } from './replay.ts';

export type { CategoryName, CriticalRule, ImpactLevel, Issue, IssueSession };

/* ── criticality ──────────────────────────────────────────────────────────
   Criticality is DERIVED, never toggled: an agent flags an issue when it
   matches a plain-words description somebody wrote. So the logic needs to know
   which rule matched which issue.

   That mapping is explicit rather than a keyword search on purpose. A fuzzy
   matcher in a prototype produces different results as soon as anyone edits a
   description, and then a reviewer is debugging the demo instead of reading the
   design. The spread below is chosen to put all four flag states on screen at
   once, which is exactly what the live app fails to do: the two "someone
   flagged this" states are currently pixel-identical, to the point that the
   product owner did not know the distinction existed.
   ────────────────────────────────────────────────────────────────────────── */
export const RULE_MATCHES: Readonly<Record<number, readonly number[]>> = {
  1: [1, 3], //  mine, payment failures
  2: [2],    //  mine, checkout and cart
  3: [4],    //  Mehdi, slow on mobile
  4: [],     //  Nikita, signup and login: a real rule with no hits today
};

export type CriticalState = 'none' | 'team' | 'mine' | 'dismissed';
export type CaptureMode = 'full' | 'segments';
export type SortKey = 'impact' | 'recent' | 'title';
export type DataState = 'ready' | 'loading' | 'empty';

/* Every filter is a multi-select list, and an empty list means "no constraint".
 *
 * `criticalOnly` and `mineOnly` used to be two separate booleans, which could not
 * express the filter menu this now feeds: they made "critical to me" and
 * "critical to the team" mutually reinforcing rather than two values of one
 * dimension, and there was no way to ask for "not flagged" at all. One list over
 * CriticalState says all three and composes like every other dimension.
 *
 * `showHidden` stays a boolean and stays OUT of this shape's filter count,
 * because it is a display option rather than a filter: it widens the result set
 * instead of narrowing it, and it belongs with sort and grouping. */
export interface Filters {
  q: string;
  /* A LIST, not a single value. Category was the one single-select dimension,
     which made it a radio in a menu of checkboxes and meant you could not ask for
     "errors or slowness". There is no reason it should behave differently from
     impact or tags: an empty list means no constraint, exactly like the rest. */
  cats: CategoryName[];
  impact: ImpactLevel[];
  tags: string[];
  /** 'full' for the full-traffic baseline, or a segment id. */
  origins: (number | 'full')[];
  critical: CriticalState[];
  sort: SortKey;
}

/* ── display options ──────────────────────────────────────────────────────────
   Separate from Filters on purpose, and behind a separate control, because these
   do not narrow the result set: they change how it is ordered, grouped and
   drawn. Folding them into the filter badge would make it report a number the
   filter menu cannot account for.
   ────────────────────────────────────────────────────────────────────────── */

export type GroupKey = 'none' | 'impact' | 'category';
/** Three states, not a boolean. A boolean cannot say "show me only the ones I
 *  hid", which is the question you actually have when auditing what the agent
 *  was told to ignore. */
export type HiddenMode = 'hide' | 'show' | 'only';
export type FieldKey = 'impact' | 'category' | 'tags' | 'origin' | 'lastSeen' | 'sessions';

export interface Display {
  group: GroupKey;
  sort: SortKey;
  /** Descending is the default for impact and recency, where "most" is the
   *  interesting end. Ascending is only useful for the title. */
  sortDesc: boolean;
  hidden: HiddenMode;
  fields: FieldKey[];
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  cats: [],
  impact: [],
  tags: [],
  origins: [],
  critical: [],
  sort: 'impact',
};

export const DEFAULT_DISPLAY: Display = {
  group: 'none',
  sort: 'impact',
  sortDesc: true,
  hidden: 'hide',
  fields: ['impact', 'tags', 'origin', 'lastSeen'],
};

/** Everything the pure layer needs to answer a question about the list. */
export interface IssuesState {
  filters: Filters;
  display: Display;
  /** issue id -> the reason it was hidden */
  hidden: Record<number, string>;
  /** issue id -> I dropped its critical flag for myself */
  dropped: Record<number, true>;
  /** issue id -> the title I gave it */
  renamed: Record<number, string>;
  rules: CriticalRule[];
  dataState: DataState;
}

export const INITIAL_STATE: IssuesState = {
  filters: DEFAULT_FILTERS,
  display: DEFAULT_DISPLAY,
  hidden: {},
  dropped: {},
  renamed: {},
  rules: [...CRITICAL_RULES],
  dataState: 'ready',
};

export const PAGE_SIZE = 10;

export const DEFAULT_ACTIVE_SEGMENTS = SEGMENTS.filter((s) => s.active).map((s) => s.id);

/* ── derivations ─────────────────────────────────────────────────────────── */

export function matchedRules(state: IssuesState, id: number): CriticalRule[] {
  const byId = new Map(state.rules.map((r) => [r.id, r]));
  return Object.entries(RULE_MATCHES)
    .filter(([, ids]) => ids.includes(id))
    .map(([ruleId]) => byId.get(Number(ruleId)))
    .filter((r): r is CriticalRule => r != null);
}

export function criticalState(state: IssuesState, id: number): CriticalState {
  if (state.dropped[id]) return 'dismissed';
  const matches = matchedRules(state, id);
  if (matches.length === 0) return 'none';
  return matches.some((r) => r.mine) ? 'mine' : 'team';
}

export function titleOf(state: IssuesState, issue: Issue): string {
  return state.renamed[issue.id] ?? issue.head;
}

export function isFlagged(state: IssuesState, id: number): boolean {
  const s = criticalState(state, id);
  return s === 'mine' || s === 'team';
}

/** The whole filter + sort pipeline, in one place. */
export function filterIssues(state: IssuesState): Issue[] {
  if (state.dataState !== 'ready') return [];
  const { filters } = state;
  const q = filters.q.trim().toLowerCase();

  const list = ISSUES.filter((i) => {
    const isHidden = state.hidden[i.id] != null;
    if (state.display.hidden === 'hide' && isHidden) return false;
    if (state.display.hidden === 'only' && !isHidden) return false;
    if (filters.cats.length > 0 && !filters.cats.includes(i.cat)) return false;
    if (filters.impact.length > 0 && !filters.impact.includes(impactLevel(i.impact))) return false;
    if (
      filters.critical.length > 0 &&
      !filters.critical.includes(criticalState(state, i.id))
    ) {
      return false;
    }
    if (filters.tags.length > 0 && !filters.tags.some((t) => i.tags.includes(t))) return false;
    if (filters.origins.length > 0) {
      const origin: number | 'full' = i.segmentId ?? 'full';
      if (!filters.origins.includes(origin)) return false;
    }
    if (q) {
      const haystack = `${titleOf(state, i)} ${i.cat} ${i.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  /* One comparator, then flip it, rather than a descending branch per key. A
     per-key branch is how a sort direction ends up correct for two of three
     columns. */
  const dir = state.display.sortDesc ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (state.display.sort) {
      case 'recent':
        return (a.seenAgoMin - b.seenAgoMin) * dir;
      case 'title':
        return titleOf(state, a).localeCompare(titleOf(state, b)) * -dir;
      case 'impact':
      default:
        return (b.impact - a.impact) * dir;
    }
  });
}

/* ── grouping ─────────────────────────────────────────────────────────────── */

export interface IssueGroup {
  key: string;
  /** Empty when there is one group, so a renderer can skip the header entirely
   *  rather than draw a header that says nothing. */
  label: string;
  issues: Issue[];
}

export function groupIssues(state: IssuesState, issues: Issue[]): IssueGroup[] {
  switch (state.display.group) {
    case 'impact': {
      const order: ImpactLevel[] = ['High', 'Medium', 'Low'];
      return order
        .map((level) => ({
          key: level,
          label: `${level} impact`,
          issues: issues.filter((i) => impactLevel(i.impact) === level),
        }))
        .filter((g) => g.issues.length > 0);
    }
    case 'category': {
      const order: CategoryName[] = ['Errors', 'UI/UX', 'Slowness'];
      return order
        .map((c) => ({ key: c, label: c, issues: issues.filter((i) => i.cat === c) }))
        .filter((g) => g.issues.length > 0);
    }
    case 'none':
    default:
      return issues.length ? [{ key: 'all', label: '', issues }] : [];
  }
}

/* ── the display menu's contents, described once ──────────────────────────── */

export interface DisplayChoice<T extends string> {
  value: T;
  label: string;
}

export const GROUP_CHOICES: DisplayChoice<GroupKey>[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'impact', label: 'Impact' },
  { value: 'category', label: 'Category' },
];

export const SORT_CHOICES: DisplayChoice<SortKey>[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'recent', label: 'Last seen' },
  { value: 'title', label: 'Title' },
];

export const HIDDEN_CHOICES: DisplayChoice<HiddenMode>[] = [
  { value: 'hide', label: 'Exclude' },
  { value: 'show', label: 'Include' },
  { value: 'only', label: 'Only hidden' },
];

export const FIELD_CHOICES: DisplayChoice<FieldKey>[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'category', label: 'Category' },
  { value: 'tags', label: 'Tags' },
  { value: 'origin', label: 'Found in' },
  { value: 'lastSeen', label: 'Last seen' },
  { value: 'sessions', label: 'Sessions' },
];

export function toggleField(d: Display, field: FieldKey): Display {
  return {
    ...d,
    fields: d.fields.includes(field)
      ? d.fields.filter((f) => f !== field)
      : [...d.fields, field],
  };
}

/** How far the display differs from THIS APP'S baseline, for the control's badge.
 *
 *  The baseline is a parameter rather than DEFAULT_DISPLAY, because the two
 *  options start from different places: the triage option groups by impact out of
 *  the box and shows a different field set. Measuring both against the shared
 *  default made the triage option's badge read "2" before anyone touched it,
 *  which is a badge reporting the difference between two defaults rather than
 *  anything the reader did. */
export function displayChangeCount(d: Display, baseline: Display = DEFAULT_DISPLAY): number {
  const sameFields =
    d.fields.length === baseline.fields.length &&
    d.fields.every((f) => baseline.fields.includes(f));
  return (
    (d.group !== baseline.group ? 1 : 0) +
    (d.sort !== baseline.sort || d.sortDesc !== baseline.sortDesc ? 1 : 0) +
    (d.hidden !== baseline.hidden ? 1 : 0) +
    (sameFields ? 0 : 1)
  );
}

/** How many filters are applied. `showHidden` is deliberately excluded: it is a
 *  display option, and counting it would make the filter badge report a number
 *  the filter menu cannot account for. */
export function activeFilterCount(f: Filters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    f.cats.length +
    f.impact.length +
    f.tags.length +
    f.origins.length +
    f.critical.length
  );
}

export interface Counts {
  all: number;
  critical: number;
  hidden: number;
  mine: number;
}

export function counts(state: IssuesState): Counts {
  return {
    all: ISSUES.filter((i) => state.hidden[i.id] == null).length,
    critical: ISSUES.filter((i) => isFlagged(state, i.id)).length,
    hidden: Object.keys(state.hidden).length,
    mine: ISSUES.filter((i) => criticalState(state, i.id) === 'mine').length,
  };
}

export function categoryCount(state: IssuesState, cat: CategoryName): number {
  return ISSUES.filter(
    (i) => i.cat === cat && (state.display.hidden !== 'hide' || state.hidden[i.id] == null),
  ).length;
}

/* ── per-option counts ─────────────────────────────────────────────────────
   Each option reports how many issues it WOULD match with the other filters
   still applied, which is the difference between a filter menu you can plan with
   and one you have to probe by trial. Computed by clearing only the dimension
   being counted, so "Payment 3" means three more rows, not three in total.
   ────────────────────────────────────────────────────────────────────────── */

export interface OptionCounts {
  impact: Record<string, number>;
  tags: Record<string, number>;
  origins: Record<string, number>;
  critical: Record<string, number>;
  cat: Record<string, number>;
}

const IMPACT_LEVELS: ImpactLevel[] = ['High', 'Medium', 'Low'];
const CRITICAL_STATES: CriticalState[] = ['mine', 'team', 'dismissed', 'none'];

export function optionCounts(state: IssuesState): OptionCounts {
  /** the result set with one dimension released */
  const without = (key: keyof Filters) =>
    filterIssues({ ...state, filters: { ...state.filters, [key]: DEFAULT_FILTERS[key] } });

  const byImpact = without('impact');
  const byTags = without('tags');
  const byOrigins = without('origins');
  const byCritical = without('critical');
  const byCat = without('cats');

  const impact: Record<string, number> = {};
  for (const level of IMPACT_LEVELS) {
    impact[level] = byImpact.filter((i) => impactLevel(i.impact) === level).length;
  }

  const tags: Record<string, number> = {};
  for (const issue of byTags) {
    for (const t of issue.tags) tags[t] = (tags[t] ?? 0) + 1;
  }

  const origins: Record<string, number> = {};
  for (const issue of byOrigins) {
    const key = issue.segmentId == null ? 'full' : String(issue.segmentId);
    origins[key] = (origins[key] ?? 0) + 1;
  }

  const critical: Record<string, number> = {};
  for (const st of CRITICAL_STATES) critical[st] = 0;
  for (const issue of byCritical) {
    const st = criticalState(state, issue.id);
    critical[st] = (critical[st] ?? 0) + 1;
  }

  const cat: Record<string, number> = {};
  for (const issue of byCat) cat[issue.cat] = (cat[issue.cat] ?? 0) + 1;

  return { impact, tags, origins, critical, cat };
}

/** Why the list is empty, so the empty state can name the control to reach for. */
export function emptyReason(state: IssuesState): 'no-data' | 'filters' | 'mine' | 'none' {
  if (state.dataState === 'empty') return 'no-data';
  if (filterIssues(state).length > 0) return 'none';
  if (state.filters.critical.length === 1 && state.filters.critical[0] === 'mine') return 'mine';
  if (activeFilterCount(state.filters) > 0) return 'filters';
  return 'no-data';
}

/* ── the filter tree ──────────────────────────────────────────────────────────
   One description of what the filter menu contains, shared by both options, so
   the two designs cannot end up offering different filters. Each app supplies
   its own icons and its own chrome; neither invents a dimension.

   Options carry their counts, and a dimension is returned even when every option
   in it is empty: hiding a filter because nothing currently matches makes the
   menu change shape as you use it, which is worse than showing a zero.
   ────────────────────────────────────────────────────────────────────────── */

/** Which axis a filter dimension writes to. Keyed to `Filters` so a typo in a
 *  menu definition is a compile error rather than a silently dead control. */
export type FilterKey = 'cats' | 'impact' | 'tags' | 'origins' | 'critical';

export interface FilterOption {
  /** The value as written into Filters. Segment ids arrive here as strings and
   *  are parsed back by `toggleFilterValue`, which owns that conversion so no
   *  callsite has to remember it. */
  value: string;
  label: string;
  count: number;
  /** A hint the app maps to an icon. The shared layer names the KIND of thing,
   *  never the glyph, because the glyph is a design decision per option. */
  kind?: 'errors' | 'ui' | 'slowness' | 'high' | 'medium' | 'low' | 'segment' | 'full' | 'mine' | 'team' | 'dismissed' | 'none';
}

/* Generic in the key, because the filter menu is now used over two different
   sets of things: the issue queue and the sessions inside one issue. The shape
   of "a dimension with options and counts" is the same either way, and the only
   thing that differs is the vocabulary of keys. Defaulting to FilterKey keeps
   every existing callsite exactly as it was. */
export interface FilterDimension<K extends string = FilterKey> {
  key: K;
  label: string;
  /** Shown under the dimension name in the menu when the list needs framing. */
  hint?: string;
  options: FilterOption[];
  /** Single-select dimensions replace their value instead of accumulating. */
  single?: boolean;
}

export function filterDimensions(state: IssuesState): FilterDimension[] {
  const counts = optionCounts(state);

  return [
    {
      key: 'cats',
      label: 'Category',
      options: (['Errors', 'UI/UX', 'Slowness'] as CategoryName[]).map((c) => ({
        value: c,
        label: c,
        count: counts.cat[c] ?? 0,
        kind: c === 'Errors' ? ('errors' as const) : c === 'UI/UX' ? ('ui' as const) : ('slowness' as const),
      })),
    },
    {
      key: 'impact',
      label: 'Impact',
      hint: 'How many people reached it',
      options: (['High', 'Medium', 'Low'] as ImpactLevel[]).map((l) => ({
        value: l,
        label: l,
        count: counts.impact[l] ?? 0,
        kind: l.toLowerCase() as 'high' | 'medium' | 'low',
      })),
    },
    {
      key: 'critical',
      label: 'Critical',
      hint: 'Whose description matched',
      options: [
        { value: 'mine', label: 'Matches yours', count: counts.critical.mine ?? 0, kind: 'mine' as const },
        { value: 'team', label: "Matches a teammate's", count: counts.critical.team ?? 0, kind: 'team' as const },
        { value: 'dismissed', label: 'You dropped it', count: counts.critical.dismissed ?? 0, kind: 'dismissed' as const },
        { value: 'none', label: 'Not flagged', count: counts.critical.none ?? 0, kind: 'none' as const },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      hint: 'What the agent saw in the session',
      options: ALL_TAGS.map((t) => ({ value: t, label: t, count: counts.tags[t] ?? 0 })),
    },
    {
      key: 'origins',
      label: 'Found in',
      hint: 'Where the agent was looking',
      options: [
        { value: 'full', label: 'Full traffic', count: counts.origins.full ?? 0, kind: 'full' as const },
        ...SEGMENTS.filter((sg) => sg.isPublic).map((sg) => ({
          value: String(sg.id),
          label: sg.name,
          count: counts.origins[String(sg.id)] ?? 0,
          kind: 'segment' as const,
        })),
      ],
    },
  ];
}

/** Is this option currently applied? */
export function isFilterValueActive(f: Filters, key: FilterKey, value: string): boolean {
  if (key === 'origins') return f.origins.includes(value === 'full' ? 'full' : Number(value));
  const list = f[key] as string[];
  return list.includes(value);
}

/** Toggle one option, returning the next Filters. Owns the string-to-value
 *  conversion for segment ids and the replace-vs-accumulate rule for
 *  single-select dimensions, so no component has to know either. */
export function toggleFilterValue(f: Filters, key: FilterKey, value: string): Filters {
  if (key === 'origins') {
    const v: number | 'full' = value === 'full' ? 'full' : Number(value);
    return {
      ...f,
      origins: f.origins.includes(v) ? f.origins.filter((x) => x !== v) : [...f.origins, v],
    };
  }
  const list = f[key] as string[];
  const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  return { ...f, [key]: next };
}

export function clearFilterKey(f: Filters, key: FilterKey): Filters {
  return { ...f, [key]: [] };
}

/** One applied filter, ready to render as a removable chip. The chips are what
 *  make a single collapsed control honest: fold five buttons into one icon
 *  without them and the filter state becomes invisible. */
/* Generic in the key for the same reason FilterDimension is: the chips row is
   drawn for the issue queue, the tests list and anything else that folds its
   filters behind one button. Defaulting to FilterKey keeps every existing
   callsite exactly as it was. */
export interface ActiveFilterChip<K extends string = FilterKey> {
  key: K;
  value: string;
  /** the dimension name, so a chip can read "Impact: High" */
  dimension: string;
  label: string;
}

export function activeFilters(state: IssuesState): ActiveFilterChip[] {
  const dims = filterDimensions(state);
  const out: ActiveFilterChip[] = [];
  for (const d of dims) {
    for (const o of d.options) {
      if (isFilterValueActive(state.filters, d.key, o.value)) {
        out.push({ key: d.key, value: o.value, dimension: d.label, label: o.label });
      }
    }
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE SESSIONS INSIDE ONE ISSUE, filtered.

   Same shape as the queue's filters and deliberately so: the band under the
   write-up is a list of things with a header, a search and a filter, exactly
   like the queue is, and a reader who has learned one has learned the other.
   What differs is only the vocabulary - a session is a person on a device in a
   place, not a category and an impact - so the keys differ and nothing else
   does. The menu component itself is shared.
   ═══════════════════════════════════════════════════════════════════════════ */

export type SessionFilterKey = 'plan' | 'browser' | 'os' | 'tags';

export type SessionFilters = Record<SessionFilterKey, string[]>;

export const NO_SESSION_FILTERS: SessionFilters = { plan: [], browser: [], os: [], tags: [] };

const SESSION_VALUES: Record<SessionFilterKey, (s: IssueSession) => string[]> = {
  plan: (s) => [s.plan],
  browser: (s) => [s.browser],
  os: (s) => [s.os],
  tags: (s) => s.tags,
};

/** Free text over everything a reader can actually see on a card: what happened,
 *  who it happened to, and where. Not the raw journey, which would match on
 *  words that are nowhere on screen. */
function sessionHaystack(s: IssueSession): string {
  return `${s.variation} ${s.email} ${s.loc} ${s.browser} ${s.os} ${s.plan} ${s.tags.join(' ')}`.toLowerCase();
}

export function filterSessions(
  sessions: readonly IssueSession[],
  filters: SessionFilters,
  query = '',
): IssueSession[] {
  const q = query.trim().toLowerCase();
  return sessions.filter((s) => {
    if (q && !sessionHaystack(s).includes(q)) return false;
    return (Object.keys(SESSION_VALUES) as SessionFilterKey[]).every((key) => {
      const wanted = filters[key];
      if (wanted.length === 0) return true;
      return SESSION_VALUES[key](s).some((v) => wanted.includes(v));
    });
  });
}

/**
 * The dimensions, built from the sessions actually present rather than from a
 * fixed list. Three sessions of one issue are frequently all on Chrome, and a
 * menu offering Firefox and Safari with a zero beside each is a menu describing
 * a different issue.
 *
 * Counts are computed with the OTHER dimensions still applied, the same rule the
 * queue's menu follows, so a count tells you what the option would leave you
 * with rather than what it would leave you with in a vacuum.
 */
export function sessionDimensions(
  sessions: readonly IssueSession[],
  filters: SessionFilters,
): FilterDimension<SessionFilterKey>[] {
  const LABELS: Record<SessionFilterKey, string> = {
    plan: 'Plan',
    browser: 'Browser',
    os: 'Device',
    tags: 'Tags',
  };

  return (Object.keys(SESSION_VALUES) as SessionFilterKey[]).map((key) => {
    const others = { ...filters, [key]: [] as string[] };
    const pool = filterSessions(sessions, others);

    const values: string[] = [];
    for (const s of sessions) {
      for (const v of SESSION_VALUES[key](s)) if (!values.includes(v)) values.push(v);
    }

    return {
      key,
      label: LABELS[key],
      options: values.map((value) => ({
        value,
        label: value,
        count: pool.filter((s) => SESSION_VALUES[key](s).includes(value)).length,
      })),
    };
  });
}

export function activeSessionFilterCount(filters: SessionFilters): number {
  return (Object.keys(filters) as SessionFilterKey[]).reduce((n, k) => n + filters[k].length, 0);
}

export function toggleSessionFilter(
  filters: SessionFilters,
  key: SessionFilterKey,
  value: string,
): SessionFilters {
  const on = filters[key].includes(value);
  return { ...filters, [key]: on ? filters[key].filter((v) => v !== value) : [...filters[key], value] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE BEST SESSIONS, and why there are only ever three of them.

   A band under a write-up is not a session list; it is a SHORTLIST. Nobody
   watches eleven recordings of one bug - they watch the two or three that show
   it most clearly and then go and fix it. Capping at three is what makes the
   band a fixed three-column grid, which is in turn what stops the cards
   resizing every time a filter changes the count. The cap and the calm layout
   are the same decision.

   ── the order ───────────────────────────────────────────────────────────────
   Three tie-breaks, most decisive first:

     1  HOW CLEARLY IT FAILS. A session where the failure is an error beats one
        where it has to be inferred from rage clicks, which beats a stall. You
        are picking evidence.
     2  WHETHER IT HAS BEEN WRITTEN UP. A session the agent has annotated is
        better evidence than one it has only counted, and it is also the one
        whose person, device and place are real rather than derived. Without
        this the derived sessions displaced the written ones purely by being a
        few seconds shorter, and the Details tab filled up with people the
        write-up above it had never mentioned.
     3  HOW MUCH OF THE STORY IS ON IT. More journey steps is more of what
        happened before and after, which is what makes a recording worth
        opening rather than a screenshot.
     4  HOW LONG IT TAKES TO WATCH. Shorter wins. Same story, less of your day.

   Deterministic and stable: equal sessions keep the order the data gives them,
   because a shortlist that reshuffles between renders cannot be screenshotted
   or compared between the two options.
   ═══════════════════════════════════════════════════════════════════════════ */

export const TOP_SESSIONS = 3;

const FAILURE_RANK: Record<string, number> = { error: 0, rage: 1, slow: 2, input: 3, click: 3, nav: 3 };

export function rankSessions(sessions: readonly IssueSession[]): IssueSession[] {
  return sessions
    .map((session, order) => ({ session, order }))
    .sort((x, y) => {
      const fx = FAILURE_RANK[failureMoment(x.session)?.kind ?? 'click'] ?? 3;
      const fy = FAILURE_RANK[failureMoment(y.session)?.kind ?? 'click'] ?? 3;
      if (fx !== fy) return fx - fy;

      const wx = x.session.derived ? 1 : 0;
      const wy = y.session.derived ? 1 : 0;
      if (wx !== wy) return wx - wy;

      const sx = replayMarkers(x.session).length;
      const sy = replayMarkers(y.session).length;
      if (sx !== sy) return sy - sx;

      const dx = durationSeconds(x.session.dur);
      const dy = durationSeconds(y.session.dur);
      if (dx !== dy) return dx - dy;

      return x.order - y.order;
    })
    .map((entry) => entry.session);
}

/**
 * The shortlist: filtered, ranked, and spread across the VARIATIONS.
 *
 * The cap is a drawing decision and it differs by density - the cards band
 * takes three because a card costs a third of the pane, the strip takes
 * whatever "show more" has grown it to because a chip costs 200px - so the
 * slice belongs to whoever is drawing. What must not differ is the contents and
 * the order, which is why this is one function and both of them call it.
 *
 * ── why ranking alone was not enough ────────────────────────────────────────
 * An issue is hit a hundred and thirty times in a handful of DIFFERENT ways,
 * and rank alone puts the best example of the commonest way in all three slots:
 * the first render of this read "Retried the same card twice, then left" three
 * times over, at 10m13s, 10m15s and 10m17s. Three recordings of one story is
 * not a shortlist, it is the same card dealt three times.
 *
 * So the front of the list is one session per variation, each of them the best
 * of its own kind, in rank order. The duplicates follow, still ranked, for
 * anyone who presses "show more" - if there are only two ways it fails, the
 * third slot goes to the second-best example of the worse one rather than
 * sitting empty.
 */
export function shortlistSessions(
  sessions: readonly IssueSession[],
  filters: SessionFilters,
  query = '',
): IssueSession[] {
  const ranked = rankSessions(filterSessions(sessions, filters, query));
  const seen = new Set<string>();
  const first: IssueSession[] = [];
  const rest: IssueSession[] = [];
  for (const session of ranked) {
    if (seen.has(session.variation)) rest.push(session);
    else {
      seen.add(session.variation);
      first.push(session);
    }
  }
  return [...first, ...rest];
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW MANY SESSIONS ACTUALLY HIT AN ISSUE.

   The eleven issues carry two or three hand-written sessions each, because
   those are the ones with a real journey on them and everything downstream -
   the write-up, the timeline, the cursor walk - is derived from that prose. A
   real issue is hit by dozens or hundreds of people, and a strip that can only
   ever say "3 of 3" cannot answer the question the strip exists to answer:
   what this looks like when the number is big.

   So the pool is DERIVED. The hand-written sessions come first, verbatim and
   unchanged, and the rest are the same issue happening to other people: same
   variations, same journeys, same tags - the issue's own material - on
   different people, devices and places. Nothing is invented about what
   happened, only about who it happened to, which is the one part of a session
   the rest of the app never reasons from.

   Deterministic, index-seeded, no Math.random: the pool is identical on every
   render and between the two options, so a screenshot of it means something.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Roughly proportional to impact, which is what impact measures. The top issue
 *  lands near 130 and the pricing bounce near 28. */
export function sessionCount(issue: Issue): number {
  return Math.round(issue.impact * 1.8) + 6;
}

const PEOPLE: readonly string[] = [
  'nadia@brightbox.io', 'tom@layerlabs.dev', 'ines@caldera.co', 'raul@fintrail.mx',
  'yuki@miraisoft.jp', 'greta@nordkit.se', 'omar@gridly.io', 'bea@finchly.com',
  'sam@oakmont.eu', 'priya@meshcart.in', 'lucas@finhub.io', 'hana@coralpay.io',
  'noor@swipbox.com', 'ellis@dosetech.co', 'kaya@shopwave.co', 'devan@black-bird.io',
  'marta@vfairs.com', 'jonas@nordkit.se', 'ada@gridly.io', 'felix@caldera.co',
];

const PLACES: readonly string[] = [
  'Frankfurt am Main', 'Toronto', 'Lagos', 'Madrid', 'Berlin', 'Osaka', 'Cairo',
  'Mumbai', 'Seoul', 'Austin', 'Stockholm', 'Newark', 'Poznan', 'Lahore',
  'Bogota', 'Manchester', 'Lyon', 'Auckland', 'Warsaw', 'Nairobi',
];

const DEVICES: ReadonlyArray<{ browser: string; os: string }> = [
  { browser: 'Chrome', os: 'Mac OS X' },
  { browser: 'Chrome', os: 'Windows' },
  { browser: 'Safari', os: 'iOS' },
  { browser: 'Chrome', os: 'Android' },
  { browser: 'Firefox', os: 'Windows' },
  { browser: 'Safari', os: 'Mac OS X' },
  { browser: 'Firefox', os: 'Linux' },
  { browser: 'Edge', os: 'Windows' },
];

const PLANS: ReadonlyArray<IssueSession['plan']> = ['paid', 'trial', 'free'];

const pools = new Map<number, IssueSession[]>();

/**
 * Every session on an issue, the hand-written ones first.
 *
 * Memoised per issue, which matters for more than speed: the app compares
 * sessions by identity - `indexOf` to turn a shortlist entry back into the
 * index the player speaks - so a pool rebuilt on every render would break the
 * selection rather than merely cost something.
 */
export function sessionPool(issue: Issue): IssueSession[] {
  const cached = pools.get(issue.id);
  if (cached) return cached;

  const written = issue.sessions;
  const total = Math.max(written.length, sessionCount(issue));
  const out: IssueSession[] = [...written];

  for (let i = written.length; i < total; i++) {
    const base = written[i % written.length]!;
    const device = DEVICES[i % DEVICES.length]!;
    /* Durations spread around the written ones rather than around a guess:
       a derived session of an issue takes about as long as a real one does. */
    const seconds = durationSeconds(base.dur) + ((i * 37) % 220) - 110;
    const safe = Math.max(45, seconds);
    out.push({
      ...base,
      derived: true,
      email: PEOPLE[i % PEOPLE.length]!,
      plan: PLANS[i % PLANS.length]!,
      browser: device.browser,
      os: device.os,
      loc: PLACES[(i * 7) % PLACES.length]!,
      dur: `${Math.floor(safe / 60)}m${String(safe % 60).padStart(2, '0')}s`,
    });
  }

  pools.set(issue.id, out);
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ONE SESSION, AS FACTS.

   The write-up answers what happened and why. This answers WHO AND WHERE, which
   is the other half of a session and the half you reach for when the write-up
   has already convinced you: which browser, which country, is this a phone,
   what plan are they on.

   Same rule as the derived pool. What happened is never invented - every fact
   here is either read off the session or looked up from a fixed table keyed by
   something the session already says. Versions and resolutions come from the
   browser and the OS the session records, so they cannot contradict it, and
   they are stable per session rather than per render.

   The shared layer names the KIND of each row and never the glyph, the same way
   the filter options do: which icon means "device" is a design decision, and
   the two options are allowed to answer it differently.
   ═══════════════════════════════════════════════════════════════════════════ */

export type SessionFactKind =
  | 'category'
  | 'user'
  | 'place'
  | 'browser'
  | 'os'
  | 'device'
  | 'metadata';

export interface SessionFact {
  kind: SessionFactKind;
  /** The row's own name. For place, browser and OS this is the VALUE doing the
   *  naming - "Germany", "Chrome", "Mac OS X" - because the label "Country" next
   *  to the value "Germany" is the same word twice. */
  label: string;
  value: string;
  /** key/value pairs, for the metadata row */
  pairs?: ReadonlyArray<{ key: string; value: string }>;
}

const COUNTRY: Record<string, string> = {
  Austin: 'United States',
  Berlin: 'Germany',
  Bogota: 'Colombia',
  Cairo: 'Egypt',
  'Frankfurt am Main': 'Germany',
  Islamabad: 'Pakistan',
  Jakarta: 'Indonesia',
  Lagos: 'Nigeria',
  'Lahore (Sher Kot)': 'Pakistan',
  Lisbon: 'Portugal',
  Lyon: 'France',
  Madrid: 'Spain',
  Manchester: 'United Kingdom',
  Manila: 'Philippines',
  Mumbai: 'India',
  Nairobi: 'Kenya',
  Newark: 'United States',
  'Nong Sung': 'Thailand',
  Osaka: 'Japan',
  Poznan: 'Poland',
  Saidpur: 'Bangladesh',
  Schieren: 'Luxembourg',
  Seoul: 'South Korea',
  Stockholm: 'Sweden',
  'Thung Khru': 'Thailand',
  Toronto: 'Canada',
  Warsaw: 'Poland',
  Auckland: 'New Zealand',
};

/* Real current-ish majors. Kept in one table so a version cannot drift from the
   browser beside it, and offset per session so a strip of them does not read as
   one machine used by twenty people. */
const BROWSER_MAJOR: Record<string, number> = { Chrome: 144, Safari: 18, Firefox: 137, Edge: 144 };
const OS_VERSION: Record<string, readonly string[]> = {
  'Mac OS X': ['10.15.7', '13.6.4', '14.4.1', '15.3'],
  Windows: ['10', '11'],
  iOS: ['17.5.1', '18.1.2', '18.3'],
  Android: ['13', '14', '15'],
  Linux: ['Ubuntu 24.04', 'Fedora 40'],
};
const DESKTOP_SIZES = ['1440 × 900', '1512 × 982', '1920 × 1080', '2560 × 1440'] as const;
const MOBILE_SIZES = ['390 × 844', '393 × 852', '412 × 915', '360 × 800'] as const;

/** Stable per session and cheap: the address is the one thing that is unique to
 *  a session in this data, so it is what seeds every derived detail. */
function seedOf(session: IssueSession): number {
  let n = 0;
  for (let i = 0; i < session.email.length; i++) n = (n * 31 + session.email.charCodeAt(i)) % 9973;
  return n;
}

export function isMobile(session: IssueSession): boolean {
  return session.os === 'iOS' || session.os === 'Android';
}

export function sessionFacts(issue: Issue, session: IssueSession): SessionFact[] {
  const seed = seedOf(session);
  const major = (BROWSER_MAJOR[session.browser] ?? 100) - (seed % 3);
  const osList = OS_VERSION[session.os] ?? ['—'];
  const mobile = isMobile(session);
  const sizes = mobile ? MOBILE_SIZES : DESKTOP_SIZES;
  const company = session.email.split('@')[1]?.split('.')[0] ?? 'unknown';

  return [
    { kind: 'category', label: 'Category', value: issue.cat },
    { kind: 'user', label: 'User', value: session.email },
    { kind: 'place', label: COUNTRY[session.loc] ?? 'Unknown', value: session.loc },
    { kind: 'browser', label: session.browser, value: `v${major}.0.0` },
    { kind: 'os', label: session.os, value: osList[seed % osList.length]! },
    {
      kind: 'device',
      label: mobile ? 'Mobile' : 'Desktop',
      value: sizes[seed % sizes.length]!,
    },
    {
      kind: 'metadata',
      label: 'Metadata',
      value: '',
      pairs: [
        { key: 'plan', value: session.plan },
        { key: 'company', value: company },
      ],
    },
  ];
}
