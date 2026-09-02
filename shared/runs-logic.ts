/* The runs list, as arithmetic. Same shape as tests-logic: state in, questions
 * answered, no React and no styling. */

import { RUNS, type RunData, type RunStatus, regionLabel, resolutionLabel } from './runs-data.ts';
import type { Resolution } from './tests-data.ts';
import { DEFAULT_RANGE, withinRange, type DateRangeValue } from './date-range.ts';

export type RunTab = 'all' | RunStatus;

export type RunFilterKey = 'envs' | 'tags' | 'viewports' | 'regions';

/* ⚠ THE PERIOD LEFT THIS MENU on 2026-09-02. It had been a single-select
   dimension inside Filters - the one list in the app whose date window was a
   filter, on four other lists it was a control of its own or missing entirely.
   It is now the shared `DateRange`, in the toolbar, on every list. The
   reasoning that put it here still holds and is now the trigger's job: THE
   DEFAULT MUST BE VISIBLE, because a list silently truncated to seven days
   lies about how much there is. A control that prints its own value says it at
   least as loudly as a removable chip did, and it can also say "Jul 3 - Jul
   18", which a preset never could. */

export interface RunFilters {
  envs: string[];
  tags: string[];
  viewports: string[];
  regions: string[];
}

export const DEFAULT_RUN_FILTERS: RunFilters = {
  envs: [],
  tags: [],
  viewports: [],
  regions: [],
};

export const NO_RUN_FILTERS: RunFilters = { envs: [], tags: [], viewports: [], regions: [] };

export type RunSortKey = 'result' | 'test' | 'env' | 'duration' | 'when';

export interface RunsState {
  runs: RunData[];
  query: string;
  tab: RunTab;
  filters: RunFilters;
  /* Runs default to thirty days like every other list. It used to be seven,
     which was right when the window was buried in a menu and wrong now that it
     is printed on the toolbar: the same default everywhere is what stops the
     window moving under you as you cross the app. */
  range: DateRangeValue;
  sort: { key: RunSortKey; desc: boolean } | null;
}

export const RUNS_PAGE_SIZE = 20;

export const INITIAL_RUNS_STATE: RunsState = {
  runs: [...RUNS],
  query: '',
  tab: 'all',
  filters: DEFAULT_RUN_FILTERS,
  range: DEFAULT_RANGE,
  /* Newest first, because a run list is a log and a log is read from the top.
     This is the one list in the app that arrives sorted rather than queued:
     there is no "waiting on you" among finished runs. */
  sort: { key: 'when', desc: true },
};

const matchesQuery = (r: RunData, q: string) =>
  !q.trim() || r.testName.toLowerCase().includes(q.trim().toLowerCase());

const matchesFilters = (r: RunData, f: RunFilters) =>
  (f.envs.length === 0 || (r.envName != null && f.envs.includes(r.envName))) &&
  (f.tags.length === 0 || (r.tags ?? []).some((t) => f.tags.includes(t))) &&
  (f.viewports.length === 0 || f.viewports.includes(r.resolution ?? 'desktop')) &&
  (f.regions.length === 0 || (r.region != null && f.regions.includes(r.region)));

/** The window and the filters are two questions, and every count in here has
 *  to answer both: an option's count that ignored the date window would
 *  promise rows the list cannot show. */
const inScope = (r: RunData, state: RunsState, now: number) =>
  matchesFilters(r, state.filters) && withinRange(r.date, state.range, now);

