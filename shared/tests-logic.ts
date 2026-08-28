/* ═══════════════════════════════════════════════════════════════════════════
   THE TESTS LIST, as arithmetic.

   Everything the page asks - which rows survive the filters, what each status
   tab counts, what a row's status actually reads as, what a bulk action would
   affect - is answered here and nowhere else. The React binding (useTests) only
   holds state and forwards questions, which is what keeps a table and a future
   drawer from disagreeing about whether a test "needs review".
   ═══════════════════════════════════════════════════════════════════════════ */

import type { DataState } from './issues-logic.ts';
import {
  type DisplayStatus,
  type TestCase,
  isScheduled,
  scheduleLabel,
} from './tests-data.ts';

export type { DataState };

/** The status strip. `all` is a tab here rather than the empty selection,
 *  because a test has exactly ONE status: these are five views of one list, not
 *  five constraints that could combine. That is the difference between this
 *  strip and the issue queue's categories. */
export type StatusTab = 'all' | DisplayStatus;

export type TestFilterKey = 'envs' | 'tags';

export interface TestFilters {
  envs: string[];
  tags: string[];
}

export const NO_TEST_FILTERS: TestFilters = { envs: [], tags: [] };

export type TestSortKey = 'title' | 'env' | 'schedule' | 'status' | 'created';

export interface TestSort {
  key: TestSortKey;
  desc: boolean;
}

export interface TestsState {
  tests: TestCase[];
  query: string;
  status: StatusTab;
  filters: TestFilters;
  /** Sorting by a column header is off until someone asks for it, because the
   *  default order is not a sort - see `orderTests`. */
  sort: TestSort | null;
  /** Preferences → Agents → Tests. On, a pending revision suspends the test and
   *  the row reads "Needs review"; off, the test keeps running and the review
   *  is only announced. The page never decides this for itself. */
  pauseOnRevision: boolean;
}

export const PAGE_SIZE = 20;

export const INITIAL_TESTS_STATE = (tests: readonly TestCase[]): TestsState => ({
  tests: [...tests],
  query: '',
  status: 'all',
  filters: NO_TEST_FILTERS,
  sort: null,
  pauseOnRevision: true,
});

/* ── what a row is ────────────────────────────────────────────────────────── */

/** A proposed new version of the steps is waiting to be read. Independent of
 *  whether it also pauses the test. */
export const needsReview = (tc: TestCase): boolean => tc.pendingRevision != null;

/** Nothing to run against. A paused test in this state cannot resume until an
 *  environment is set, which is why Resume is disabled rather than absent. */
export const hasNoEnvironment = (tc: TestCase): boolean => (tc.envNames?.length ?? 0) === 0;

export function displayStatus(tc: TestCase, pauseOnRevision: boolean): DisplayStatus {
  return tc.pendingRevision && pauseOnRevision ? 'needs_review' : tc.status;
}

/** Waiting on a person: a new draft, a proposed revision, or a merge nobody has
 *  arranged yet. This is what floats to the top of an unsorted list and what
 *  the rail badge counts. */
export const waitingOnYou = (tc: TestCase): boolean =>
  tc.status === 'draft' || needsReview(tc) || tc.pendingMerge != null;

export const attentionCount = (tests: readonly TestCase[]): number => tests.filter(waitingOnYou).length;

/* ── filtering ────────────────────────────────────────────────────────────── */

const matchesQuery = (tc: TestCase, q: string) => !q || tc.title.toLowerCase().includes(q.toLowerCase().trim());

const matchesStatus = (tc: TestCase, tab: StatusTab, pauseOnRevision: boolean) => {
  if (tab === 'all') return true;
  /* The review tab counts every pending revision, including the ones that do
     not pause their test - otherwise turning the preference off would empty a
     tab whose whole job is to surface reviews. */
  if (tab === 'needs_review') return needsReview(tc);
  return displayStatus(tc, pauseOnRevision) === tab;
};

const matchesEnvs = (tc: TestCase, envs: string[]) =>
  envs.length === 0 || envs.some((e) => (tc.envNames ?? []).includes(e));

