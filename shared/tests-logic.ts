/* ═══════════════════════════════════════════════════════════════════════════
   THE TESTS LIST, as arithmetic.

   Everything the page asks - which rows survive the filters, what each status
   tab counts, what a row's status actually reads as, what a bulk action would
   affect - is answered here and nowhere else. The React binding (useTests) only
   holds state and forwards questions, which is what keeps a table and a future
   drawer from disagreeing about whether a test "needs review".
   ═══════════════════════════════════════════════════════════════════════════ */

import type { DataState } from './issues-logic.ts';
import { REGIONS, RESOLUTIONS } from './runs-data.ts';
import {
  type DisplayStatus,
  type TestCase,
  isScheduled,
  scheduleFreq,
  scheduleLabel,
} from './tests-data.ts';

export type { DataState };

/** The status strip. `all` is a tab here rather than the empty selection,
 *  because a test has exactly ONE status: these are five views of one list, not
 *  five constraints that could combine. That is the difference between this
 *  strip and the issue queue's categories. */
export type StatusTab = 'all' | DisplayStatus;

/* ── the six dimensions ───────────────────────────────────────────────────
   Runs has had five of these since it was ported and the tests list had two,
   which is backwards: a run is one cell of the matrix a TEST describes, so
   every question you can ask of a run you can ask of the test that produced
   it. Environment, tags, viewport and region are the four Runs already asks in
   exactly these words; schedule and last result are the two only a test has.

   Nothing here is a new field. All six read what `TestCase` already carries.
   ───────────────────────────────────────────────────────────────────────── */
export type TestFilterKey = 'envs' | 'tags' | 'viewports' | 'regions' | 'schedules' | 'results';

export interface TestFilters {
  envs: string[];
  tags: string[];
  viewports: string[];
  regions: string[];
  /** `ScheduleFreq` values, plus UNSET for "not scheduled". */
  schedules: string[];
  /** 'passed' | 'failed' | 'never'. */
  results: string[];
}

/** The option every dimension gets for the rows that have nothing in it: no
 *  environment, no tags, no viewport, no region. A blank cell is a state
 *  somebody has to fix - five tests here can never run because no environment
 *  is set - and a filter menu that can only find the rows that ARE configured
 *  is a menu that hides its own worst rows. */
export const UNSET = 'unset';

export const NO_TEST_FILTERS: TestFilters = {
  envs: [],
  tags: [],
  viewports: [],
  regions: [],
  schedules: [],
  results: [],
};

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

/** One rule for all four list-valued dimensions: an empty selection constrains
 *  nothing, UNSET matches the rows with an empty list, and anything else is an
 *  OR across the values. Written once so "no environment" and "no tags" cannot
 *  end up meaning two different things. */
const matchesList = (values: readonly string[] | undefined, picked: string[]) => {
  if (picked.length === 0) return true;
  const list = values ?? [];
  if (list.length === 0) return picked.includes(UNSET);
  return picked.some((v) => list.includes(v));
};

const matchesEnvs = (tc: TestCase, envs: string[]) => matchesList(tc.envNames, envs);
const matchesTags = (tc: TestCase, tags: string[]) => matchesList(tc.tags, tags);
const matchesViewports = (tc: TestCase, picked: string[]) => matchesList(tc.resolutions, picked);
const matchesRegions = (tc: TestCase, picked: string[]) => matchesList(tc.regions, picked);

/** How often it runs, or that it does not. `scheduleFreq` is the one place that
 *  decides what "weekly" means, so the filter, the column and the tooltip
 *  cannot disagree. */
export const scheduleKey = (tc: TestCase): string => scheduleFreq(tc.schedule) ?? UNSET;

const matchesSchedules = (tc: TestCase, picked: string[]) =>
  picked.length === 0 || picked.includes(scheduleKey(tc));

/** What happened the last time it ran, with "never" as a real answer rather
 *  than an empty cell: seven of these have never run at all, and that is the
 *  most useful thing the list can tell you about them. */
export const resultKey = (tc: TestCase): 'passed' | 'failed' | 'never' => tc.lastResult ?? 'never';

const matchesResults = (tc: TestCase, picked: string[]) =>
  picked.length === 0 || picked.includes(resultKey(tc));

/** Every dimension except the one named, so an option can count what it WOULD
 *  leave rather than what is already selected. */
