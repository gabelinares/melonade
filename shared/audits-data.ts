/* ═══════════════════════════════════════════════════════════════════════════
   THE UX AUDIT AGENT'S DOMAIN.

   An audit is not an issue and not a test: it is a long-running JOB over a
   sample of sessions that produces a static, consulting-style artifact - a
   report you present, export as a PDF or hand to a client. That is why this
   list is the shortest of the three and why the workflow around it is
   deliberately thin. The report is the product; the list is a shelf.
   ═══════════════════════════════════════════════════════════════════════════ */

import { DEFAULT_RANGE, withinRange, type DateRangeValue } from './date-range.ts';

export type AuditStatus = 'running' | 'ready';

export interface Audit {
  id: number;
  name: string;
  /** WHAT the agent read. One segment, named, rather than the display strings
   *  it used to be: the scope line under a name is `segment · period` and both
   *  halves are filterable, so keeping them as a pre-joined array meant the one
   *  question people ask of this list - "show me the mobile ones" - had to be
   *  answered by matching text. */
  segment: string;
  periodDays: 7 | 30 | 90;
  /** Sessions matching the scope in the period. */
  matched: number;
  /** Sessions actually analysed. */
  sampleSize: number;
  status: AuditStatus;
  /** 0-100, and never printed as a number - see `advanceAudits`. */
  progress: number;
  createdBy: string;
  /** Yours to delete. Somebody else's audit is readable, not disposable. */
  mine: boolean;
  createdAt: number;
  /** The composite UX health score, once there is one. */
  healthScore?: number;
  emailWhenDone?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
/* ⚠ RELATIVE, not July 2026. The dates here were absolute, which was harmless
   while nothing filtered on them and wrong the moment the date window arrived:
   every audit in the fixture sat two months in the past, so the default
   thirty-day list came back empty. */
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

/* ELEVEN, where there were three. Three rows cannot show what a filter menu,
   an ordering or a date window are for - every control would have been correct
   and useless at the same time. Mehdi's own rule from the sessions round: make
   sure the mock data shows everything the controls can do. So the segments
   repeat, the periods vary, four people appear, the health scores span all
   three bands and the dates run from this morning to eleven weeks back. */
export const AUDITS: readonly Audit[] = [
  {
    id: 11,
    name: 'Mobile visitors — this month',
    segment: 'Mobile visitors',
    periodDays: 7,
    matched: 5320,
    sampleSize: 1000,
    status: 'running',
    progress: 38,
    createdBy: 'You',
    mine: true,
    createdAt: daysAgo(0, 9),
    emailWhenDone: true,
  },
  {
    id: 10,
    name: 'Sign-up funnel — first pass',
    segment: 'New sign-ups',
    periodDays: 30,
    matched: 12400,
    sampleSize: 2000,
    status: 'running',
    progress: 71,
    createdBy: 'Sarah K.',
    mine: false,
    createdAt: daysAgo(1, 14),
  },
  {
    id: 9,
    name: 'Checkout & billing — August',
    segment: 'Billing & checkout',
    periodDays: 30,
    matched: 8140,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: daysAgo(3, 15),
    healthScore: 67,
  },
  {
    id: 8,
    name: 'Pricing page — paid traffic',
    segment: 'Pricing · France',
    periodDays: 7,
    matched: 2160,
    sampleSize: 800,
    status: 'ready',
    progress: 100,
    createdBy: 'Mehdi O.',
    mine: false,
    createdAt: daysAgo(6, 11),
    healthScore: 44,
  },
  {
    id: 7,
    name: 'Mobile visitors — August',
    segment: 'Mobile visitors',
    periodDays: 30,
    matched: 21800,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: daysAgo(11, 9),
    healthScore: 58,
  },
  {
    id: 6,
    name: 'Enterprise accounts — quarterly',
    segment: 'Enterprise accounts',
    periodDays: 90,
    matched: 3400,
    sampleSize: 1500,
    status: 'ready',
    progress: 100,
    createdBy: 'Nikita M.',
    mine: false,
    createdAt: daysAgo(18, 16),
    healthScore: 79,
  },
  {
    id: 5,
    name: 'Full traffic baseline — August',
    segment: 'Full traffic',
    periodDays: 30,
    matched: 58200,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'Mehdi O.',
    mine: false,
    createdAt: daysAgo(24, 11),
    healthScore: 71,
  },
  {
    id: 4,
    name: 'Checkout & billing — July',
    segment: 'Billing & checkout',
    periodDays: 30,
    matched: 7900,
    sampleSize: 1800,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: daysAgo(34, 10),
    healthScore: 61,
  },
  {
    id: 3,
    name: 'New sign-ups — onboarding drop-off',
    segment: 'New sign-ups',
    periodDays: 7,
    matched: 4100,
    sampleSize: 900,
    status: 'ready',
    progress: 100,
    createdBy: 'Sarah K.',
    mine: false,
    createdAt: daysAgo(41, 13),
    healthScore: 48,
  },
  {
    id: 2,
    name: 'Mobile visitors — July',
    segment: 'Mobile visitors',
    periodDays: 30,
    matched: 19600,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: daysAgo(57, 9),
    healthScore: 52,
  },
  {
    id: 1,
    name: 'Full traffic baseline — Q2',
    segment: 'Full traffic',
    periodDays: 90,
    matched: 141000,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'Gabriel L.',
    mine: false,
    createdAt: daysAgo(78, 11),
    healthScore: 74,
  },
];

/** The scope line under a name: what was read, over how long. One function, so
 *  the list and the report header cannot phrase it differently. */
export const scopeLabel = (a: Audit): string => `${a.segment} · Last ${a.periodDays} days`;

export type AuditTab = 'all' | AuditStatus;

/** The share of matched sessions the agent actually read. A percentage, not the
 *  raw pair: nobody should have to work out that 1,000 of 5,320 is a fifth. The
 *  exact numbers stay one hover away. */
export const samplePercent = (a: Audit): number =>
  a.matched ? Math.max(1, Math.round((a.sampleSize / a.matched) * 100)) : 0;

export type HealthBand = 'good' | 'fair' | 'poor';

export const healthBand = (score: number): HealthBand =>
  score >= 75 ? 'good' : score >= 50 ? 'fair' : 'poor';

/**
 * One tick of the demo's liveness: running audits ease forward and the ones
 * that finish are returned so the page can say so.
 *
 * The easing is the point. A job like this has an unknowable duration, so the
 * bar moves fast early and crawls near the end - and the UI never prints a
 * percentage, because a number here would be a promise the agent cannot keep.
 */
export function advanceAudits(audits: readonly Audit[]): { audits: Audit[]; finished: Audit[] } {
  const finished: Audit[] = [];
  const next = audits.map((a) => {
    if (a.status !== 'running') return a;
    const step = Math.max(0.6, (100 - a.progress) * 0.09) + Math.random();
    const progress = Math.min(100, a.progress + step);
    if (progress >= 99.5) {
      const done: Audit = { ...a, progress: 100, status: 'ready', healthScore: 60 + Math.round(Math.random() * 20) };
      finished.push(done);
      return done;
    }
    return { ...a, progress };
  });
  return { audits: next, finished };
}

export interface AuditTabCount {
  key: AuditTab;
  label: string;
  count: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE SAME THREE QUESTIONS AS EVERY OTHER LIST (2026-09-02).

