/* The React binding over shared/runs-logic.ts. */

import { useMemo, useState } from 'react';
import type { RunData } from '@shared/runs-data.ts';
import type { DateRangeValue } from '@shared/date-range.ts';
import {
  DEFAULT_RUN_FILTERS,
  INITIAL_RUNS_STATE,
  NO_RUN_FILTERS,
  RUNS_PAGE_SIZE,
  activeRunFilters,
  filterRuns,
  runCounts,
  runFilterCount,
  runFilterDimensions,
  toggleRunFilter,
  type RunFilterKey,
  type RunSortKey,
  type RunTab,
  type RunsState,
} from '@shared/runs-logic.ts';

export function useRuns() {
  const [state, setState] = useState<RunsState>(INITIAL_RUNS_STATE);
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);

  /* Every "how long ago" question in this list is asked against ONE now, taken
     per render. Calling Date.now() inside the filter and again inside the
     counts is how a row ends up in a list its own tab says is empty. */
  const now = Date.now();

  const patch = (fn: (s: RunsState) => RunsState) => {
    setState(fn);
    setPage(1);
  };

  const visible = useMemo(() => filterRuns(state, now), [state, now]);
  const rows = useMemo(
    () => visible.slice((page - 1) * RUNS_PAGE_SIZE, page * RUNS_PAGE_SIZE),
    [visible, page],
  );

  return {
    state,
    rows,
    total: visible.length,
    page,
    pageSize: RUNS_PAGE_SIZE,
    paginated: visible.length > RUNS_PAGE_SIZE,
    counts: useMemo(() => runCounts(state, now), [state, now]),
    dimensions: useMemo(() => runFilterDimensions(state, now), [state, now]),
    chips: useMemo(() => activeRunFilters(state, now), [state, now]),
    filterCount: runFilterCount(state.filters),
    open: state.runs.find((r) => r.key === openKey) ?? null,
    /* "No runs at all" is not a state this list can be in once a test has run,
       so the empty list only ever has two causes: the tab, or the filters. */
    filtered: state.query !== '' || runFilterCount(state.filters) > 0,

    range: state.range,
    setRange: (range: DateRangeValue) => patch((s) => ({ ...s, range })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),
    setTab: (tab: RunTab) => patch((s) => ({ ...s, tab })),
    toggleFilter: (key: RunFilterKey, value: string) =>
      patch((s) => ({ ...s, filters: toggleRunFilter(s.filters, key, value) })),
    isFilterActive: (key: RunFilterKey, value: string) =>
      (state.filters[key] as string[]).includes(value),
    /* ⚠ Clearing does NOT touch the date window. Clear-all empties the
       questions you asked; the window is not one of them - it is the state the
       list is always in, it is printed on its own control, and resetting it
       from a button somewhere else would move rows for a reason nothing on
       screen explains. */
    clearFilters: () => patch((s) => ({ ...s, filters: NO_RUN_FILTERS, query: '' })),
    resetFilters: () => patch((s) => ({ ...s, filters: DEFAULT_RUN_FILTERS })),
    setSort: (key: RunSortKey | null, desc = false) =>
      patch((s) => ({ ...s, sort: key ? { key, desc } : null })),
    setPage,
    openRun: (run: RunData) => setOpenKey(run.key),
    closeRun: () => setOpenKey(null),
  };
}

export type RunsController = ReturnType<typeof useRuns>;
