/* The React binding over the activity domain: a list, a search, a date
 * window, two filter dimensions, and one open row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  ACTIVITY,
  INITIAL_ACTIVITY_STATE,
  type ActivityEvent,
  type ActivityFilterKey,
  type ActivityState,
  activeActivityFilters,
  activityDimensions,
  activityFilterCount,
  filterActivity,
  toggleActivityFilter,
} from '@shared/activity-data.ts';
import type { DateRangeValue } from '@shared/date-range.ts';

export function useActivity() {
  const [events] = useState<ActivityEvent[]>(() => [...ACTIVITY]);
  const [state, setState] = useState<ActivityState>(INITIAL_ACTIVITY_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const now = Date.now();
  const patch = useCallback((fn: (s: ActivityState) => ActivityState) => setState(fn), []);

  const visible = useMemo(() => filterActivity(events, state, now), [events, state, now]);
  const dimensions = useMemo(() => activityDimensions(events, state, now), [events, state, now]);
  const chips = useMemo(() => activeActivityFilters(events, state, now), [events, state, now]);
  const open = events.find((e) => e.id === openId) ?? null;

  return {
    events,
    visible,
    dimensions,
    chips,
    open,
    total: events.length,
    query: state.query,
    range: state.range,
    filterCount: activityFilterCount(state.filters),

    setQuery: (query: string) => patch((s) => ({ ...s, query })),
    setRange: (range: DateRangeValue) => patch((s) => ({ ...s, range })),
    toggleFilter: (key: ActivityFilterKey, value: string) =>
      patch((s) => ({ ...s, filters: toggleActivityFilter(s.filters, key, value) })),
    isFilterActive: (key: ActivityFilterKey, value: string) => state.filters[key].includes(value),
    clearFilters: () => patch((s) => ({ ...s, filters: { events: [], environments: [] }, query: '' })),

    openEvent: (id: number) => setOpenId(id),
    closeEvent: () => setOpenId(null),
  };
}

export type ActivityController = ReturnType<typeof useActivity>;