   This page used to have a search and three tabs, and the file said so in as
   many words: "there is no filter menu here and no display menu... adding the
   others to look consistent would be adding controls that filter nothing."

   That was true of a three-row fixture and false of the page. An audit carries
   a segment, a period, an author, a health band and a date, and every one of
   them is a question somebody asks of a shelf of reports - "the mobile ones",
   "mine", "the ones that came out badly", "since the redesign shipped". What
   made the argument look right was that there were three rows to ask it of.

   ⚠ The rule that survives: consistency is not a reason on its own. These
   dimensions are here because they read fields the audit already has, and the
   ordering keys are the columns the table already draws. Nothing was invented
   to fill a menu.
   ═══════════════════════════════════════════════════════════════════════════ */

export type AuditFilterKey = 'segments' | 'periods' | 'creators' | 'health';

export interface AuditFilters {
  segments: string[];
  periods: string[];
  creators: string[];
  /** `HealthBand` values. A running audit has no score, so it matches none of
   *  them - which is correct: "the ones that came out badly" is a question
   *  about finished work. */
  health: string[];
}

export const NO_AUDIT_FILTERS: AuditFilters = { segments: [], periods: [], creators: [], health: [] };

export type AuditSortKey = 'recent' | 'oldest' | 'name' | 'health' | 'sample';

export const AUDIT_SORT_CHOICES: ReadonlyArray<{ value: AuditSortKey; label: string }> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name' },
  { value: 'health', label: 'Health score' },
  { value: 'sample', label: 'Sessions read' },
];

/** The columns that can be put away. The name and its scope cannot: a row with
 *  neither is not a row. */
export type AuditFieldKey = 'status' | 'health' | 'sample' | 'created' | 'artifacts';

export const AUDIT_FIELD_CHOICES: ReadonlyArray<{ value: AuditFieldKey; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'health', label: 'Health' },
  { value: 'sample', label: 'Sample' },
  { value: 'created', label: 'Created' },
  { value: 'artifacts', label: 'Artifacts' },
];

