/* The React binding over shared/tests-logic.ts. Same shape as useIssues and
 * deliberately as thin: it holds state, and every question about what the list
 * contains, what a tab counts or what a bulk action would touch goes to the
 * pure layer. Nothing here decides anything a drawer would have to decide
 * again. */

import { useCallback, useMemo, useState } from 'react';
import { ENVIRONMENTS, TESTS, type Environment, type Resolution, type TestCase } from '@shared/tests-data.ts';
import {
  INITIAL_TESTS_STATE,
  NO_TEST_FILTERS,
  PAGE_SIZE,
  UNSCHEDULED,
  activeTestFilters,
  bulkScope,
  cancelMerge,
  displayStatus,
  dropEnvironment,
  envImpact,
  duplicateOf,
  filterTests,
  mergeTests,
  needsReview,
  orderTests,
  patchTests,
  removeTests,
  statusCounts,
  testFilterCount,
  testFilterDimensions,
  testsEmptyReason,
  type StatusTab,
  type TestFilterKey,
  type TestSortKey,
  type TestsState,
} from '@shared/tests-logic.ts';

let counter = 0;
const nextKey = (prefix: string) => `${prefix}-${(counter += 1)}-${Date.now()}`;

/** The preset environment, viewport and region a new test starts from. Single
 *  values: the multi-select matrix belongs to each test, not to the default. */
export interface RunDefaults {
  envName?: string;
  resolution?: Resolution;
  region?: string;
}