const matchesTags = (tc: TestCase, tags: string[]) =>
  tags.length === 0 || tags.some((t) => (tc.tags ?? []).includes(t));

export function filterTests(state: TestsState): TestCase[] {
  return state.tests.filter(
    (tc) =>
      matchesQuery(tc, state.query) &&
      matchesStatus(tc, state.status, state.pauseOnRevision) &&
      matchesEnvs(tc, state.filters.envs) &&
      matchesTags(tc, state.filters.tags),
  );
}

const STATUS_ORDER: Record<DisplayStatus, number> = {
  draft: 0,
  needs_review: 1,
  approved: 2,
  active: 3,
  paused: 4,
};

/**
 * The default order is not a sort, it is a queue: drafts first, then anything
 * waiting on a review, then the rest untouched. A column sort REPLACES that
 * ordering rather than sorting inside it - a list that is half queue and half
 * sort is a list nobody can predict - and clearing the sort brings the queue
 * back.
 */
export function orderTests(rows: TestCase[], state: TestsState): TestCase[] {
  const { sort } = state;
  if (sort) {
    const cmp: Record<TestSortKey, (a: TestCase, b: TestCase) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      env: (a, b) => (a.envNames?.[0] ?? '').localeCompare(b.envNames?.[0] ?? ''),
      schedule: (a, b) => scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
      status: (a, b) =>
        STATUS_ORDER[displayStatus(a, state.pauseOnRevision)] -
        STATUS_ORDER[displayStatus(b, state.pauseOnRevision)],
      created: (a, b) => a.createdAt - b.createdAt,
    };
    const sorted = [...rows].sort(cmp[sort.key]);
    return sort.desc ? sorted.reverse() : sorted;
  }
  const drafts = rows.filter((tc) => tc.status === 'draft');
  const review = rows.filter((tc) => tc.status !== 'draft' && (needsReview(tc) || tc.pendingMerge));
  const rest = rows.filter((tc) => tc.status !== 'draft' && !needsReview(tc) && !tc.pendingMerge);
  return [...drafts, ...review, ...rest];
}

/* ── the status strip ─────────────────────────────────────────────────────── */

export interface StatusCount {
  key: StatusTab;
  label: string;
  count: number;
}

/**
 * The counts the strip prints, computed against the SEARCH and the filters but
 * not against the status itself - a tab has to be able to say how many rows it
 * would show, which it cannot do if it is already filtered to itself.
 *
 * "Needs review" is the one tab that comes and goes: a tab that is permanently
 * empty reads as one more thing to worry about, so it exists only while
 * something is actually waiting.
 */
export function statusCounts(state: TestsState): StatusCount[] {
  const pool = state.tests.filter(
    (tc) =>
      matchesQuery(tc, state.query) &&
      matchesEnvs(tc, state.filters.envs) &&
      matchesTags(tc, state.filters.tags),
  );
  const of = (s: DisplayStatus) => pool.filter((tc) => displayStatus(tc, state.pauseOnRevision) === s).length;
  const review = pool.filter(needsReview).length;

  return [
    { key: 'all', label: 'All', count: pool.length },
    { key: 'draft', label: 'Drafts', count: of('draft') },
    ...(review > 0 ? [{ key: 'needs_review' as const, label: 'Needs review', count: review }] : []),
    { key: 'approved', label: 'Approved', count: of('approved') },
    { key: 'active', label: 'Active', count: of('active') },
    { key: 'paused', label: 'Paused', count: of('paused') },
  ];
}

/* ── the filter menu ──────────────────────────────────────────────────────── */

export interface TestFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface TestFilterDimension {
  key: TestFilterKey;
  label: string;
  hint?: string;
  options: TestFilterOption[];
}

/** Every option carries the count it WOULD produce, computed with the other
 *  dimension still applied and its own dimension released - so a count answers
 *  "is this worth clicking" rather than "what did I already click". */
