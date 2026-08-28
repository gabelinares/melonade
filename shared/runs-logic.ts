/* The runs list, as arithmetic. Same shape as tests-logic: state in, questions
 * answered, no React and no styling. */

import { RUNS, type RunData, type RunStatus, regionLabel, resolutionLabel } from './runs-data.ts';
import type { Resolution } from './tests-data.ts';

export type RunTab = 'all' | RunStatus;

export type RunFilterKey = 'envs' | 'tags' | 'viewports' | 'regions' | 'period';

/** Periods are a SINGLE-select dimension: "the last 24 hours or the last 30
 *  days" is not a question anybody asks. */
export type Period = '24h' | '7d' | '30d' | 'all';

export const PERIODS: readonly { value: Period; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export interface RunFilters {
  envs: string[];
  tags: string[];
  viewports: string[];
  regions: string[];
  period: Period[];
}

/* Runs default to the last SEVEN DAYS, not to all time: what you come to this
   tab for is what happened recently, and eighty rows of history is not that.

   Graphite differs from production here in one deliberate way - the default is
   VISIBLE. It arrives as a removable chip in the filter bar like any other
   filter, because a list that is silently truncated is a list that lies about
   how much there is. */
export const DEFAULT_RUN_FILTERS: RunFilters = {
  envs: [],
  tags: [],
  viewports: [],
  regions: [],
  period: ['7d'],
};

export const NO_RUN_FILTERS: RunFilters = { envs: [], tags: [], viewports: [], regions: [], period: [] };

export type RunSortKey = 'result' | 'test' | 'env' | 'duration' | 'when';

export interface RunsState {
  runs: RunData[];
  query: string;
  tab: RunTab;
  filters: RunFilters;
  sort: { key: RunSortKey; desc: boolean } | null;
}

export const RUNS_PAGE_SIZE = 20;

export const INITIAL_RUNS_STATE: RunsState = {
  runs: [...RUNS],
  query: '',
  tab: 'all',
  filters: DEFAULT_RUN_FILTERS,
  /* Newest first, because a run list is a log and a log is read from the top.
     This is the one list in the app that arrives sorted rather than queued:
     there is no "waiting on you" among finished runs. */
  sort: { key: 'when', desc: true },
};

const HOUR = 3600000;

export const periodCutoff = (period: Period, now: number): number =>
  period === 'all' ? 0 : now - (period === '24h' ? 24 : period === '7d' ? 7 * 24 : 30 * 24) * HOUR;

const matchesQuery = (r: RunData, q: string) =>
  !q.trim() || r.testName.toLowerCase().includes(q.trim().toLowerCase());

const inPeriod = (r: RunData, period: string[], now: number) =>
  period.length === 0 || r.date >= periodCutoff(period[0] as Period, now);

const matchesFilters = (r: RunData, f: RunFilters, now: number) =>
  (f.envs.length === 0 || (r.envName != null && f.envs.includes(r.envName))) &&
  (f.tags.length === 0 || (r.tags ?? []).some((t) => f.tags.includes(t))) &&
  (f.viewports.length === 0 || f.viewports.includes(r.resolution ?? 'desktop')) &&
  (f.regions.length === 0 || (r.region != null && f.regions.includes(r.region))) &&
  inPeriod(r, f.period, now);

export function filterRuns(state: RunsState, now: number): RunData[] {
  const rows = state.runs.filter(
    (r) =>
      matchesQuery(r, state.query) &&
      (state.tab === 'all' || r.status === state.tab) &&
      matchesFilters(r, state.filters, now),
  );
  if (!state.sort) return rows;
  const RESULT_ORDER: Record<RunStatus, number> = { running: 0, failed: 1, passed: 2 };
  const cmp: Record<RunSortKey, (a: RunData, b: RunData) => number> = {
    result: (a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status],
    test: (a, b) => a.testName.localeCompare(b.testName),
    env: (a, b) => (a.envName ?? '').localeCompare(b.envName ?? ''),
    /* A run still going has no duration yet, and sorting it to the end of
       "longest" would be a lie about it. It sorts as forever, at the top of a
       descending sort, where a run that has not finished belongs. */
    duration: (a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity),
    when: (a, b) => a.date - b.date,
  };
  const sorted = [...rows].sort(cmp[state.sort.key]);
  return state.sort.desc ? sorted.reverse() : sorted;
}

export interface RunTabCount {
  key: RunTab;
  label: string;
  count: number;
}

export function runCounts(state: RunsState, now: number): RunTabCount[] {
  const pool = state.runs.filter((r) => matchesQuery(r, state.query) && matchesFilters(r, state.filters, now));
  const of = (s: RunStatus) => pool.filter((r) => r.status === s).length;
  return [
    { key: 'all', label: 'All', count: pool.length },
    { key: 'running', label: 'Running', count: of('running') },
    { key: 'failed', label: 'Failed', count: of('failed') },
    { key: 'passed', label: 'Passed', count: of('passed') },
  ];
}

export interface RunFilterDimension {
  key: RunFilterKey;
  label: string;
  hint?: string;
  single?: boolean;
  options: { value: string; label: string; count: number }[];
}

export function runFilterDimensions(state: RunsState, now: number): RunFilterDimension[] {
  const base = state.runs.filter((r) => matchesQuery(r, state.query) && (state.tab === 'all' || r.status === state.tab));
  /* Each option counts what it would leave, with the OTHER dimensions still
     applied and its own released. */
  const countWith = (key: RunFilterKey, value: string) =>
    base.filter((r) => matchesFilters(r, { ...state.filters, [key]: [value] } as RunFilters, now)).length;

  const envs = Array.from(new Set(state.runs.map((r) => r.envName).filter(Boolean) as string[])).sort();
  const tags = Array.from(new Set(state.runs.flatMap((r) => r.tags ?? []))).sort();
  const viewports = Array.from(new Set(state.runs.map((r) => r.resolution ?? 'desktop')));
  const regions = Array.from(new Set(state.runs.map((r) => r.region).filter(Boolean) as string[]));

  return [
    { key: 'envs', label: 'Environment', hint: 'Where the run executed', options: envs.map((v) => ({ value: v, label: v, count: countWith('envs', v) })) },
    { key: 'tags', label: 'Tags', options: tags.map((v) => ({ value: v, label: v, count: countWith('tags', v) })) },
    { key: 'viewports', label: 'Viewport', options: viewports.map((v) => ({ value: v, label: resolutionLabel(v as Resolution), count: countWith('viewports', v) })) },
    { key: 'regions', label: 'Region', options: regions.map((v) => ({ value: v, label: regionLabel(v), count: countWith('regions', v) })) },
    {
      key: 'period',
      label: 'Period',
      hint: 'Runs are the last seven days unless you say otherwise',
      single: true,
      options: PERIODS.map((p) => ({ value: p.value, label: p.label, count: countWith('period', p.value) })),
    },
  ];
}

export const runFilterCount = (f: RunFilters): number =>
  f.envs.length + f.tags.length + f.viewports.length + f.regions.length + f.period.length;

export function toggleRunFilter(f: RunFilters, key: RunFilterKey, value: string): RunFilters {
  const on = (f[key] as string[]).includes(value);
  /* Single-select replaces rather than accumulates, and clicking the value that
     is already on turns it off - "all time" is reachable by unticking, so the
     period never becomes a filter you cannot remove. */
  if (key === 'period') return { ...f, period: on ? [] : [value as Period] };
  const current = f[key] as string[];
  return { ...f, [key]: on ? current.filter((v) => v !== value) : [...current, value] };
}

export interface RunFilterChip {
  key: RunFilterKey;
  value: string;
  dimension: string;
  label: string;
}

export function activeRunFilters(state: RunsState, now: number): RunFilterChip[] {
  return runFilterDimensions(state, now).flatMap((d) =>
    d.options
      .filter((o) => (state.filters[d.key] as string[]).includes(o.value))
      .map((o) => ({ key: d.key, value: o.value, dimension: d.label, label: o.label })),
  );
}