function matchesAllBut(tc: TestCase, f: TestFilters, except: TestFilterKey): boolean {
  return (
    (except === 'envs' || matchesEnvs(tc, f.envs)) &&
    (except === 'tags' || matchesTags(tc, f.tags)) &&
    (except === 'viewports' || matchesViewports(tc, f.viewports)) &&
    (except === 'regions' || matchesRegions(tc, f.regions)) &&
    (except === 'schedules' || matchesSchedules(tc, f.schedules)) &&
    (except === 'results' || matchesResults(tc, f.results))
  );
}

export function filterTests(state: TestsState): TestCase[] {
  const f = state.filters;
  return state.tests.filter(
    (tc) =>
      matchesQuery(tc, state.query) &&
      matchesStatus(tc, state.status, state.pauseOnRevision) &&
      matchesEnvs(tc, f.envs) &&
      matchesTags(tc, f.tags) &&
      matchesViewports(tc, f.viewports) &&
      matchesRegions(tc, f.regions) &&
      matchesSchedules(tc, f.schedules) &&
      matchesResults(tc, f.results),
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
      matchesTags(tc, state.filters.tags) &&
      matchesViewports(tc, state.filters.viewports) &&
      matchesRegions(tc, state.filters.regions) &&
      matchesSchedules(tc, state.filters.schedules) &&
      matchesResults(tc, state.filters.results),
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

/** In the order a schedule gets less frequent, not alphabetically: the menu
 *  reads as a rhythm rather than as a word list. */
const SCHEDULE_CHOICES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom days' },
] as const;

/** Failed first: it is the one you came here for. */
const RESULT_CHOICES = [
  { value: 'failed', label: 'Failed' },
  { value: 'passed', label: 'Passed' },
  { value: 'never', label: 'Never run' },
] as const;

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
  const base = state.tests.filter(
    (tc) => matchesQuery(tc, state.query) && matchesStatus(tc, state.status, state.pauseOnRevision),
  );

  /** An option's count is what it WOULD leave: the other five dimensions still
   *  applied, its own released. So a count answers "is this worth clicking"
   *  rather than "what did I already click". */
  const countOf = (key: TestFilterKey, match: (tc: TestCase) => boolean) =>
    base.filter((tc) => matchesAllBut(tc, state.filters, key) && match(tc)).length;

  /** Options plus the UNSET row, and the UNSET row only when something is
   *  actually in that state. A permanently empty option is one more thing to
   *  read past. */
  const withUnset = (
    key: TestFilterKey,
    options: TestFilterOption[],
    label: string,
    isUnset: (tc: TestCase) => boolean,
  ): TestFilterOption[] => {
    const count = countOf(key, isUnset);
    return count > 0 ? [...options, { value: UNSET, label, count }] : options;
  };

  const envNames = Array.from(new Set(state.tests.flatMap((tc) => tc.envNames ?? []))).sort();
  const tagNames = Array.from(new Set(state.tests.flatMap((tc) => tc.tags ?? []))).sort();

  return [
    {
      key: 'envs',
      label: 'Environment',
      hint: 'Where the test runs',
      options: withUnset(
        'envs',
        envNames.map((name) => ({
          value: name,
          label: name,
          count: countOf('envs', (tc) => (tc.envNames ?? []).includes(name)),
        })),
        'Not set',
        hasNoEnvironment,
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      hint: 'What the test covers',
      options: withUnset(
        'tags',
        tagNames.map((tag) => ({
          value: tag,
          label: tag,
          count: countOf('tags', (tc) => (tc.tags ?? []).includes(tag)),
        })),
        'Untagged',
        (tc) => (tc.tags?.length ?? 0) === 0,
      ),
    },
    /* Viewport and region are the two Runs already filters on, in the same
       words. A test declares the MATRIX and a run is one cell of it, so asking
       "which tests cover mobile" and "which runs were mobile" has to be the
       same question asked one level apart. */
    {
      key: 'viewports',
      label: 'Viewport',
      hint: 'The sizes it is checked at',
      options: withUnset(
        'viewports',
        RESOLUTIONS.map((r) => ({
          value: r.value,
          label: r.label,
          count: countOf('viewports', (tc) => (tc.resolutions ?? []).includes(r.value)),
        })),
        'Not set',
        (tc) => (tc.resolutions?.length ?? 0) === 0,
      ),
    },
    {
      key: 'regions',
      label: 'Region',
      hint: 'Where it is run from',
      options: withUnset(
        'regions',
        REGIONS.map((r) => ({
          value: r.value,
          label: r.label,
          count: countOf('regions', (tc) => (tc.regions ?? []).includes(r.value)),
        })),
        'Not set',
        (tc) => (tc.regions?.length ?? 0) === 0,
      ),
    },
    /* The two only a test has. A run happened once; a test has a rhythm and a
       history. */
    {
      key: 'schedules',
      label: 'Schedule',
      hint: 'How often it runs, or that it does not',
      options: [
        ...SCHEDULE_CHOICES.map((c) => ({
          value: c.value,
          label: c.label,
          count: countOf('schedules', (tc) => scheduleKey(tc) === c.value),
        })).filter((o) => o.count > 0),
        /* "Not scheduled" is not the absence of an answer here, it is the
           answer: a third of an approved suite that nothing will ever start. */
        { value: UNSET, label: 'Not scheduled', count: countOf('schedules', (tc) => scheduleKey(tc) === UNSET) },
      ],
    },
    {
      key: 'results',
      label: 'Last result',
      hint: 'What happened the last time it ran',
      options: RESULT_CHOICES.map((c) => ({
        value: c.value,
        label: c.label,
        count: countOf('results', (tc) => resultKey(tc) === c.value),
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

export const testFilterCount = (f: TestFilters): number =>
  f.envs.length + f.tags.length + f.viewports.length + f.regions.length + f.schedules.length + f.results.length;

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
  /* The steps are held as GROUPS, one per participant, and the base's own steps
     are a group too: a merge is a proposal about ORDER, and flattening it here
     would throw away the only thing there is to decide. The base's steps stay
     in place until then, so a cancel is a deletion of the pendingMerge and
     nothing else. */
  const merged: TestCase = {
    ...base,
    status: base.status === 'draft' ? 'draft' : 'paused',
    pendingMerge: {
      groups: [
        { title: base.title, steps: [...base.steps] },
        ...sources.map((s) => ({ title: s.title, steps: [...s.steps] })),
      ],
      sources,
      prevStatus: base.status,
    },
  };
  return tests.filter((tc) => !dropped.has(tc.key)).map((tc) => (tc.key === baseKey ? merged : tc));
}

/** Cancelling puts the absorbed tests back untouched and gives the base its
 *  status back. */
export function cancelMerge(tests: TestCase[], key: string): TestCase[] {
  const tc = tests.find((x) => x.key === key);
  const pm = tc?.pendingMerge;
  if (!tc || !pm) return tests;
  const restored: TestCase = { ...tc, status: pm.prevStatus, pendingMerge: undefined };
  return [...pm.sources, ...tests.map((x) => (x.key === key ? restored : x))];
}

/** A copy takes the steps and nothing else - no environment, schedule or tags
 *  travel with it - and lands as a draft at v1, at the top of the list. */
export function duplicateOf(tc: TestCase, id: string): TestCase {
  return {
    key: id,
    title: `${tc.title} (copy)`,
    status: 'draft',
    steps: [...tc.steps],
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

/* ═══════════════════════════════════════════════════════════════════════════
   HOW THE TESTS LIST IS DRAWN, which is a different question from which rows
   are in it.

   The queue already answers "what needs me" and the filters answer "which
   ones". What was missing is "show me this list the way I need to read it
   today" - by environment before a deploy, by last result during an incident,
   by tag when you are dividing work up. Same three questions as the issue
   queue's display menu, in this list's own vocabulary.
   ═══════════════════════════════════════════════════════════════════════════ */

export type TestGroupKey = 'none' | 'status' | 'env' | 'tag' | 'schedule' | 'result';
/** Every column the table can draw except the two it always draws: the test's
 *  name, and the row's actions. */
export type TestFieldKey = 'tags' | 'env' | 'schedule' | 'created' | 'lastRun' | 'status' | 'steps';

export interface TestsDisplay {
  group: TestGroupKey;
  fields: TestFieldKey[];
}

/** The shipped list: what a team sees before anybody touches this. `steps` and
 *  `lastRun` are off by default - the first is a number nobody sorts by and the
 *  second is the column this list still owes (§16), so it is offered rather
 *  than assumed. */
export const DEFAULT_TESTS_DISPLAY: TestsDisplay = {
  group: 'none',
  fields: ['tags', 'env', 'schedule', 'created', 'status'],
};

export const TEST_GROUP_CHOICES: { value: TestGroupKey; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Status' },
  { value: 'env', label: 'Environment' },
  { value: 'tag', label: 'Tag' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'result', label: 'Last result' },
];

export const TEST_FIELD_CHOICES: { value: TestFieldKey; label: string }[] = [
  { value: 'steps', label: 'Steps' },
  { value: 'tags', label: 'Tags' },
  { value: 'env', label: 'Environment' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'lastRun', label: 'Last run' },
  { value: 'created', label: 'Created' },
  { value: 'status', label: 'Status' },
];

/** The ordering choices, which are the same keys the column headers write - one
 *  sort, reachable two ways, rather than a menu and a header disagreeing.
 *  "Queue" is the absence of a sort, and it is the default for a reason: it is
 *  the order that puts what needs a person at the top. */
export const TEST_SORT_CHOICES: { value: TestSortKey | 'queue'; label: string }[] = [
  { value: 'queue', label: 'Queue order' },
  { value: 'title', label: 'Name' },
  { value: 'created', label: 'Created' },
  { value: 'env', label: 'Environment' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'status', label: 'Status' },
];

export interface TestGroup {
  key: string;
  /** Empty when there is one group, so the renderer draws no header rather than
   *  a header that says nothing. */
  label: string;
  tests: TestCase[];
}

const SCHEDULE_GROUP_ORDER = ['daily', 'weekdays', 'weekly', 'monthly', 'custom', UNSET];
const SCHEDULE_GROUP_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom days',
  [UNSET]: 'Not scheduled',
};

/**
 * The rows, in groups.
 *
 * Two rules that make this useful rather than decorative. A test can be in
 * SEVERAL groups when the axis is multi-valued - a test that runs on Production
 * and Staging appears under both, because the question "what runs on Staging"
 * has to be answerable by reading one block. And every axis has a group for the
 * rows that have nothing on it, named for what is missing, because those are
 * usually the rows you are looking for.
 */
export function groupTests(tests: TestCase[], display: TestsDisplay, pauseOnRevision: boolean): TestGroup[] {
  const some = (g: TestGroup[]) => g.filter((x) => x.tests.length > 0);

  switch (display.group) {
    case 'status': {
      const order: DisplayStatus[] = ['draft', 'needs_review', 'approved', 'active', 'paused'];
      const label: Record<DisplayStatus, string> = {
        draft: 'Drafts',
        needs_review: 'Needs review',
        approved: 'Approved',
        active: 'Active',
        paused: 'Paused',
      };
      return some(
        order.map((s) => ({
          key: s,
          label: label[s],
          tests: tests.filter((tc) => displayStatus(tc, pauseOnRevision) === s),
        })),
      );
    }
    case 'env': {
      const names = Array.from(new Set(tests.flatMap((tc) => tc.envNames ?? []))).sort();
      return some([
        ...names.map((n) => ({ key: n, label: n, tests: tests.filter((tc) => (tc.envNames ?? []).includes(n)) })),
        { key: UNSET, label: 'No environment', tests: tests.filter(hasNoEnvironment) },
      ]);
    }
    case 'tag': {
      const names = Array.from(new Set(tests.flatMap((tc) => tc.tags ?? []))).sort();
      return some([
        ...names.map((n) => ({ key: n, label: n, tests: tests.filter((tc) => (tc.tags ?? []).includes(n)) })),
        { key: UNSET, label: 'Untagged', tests: tests.filter((tc) => (tc.tags?.length ?? 0) === 0) },
      ]);
    }
    case 'schedule':
      return some(
        SCHEDULE_GROUP_ORDER.map((f) => ({
          key: f,
          label: SCHEDULE_GROUP_LABEL[f] ?? f,
          tests: tests.filter((tc) => scheduleKey(tc) === f),
        })),
      );
    case 'result':
      return some([
        { key: 'failed', label: 'Failed last run', tests: tests.filter((tc) => resultKey(tc) === 'failed') },
        { key: 'passed', label: 'Passed last run', tests: tests.filter((tc) => resultKey(tc) === 'passed') },
        { key: 'never', label: 'Never run', tests: tests.filter((tc) => resultKey(tc) === 'never') },
      ]);
    case 'none':
    default:
      return tests.length ? [{ key: 'all', label: '', tests }] : [];
  }
}

/** How far the display is from the shipped one, for the trigger's badge. */
export function testsDisplayCount(d: TestsDisplay, sort: TestSort | null): number {
  const fieldsSame =
    d.fields.length === DEFAULT_TESTS_DISPLAY.fields.length &&
    DEFAULT_TESTS_DISPLAY.fields.every((f) => d.fields.includes(f));
  return (d.group !== 'none' ? 1 : 0) + (fieldsSame ? 0 : 1) + (sort ? 1 : 0);
}