export function testFilterDimensions(state: TestsState): TestFilterDimension[] {
  const envNames = Array.from(new Set(state.tests.flatMap((tc) => tc.envNames ?? []))).sort();
  const tagNames = Array.from(new Set(state.tests.flatMap((tc) => tc.tags ?? []))).sort();

  const base = state.tests.filter(
    (tc) => matchesQuery(tc, state.query) && matchesStatus(tc, state.status, state.pauseOnRevision),
  );

  return [
    {
      key: 'envs',
      label: 'Environment',
      hint: 'Where the test runs',
      options: envNames.map((name) => ({
        value: name,
        label: name,
        count: base.filter((tc) => matchesTags(tc, state.filters.tags) && (tc.envNames ?? []).includes(name)).length,
      })),
    },
    {
      key: 'tags',
      label: 'Tags',
      hint: 'What the test covers',
      options: tagNames.map((tag) => ({
        value: tag,
        label: tag,
        count: base.filter((tc) => matchesEnvs(tc, state.filters.envs) && (tc.tags ?? []).includes(tag)).length,
      })),
    },
  ];
}

export const isTestFilterActive = (f: TestFilters, key: TestFilterKey, value: string): boolean =>
  f[key].includes(value);

export function toggleTestFilter(f: TestFilters, key: TestFilterKey, value: string): TestFilters {
  const on = f[key].includes(value);
  return { ...f, [key]: on ? f[key].filter((v) => v !== value) : [...f[key], value] };
}

export const testFilterCount = (f: TestFilters): number => f.envs.length + f.tags.length;

export interface TestFilterChip {
  key: TestFilterKey;
  value: string;
  dimension: string;
  label: string;
}

export function activeTestFilters(state: TestsState): TestFilterChip[] {
  return testFilterDimensions(state).flatMap((d) =>
    d.options
      .filter((o) => isTestFilterActive(state.filters, d.key, o.value))
      .map((o) => ({ key: d.key, value: o.value, dimension: d.label, label: o.label })),
  );
}

/** Which of the three empty lists this is, so the empty state can name the
 *  control that caused it instead of saying "no results". */
export function testsEmptyReason(state: TestsState, visible: number): 'none' | 'filters' | 'status' | null {
  if (visible > 0) return null;
  if (state.tests.length === 0) return 'none';
  if (state.query || testFilterCount(state.filters) > 0) return 'filters';
  return 'status';
}

/* ── what a bulk action would do ──────────────────────────────────────────── */

export interface BulkScope {
  /** Active tests among the selection: how many Pause would stop. */
  pausable: number;
  /** Paused tests that can actually start again. A test with no environment has
   *  nothing to run against, and one mid-merge is paused BY the merge. */
  resumable: number;
  /** A merge cannot absorb a test that is already waiting on a review. */
  mergeBlocked: boolean;
}

export function bulkScope(selected: readonly TestCase[]): BulkScope {
  return {
    pausable: selected.filter((tc) => tc.status === 'active').length,
    resumable: selected.filter(
      (tc) => tc.status === 'paused' && !hasNoEnvironment(tc) && !tc.pendingMerge,
    ).length,
    mergeBlocked: selected.some((tc) => needsReview(tc) || tc.pendingMerge != null),
  };
}

/* ── mutations, as pure list rewrites ─────────────────────────────────────── */

export const patchTests = (
  tests: TestCase[],
  keys: readonly string[],
  patch: (tc: TestCase) => Partial<TestCase>,
  where: (tc: TestCase) => boolean = () => true,
): TestCase[] =>
  tests.map((tc) => (keys.includes(tc.key) && where(tc) ? { ...tc, ...patch(tc) } : tc));

/**
 * Deleting a merge-in-review kills the BASE only. The absorbed tests were
 * separate tests moments ago, so they come back to the list rather than dying
 * as silent collateral.
 */
export function removeTests(tests: TestCase[], keys: readonly string[]): TestCase[] {
  const set = new Set(keys);
  const restored = tests.filter((tc) => set.has(tc.key) && tc.pendingMerge).flatMap((tc) => tc.pendingMerge!.sources);
  return [...restored, ...tests.filter((tc) => !set.has(tc.key))];
}