export interface AuditDisplay {
  sort: AuditSortKey;
  fields: AuditFieldKey[];
}

export const DEFAULT_AUDIT_DISPLAY: AuditDisplay = {
  sort: 'recent',
  fields: ['status', 'health', 'sample', 'created', 'artifacts'],
};

export interface AuditsState {
  tab: AuditTab;
  query: string;
  range: DateRangeValue;
  filters: AuditFilters;
  display: AuditDisplay;
}

export const INITIAL_AUDITS_STATE: AuditsState = {
  tab: 'all',
  query: '',
  range: DEFAULT_RANGE,
  filters: NO_AUDIT_FILTERS,
  display: DEFAULT_AUDIT_DISPLAY,
};

export const matchesAuditQuery = (a: Audit, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || a.name.toLowerCase().includes(q) || scopeLabel(a).toLowerCase().includes(q);
};

const matchesAuditFilters = (a: Audit, f: AuditFilters): boolean =>
  (f.segments.length === 0 || f.segments.includes(a.segment)) &&
  (f.periods.length === 0 || f.periods.includes(String(a.periodDays))) &&
  (f.creators.length === 0 || f.creators.includes(a.createdBy)) &&
  (f.health.length === 0 || (a.healthScore != null && f.health.includes(healthBand(a.healthScore))));

/** Everything except the tab: what the search, the window and the filters left.
 *  The tab counts read this, so a tab can never promise rows the list would
 *  not show. */
const inAuditScope = (a: Audit, state: AuditsState, now: number): boolean =>
  matchesAuditQuery(a, state.query) &&
  withinRange(a.createdAt, state.range, now) &&
  matchesAuditFilters(a, state.filters);

export function sortAudits(rows: Audit[], key: AuditSortKey): Audit[] {
  const out = [...rows];
  switch (key) {
    case 'recent':
      return out.sort((a, b) => b.createdAt - a.createdAt);
    case 'oldest':
      return out.sort((a, b) => a.createdAt - b.createdAt);
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name));
    /* Worst first, because "which of these came out badly" is the only reason
       to order by score. A RUNNING audit has no score, and it sorts after every
       audit that does rather than being ranked as a zero - an unfinished job is
       not a bad result, and putting it at the head of a list of failures would
       say it is the worst one. */
    case 'health':
      return out.sort((a, b) => (a.healthScore ?? Infinity) - (b.healthScore ?? Infinity));
    case 'sample':
      return out.sort((a, b) => b.sampleSize - a.sampleSize);
  }
}

export function filterAudits(audits: readonly Audit[], state: AuditsState, now: number = Date.now()): Audit[] {
  const rows = audits.filter((a) => (state.tab === 'all' || a.status === state.tab) && inAuditScope(a, state, now));
  return sortAudits(rows, state.display.sort);
}