export function useTests() {
  const [state, setState] = useState<TestsState>(() => INITIAL_TESTS_STATE(TESTS));
  /* Environments and the run defaults live HERE, beside the tests, because
     deleting an environment has to reach the tests and stop some of them. Two
     stores would let that fact fall between them. */
  const [environments, setEnvironments] = useState<Environment[]>(() => [...ENVIRONMENTS]);
  const [defaults, setDefaultsState] = useState<RunDefaults>({ envName: 'Production', resolution: 'desktop', region: 'paris' });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  /** The row whose panel is open. One key, because two panels cannot share the
   *  one drawer slot and a boolean per row could claim they do. */
  const [openKey, setOpenKey] = useState<string | null>(null);

  const patch = useCallback((fn: (s: TestsState) => TestsState) => setState(fn), []);
  /* Anything that changes WHICH rows there are returns to the first page.
     Staying on page 3 of a list that is now one page long shows an empty table
     and blames the filter. */
  const rewind = useCallback(() => setPage(1), []);

  const setTests = useCallback(
    (fn: (tests: TestCase[]) => TestCase[]) => patch((s) => ({ ...s, tests: fn(s.tests) })),
    [patch],
  );

  const ordered = useMemo(() => orderTests(filterTests(state), state), [state]);
  const total = ordered.length;
  const rows = useMemo(() => ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [ordered, page]);
  const counts = useMemo(() => statusCounts(state), [state]);
  const dimensions = useMemo(() => testFilterDimensions(state), [state]);
  const chips = useMemo(() => activeTestFilters(state), [state]);
  const selectedTests = useMemo(() => state.tests.filter((tc) => selected.includes(tc.key)), [state.tests, selected]);
  const scope = useMemo(() => bulkScope(selectedTests), [selectedTests]);

  const statusOf = useCallback(
    (tc: TestCase) => displayStatus(tc, state.pauseOnRevision),
    [state.pauseOnRevision],
  );

  const open = state.tests.find((tc) => tc.key === openKey) ?? null;

  /* Opening a new draft is what marks it seen, so the dot clears the moment
     somebody has actually looked - not when the page loads. */
  const openTest = useCallback(
    (tc: TestCase) => {
      setOpenKey(tc.key);
      if (tc.status === 'draft' && tc.isNew) {
        setTests((tests) => patchTests(tests, [tc.key], () => ({ isNew: false })));
      }
    },
    [setTests],
  );

  const remove = useCallback(
    (keys: readonly string[]) => {
      setTests((tests) => removeTests(tests, keys));
      setSelected((prev) => prev.filter((k) => !keys.includes(k)));
      setOpenKey((k) => (k && keys.includes(k) ? null : k));
    },
    [setTests],
  );

  return {
    /* state */
    state,
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    paginated: total > PAGE_SIZE,
    counts,
    dimensions,
    chips,
    filterCount: testFilterCount(state.filters),
    emptyReason: testsEmptyReason(state, total),
    selected,
    selectedTests,
    scope,
    open,
    statusOf,
    needsReview,
    pauseOnRevision: state.pauseOnRevision,

    /* filtering */
    setQuery: (query: string) => {
      patch((s) => ({ ...s, query }));
      rewind();
    },
    setStatus: (status: StatusTab) => {
      patch((s) => ({ ...s, status }));
      rewind();
    },
    toggleFilter: (key: TestFilterKey, value: string) => {
      patch((s) => {
        const on = s.filters[key].includes(value);
        return {
          ...s,
          filters: {
            ...s.filters,
            [key]: on ? s.filters[key].filter((v) => v !== value) : [...s.filters[key], value],
          },
        };
      });
      rewind();
    },
    isFilterActive: (key: TestFilterKey, value: string) => state.filters[key].includes(value),
    clearFilters: () => {
      patch((s) => ({ ...s, filters: NO_TEST_FILTERS, query: '' }));
      rewind();
    },
    /* A third click on a header clears the sort and gives the queue order back,
       which is why this takes a nullable key rather than a direction. */
    setSort: (key: TestSortKey | null, desc = false) => {
      patch((s) => ({ ...s, sort: key ? { key, desc } : null }));
      rewind();
    },
    setPage,
    setPauseOnRevision: (pauseOnRevision: boolean) => patch((s) => ({ ...s, pauseOnRevision })),

    /* selection */
    setSelected,
    clearSelection: () => setSelected([]),
    selectAlso: (key: string) => setSelected((prev) => (prev.includes(key) ? prev : [...prev, key])),

    /* the drawer */
    openTest,
    closeTest: () => setOpenKey(null),

    /* row actions */
    pause: (key: string) => setTests((t) => patchTests(t, [key], () => ({ status: 'paused' }))),
    resume: (key: string) => setTests((t) => patchTests(t, [key], () => ({ status: 'active' }))),
    unschedule: (key: string) => setTests((t) => patchTests(t, [key], () => UNSCHEDULED)),
    duplicate: (tc: TestCase) => {
      const copy = duplicateOf(tc, nextKey('tc-copy'));
      setTests((t) => [copy, ...t]);
      return copy;
    },
    remove,

    /* environments */
    environments,
    defaults,
    setDefaults: (patchDefaults: Partial<RunDefaults>) =>
      setDefaultsState((prev) => ({ ...prev, ...patchDefaults })),
    envImpact: (envName: string) => envImpact(state.tests, envName),
    deleteEnvironment: (env: Environment) => {
      setTests((t) => dropEnvironment(t, env.name));
      setEnvironments((prev) => prev.filter((e) => e.id !== env.id));
      /* It cannot stay the default either - a default pointing at a deleted
         environment is a new test born broken. */
      setDefaultsState((prev) => (prev.envName === env.name ? { ...prev, envName: undefined } : prev));
    },

    /* bulk */
    pauseSelected: () => {
      setTests((t) => patchTests(t, selected, () => ({ status: 'paused' }), (tc) => tc.status === 'active'));
      setSelected([]);
    },
    resumeSelected: () => {
      setTests((t) =>
        patchTests(
          t,
          selected,
          () => ({ status: 'active' }),
          (tc) => tc.status === 'paused' && (tc.envNames?.length ?? 0) > 0 && !tc.pendingMerge,
        ),
      );
      setSelected([]);
    },
    /* The base is the FIRST test you picked, and it keeps its name, settings and
       history - so the order of selection is a decision, not an accident. */
    merge: () => {
      const [base, ...rest] = selected;
      if (!base || rest.length === 0) return;
      setTests((t) => mergeTests(t, base, rest));
      setSelected([]);
      setOpenKey(base);
    },
    cancelMerge: (key: string) => setTests((t) => cancelMerge(t, key)),
  };
}

export type TestsController = ReturnType<typeof useTests>;