/**
 * Merge: the FIRST selected test is the base and keeps its name, settings, tags,
 * schedule and run history; the others fold into it. Nothing runs until the
 * combined steps are arranged and accepted, so a non-draft base parks at
 * `paused` and the originals are kept whole for cancel.
 */
export function mergeTests(tests: TestCase[], baseKey: string, others: readonly string[]): TestCase[] {
  const base = tests.find((tc) => tc.key === baseKey);
  if (!base) return tests;
  const sources = tests.filter((tc) => others.includes(tc.key));
  const dropped = new Set(sources.map((s) => s.key));
  const merged: TestCase = {
    ...base,
    status: base.status === 'draft' ? 'draft' : 'paused',
    stepCount: base.stepCount + sources.reduce((n, s) => n + s.stepCount, 0),
    pendingMerge: { sources, prevStatus: base.status },
  };
  return tests.filter((tc) => !dropped.has(tc.key)).map((tc) => (tc.key === baseKey ? merged : tc));
}

/** Cancelling puts the absorbed tests back untouched and gives the base its
 *  status back. */
export function cancelMerge(tests: TestCase[], key: string): TestCase[] {
  const tc = tests.find((x) => x.key === key);
  const pm = tc?.pendingMerge;
  if (!tc || !pm) return tests;
  const restored: TestCase = {
    ...tc,
    status: pm.prevStatus,
    stepCount: tc.stepCount - pm.sources.reduce((n, s) => n + s.stepCount, 0),
    pendingMerge: undefined,
  };
  return [...pm.sources, ...tests.map((x) => (x.key === key ? restored : x))];
}

/** A copy takes the steps and nothing else - no environment, schedule or tags
 *  travel with it - and lands as a draft at v1, at the top of the list. */
export function duplicateOf(tc: TestCase, id: string): TestCase {
  return {
    key: id,
    title: `${tc.title} (copy)`,
    status: 'draft',
    stepCount: tc.stepCount,
    createdAt: Date.now(),
    origin: 'user',
    isNew: true,
  };
}

/* ── environments ─────────────────────────────────────────────────────────────
   Deleting one is never a local edit: an environment is where tests RUN, so
   removing it reaches into the list of tests and stops some of them. The two
   groups it splits them into are what the confirm dialog has to say out loud
   before anybody clicks. */

export interface EnvImpact {
  /** This was their only environment and they were running: they stop, and
   *  cannot start again until somebody gives them one. */
  paused: TestCase[];
  /** They run somewhere else too: they lose this one and carry on. */
  detached: TestCase[];
}

export function envImpact(tests: readonly TestCase[], envName: string): EnvImpact {
  const uses = tests.filter((tc) => (tc.envNames ?? []).includes(envName));
  return {
    paused: uses.filter((tc) => tc.envNames?.length === 1 && tc.status === 'active'),
    detached: uses.filter((tc) => (tc.envNames?.length ?? 0) > 1),
  };
}

/** Applies that impact. A test left with no environment and no way to run parks
 *  at `paused` rather than pretending to be active. */
export function dropEnvironment(tests: TestCase[], envName: string): TestCase[] {
  return tests.map((tc) => {
    if (!(tc.envNames ?? []).includes(envName)) return tc;
    const envNames = tc.envNames!.filter((n) => n !== envName);
    return {
      ...tc,
      envNames,
      status: envNames.length === 0 && tc.status === 'active' ? ('paused' as const) : tc.status,
    };
  });
}

/** Dropping the schedule returns the test to `approved`: ready, not running. */
export const UNSCHEDULED: Partial<TestCase> = { status: 'approved', schedule: null };

export const isRunnable = (tc: TestCase, pauseOnRevision: boolean): boolean =>
  tc.status !== 'draft' && !tc.pendingMerge && !(pauseOnRevision && needsReview(tc));

export { isScheduled };