export function auditCounts(
  audits: readonly Audit[],
  state: AuditsState,
  now: number = Date.now(),
): AuditTabCount[] {
  const pool = audits.filter((a) => inAuditScope(a, state, now));
  return [
    { key: 'all', label: 'All', count: pool.length },
    { key: 'running', label: 'Running', count: pool.filter((a) => a.status === 'running').length },
    { key: 'ready', label: 'Ready', count: pool.filter((a) => a.status === 'ready').length },
  ];
}

export interface AuditFilterDimension {
  key: AuditFilterKey;
  label: string;
  hint?: string;
  options: { value: string; label: string; count: number }[];
}

const HEALTH_BANDS: ReadonlyArray<{ value: HealthBand; label: string }> = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export function auditDimensions(
  audits: readonly Audit[],
  state: AuditsState,
  now: number = Date.now(),
): AuditFilterDimension[] {
  const base = audits.filter(
    (a) => (state.tab === 'all' || a.status === state.tab) && matchesAuditQuery(a, state.query),
  );
  /* Each option counts what it would leave with the OTHER dimensions still
     applied and its own released - the same arithmetic the runs and tests
     menus use, so a count means the same thing in all three. */
  const countWith = (key: AuditFilterKey, value: string) =>
    base.filter((a) =>
      inAuditScope(a, { ...state, filters: { ...state.filters, [key]: [value] } }, now),
    ).length;

  const segments = Array.from(new Set(audits.map((a) => a.segment))).sort();
  const creators = Array.from(new Set(audits.map((a) => a.createdBy))).sort(
    /* You first. It is the one row on this list you can delete, and the one
       people look for. */
    (a, b) => (a === 'You' ? -1 : b === 'You' ? 1 : a.localeCompare(b)),
  );
  const periods = Array.from(new Set(audits.map((a) => a.periodDays))).sort((a, b) => a - b);

  return [
    {
      key: 'segments',
      label: 'Scope',
      hint: 'The traffic the agent read',
      options: segments.map((v) => ({ value: v, label: v, count: countWith('segments', v) })),
    },
    {
      key: 'periods',
      label: 'Period',
      hint: 'How much history each audit covered',
      options: periods.map((v) => ({
        value: String(v),
        label: `Last ${v} days`,
        count: countWith('periods', String(v)),
      })),
    },
    {
      key: 'creators',
      label: 'Created by',
      options: creators.map((v) => ({ value: v, label: v, count: countWith('creators', v) })),
    },
    {
      key: 'health',
      label: 'Health',
      hint: 'Finished audits only',
      options: HEALTH_BANDS.map((b) => ({
        value: b.value,
        label: b.label,
        count: countWith('health', b.value),
      })),
    },
  ];
}

export const auditFilterCount = (f: AuditFilters): number =>
  f.segments.length + f.periods.length + f.creators.length + f.health.length;

export function toggleAuditFilter(f: AuditFilters, key: AuditFilterKey, value: string): AuditFilters {
  const current = f[key];
  return { ...f, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] };
}

export interface AuditFilterChip {
  key: AuditFilterKey;
  value: string;
  dimension: string;
  label: string;
}

export function activeAuditFilters(
  audits: readonly Audit[],
  state: AuditsState,
  now: number = Date.now(),
): AuditFilterChip[] {
  return auditDimensions(audits, state, now).flatMap((d) =>
    d.options
      .filter((o) => state.filters[d.key].includes(o.value))
      .map((o) => ({ key: d.key, value: o.value, dimension: d.label, label: o.label })),
  );
}

export const auditDisplayCount = (d: AuditDisplay): number =>
  (d.sort === DEFAULT_AUDIT_DISPLAY.sort ? 0 : 1) +
  AUDIT_FIELD_CHOICES.filter(
    (f) => d.fields.includes(f.value) !== DEFAULT_AUDIT_DISPLAY.fields.includes(f.value),
  ).length;

export const toggleAuditField = (d: AuditDisplay, f: AuditFieldKey): AuditDisplay => ({
  ...d,
  fields: d.fields.includes(f) ? d.fields.filter((x) => x !== f) : [...d.fields, f],
});