export function filterRuns(state: RunsState, now: number): RunData[] {
  const rows = state.runs.filter(
    (r) =>
      matchesQuery(r, state.query) &&
      (state.tab === 'all' || r.status === state.tab) &&
      inScope(r, state, now),
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
  const pool = state.runs.filter((r) => matchesQuery(r, state.query) && inScope(r, state, now));
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
    base.filter((r) => inScope(r, { ...state, filters: { ...state.filters, [key]: [value] } as RunFilters }, now)).length;

  const envs = Array.from(new Set(state.runs.map((r) => r.envName).filter(Boolean) as string[])).sort();
  const tags = Array.from(new Set(state.runs.flatMap((r) => r.tags ?? []))).sort();
  const viewports = Array.from(new Set(state.runs.map((r) => r.resolution ?? 'desktop')));
  const regions = Array.from(new Set(state.runs.map((r) => r.region).filter(Boolean) as string[]));

  return [
    { key: 'envs', label: 'Environment', hint: 'Where the run executed', options: envs.map((v) => ({ value: v, label: v, count: countWith('envs', v) })) },
    { key: 'tags', label: 'Tags', options: tags.map((v) => ({ value: v, label: v, count: countWith('tags', v) })) },
    { key: 'viewports', label: 'Viewport', options: viewports.map((v) => ({ value: v, label: resolutionLabel(v as Resolution), count: countWith('viewports', v) })) },
    { key: 'regions', label: 'Region', options: regions.map((v) => ({ value: v, label: regionLabel(v), count: countWith('regions', v) })) },
  ];
}

export const runFilterCount = (f: RunFilters): number =>
  f.envs.length + f.tags.length + f.viewports.length + f.regions.length;

export function toggleRunFilter(f: RunFilters, key: RunFilterKey, value: string): RunFilters {
  const on = (f[key] as string[]).includes(value);
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

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT ONE RUN RECORDED.

   Derived rather than stored, and that is the honest shape of it: a run is one
   execution of a TEST, so its steps ARE the test's steps and storing a second
   copy of them per run is how eighty rows drift from the four they came from.
   What a run adds is what happened to each one.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConsoleLine, NetworkCall, RunStep, StepStatus } from './runs-data.ts';

/** A small deterministic number from a string, so the generated detail of a run
 *  is the same on every render and every reload. `Math.random()` here would
 *  make a screenshot count change while you are looking at it. */
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/**
 * The run's steps, with what happened to each.
 *
 * A finished run tells a simple story: everything before the failure passed,
 * the failing step failed, and everything after it never ran.
 *
 * ⚠ A RUN IN FLIGHT TELLS NOTHING AT ALL, and that is the honest answer rather
 * than a missing feature. This used to infer a position from elapsed time -
 * so many seconds a step - and hand back "passed, passed, running, unknown".
 * Every part of that was invented: the runner does not report progress, so the
 * ticks were a guess dressed as a result and the one "running" step was a guess
 * about the only thing anybody wanted to know. Gabriel, twice: "the runs with
 * status running can't have check or loading indicators in the steps, because
 * we don't know which step we're at."
 *
 * So while a run is running, EVERY step is running. The drawer draws them all
 * the same because they are all the same to us, and the shimmer says the thing
 * that is actually true: this is happening now.
 */
export function runSteps(run: RunData, testSteps: readonly string[]): RunStep[] {
  const source = testSteps.length > 0 ? testSteps : Array.from({ length: run.stepCount }, (_, i) => `Step ${i + 1}`);
  const seed = hash(run.key);
  return source.map((text, i) => {
    const shots = 1 + ((seed + i * 7) % 3);
    let status: StepStatus;
    if (run.status === 'running') {
      status = 'running';
    } else if (run.failedStep == null) {
      status = 'passed';
    } else if (i + 1 < run.failedStep) {
      status = 'passed';
    } else if (i + 1 === run.failedStep) {
      status = 'failed';
    } else {
      status = 'skipped';
    }
    return { text, status, shots };
  });
}

/* A passed run captures no console and no network: there is nothing to look at,
   and keeping the panels but empty is what makes people think the capture is
   broken. The drawer disables those tabs and says why. */

/** The console, as the run recorded it. Only a failing run has one. */
export function runConsole(run: RunData): ConsoleLine[] {
  if (run.status === 'passed') return [];
  const seed = hash(run.key);
  const base: ConsoleLine[] = [
    { level: 'log', at: 120, text: 'app: hydrated' },
    { level: 'log', at: 480 + (seed % 200), text: 'router: navigated to /checkout' },
    { level: 'warn', at: 1200 + (seed % 400), text: 'Deprecated: `window.legacyPay` will be removed in v4' },
  ];
  if (run.status === 'failed') {
    base.push(
      { level: 'error', at: (run.duration ?? 4000) - 900, text: 'Failed to load resource: the server responded with a status of 500' },
      { level: 'error', at: (run.duration ?? 4000) - 40, text: run.error ?? 'Uncaught (in promise) TimeoutError' },
    );
  }
  return base;
}

/** The requests the run made. Only a failing run keeps them. */
export function runNetwork(run: RunData): NetworkCall[] {
  if (run.status === 'passed') return [];
  const seed = hash(run.key);
  const t = (wait: number) => ({
    blocked: 1 + (seed % 3),
    dns: seed % 7,
    connect: 4 + (seed % 9),
    send: 1,
    wait,
    receive: 2 + (seed % 5),
  });
  const calls: NetworkCall[] = [
    { method: 'GET', url: '/api/session', status: 200, time: 84 + (seed % 40), size: 1240, timing: t(70) },
    { method: 'GET', url: '/api/cart', status: 200, time: 122 + (seed % 60), size: 4820, timing: t(96) },
    { method: 'POST', url: '/api/checkout/validate', status: 200, time: 210 + (seed % 90), size: 320, timing: t(180) },
  ];
  if (run.status === 'failed') {
    calls.push(
      { method: 'POST', url: '/api/payments/authorize', status: 500, time: 5010, size: 180, timing: t(4980) },
      { method: 'GET', url: '/api/orders/latest', status: 404, time: 61, size: 96, timing: t(48) },
    );
  }
  return calls;
}

/** How many of them failed, for the count on the tab. A tab that says 2 is the
 *  reason anybody opens it. */
export const netErrorCount = (calls: readonly NetworkCall[]): number => calls.filter((c) => c.status >= 400).length;
export const consoleErrorCount = (lines: readonly ConsoleLine[]): number => lines.filter((l) => l.level === 'error').length;
