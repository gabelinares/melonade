/* The React binding over the events domain: a list, a filter (all /
 * autocaptured / custom), a search, and one open row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  EVENTS,
  INITIAL_EVENTS_STATE,
  type DistinctEvent,
  type EventFilter,
  type EventsState,
  eventFilterCounts,
  filterEvents,
} from '@shared/events-data.ts';

export function useEvents() {
  const [events] = useState<DistinctEvent[]>(() => [...EVENTS]);
  const [state, setState] = useState<EventsState>(INITIAL_EVENTS_STATE);
  const [openName, setOpenName] = useState<string | null>(null);

  const patch = useCallback((fn: (s: EventsState) => EventsState) => setState(fn), []);

  const visible = useMemo(() => filterEvents(events, state), [events, state]);
  const filterCounts = useMemo(() => eventFilterCounts(events, state.query), [events, state.query]);
  const open = events.find((e) => e.name === openName) ?? null;

  return {
    events,
    visible,
    filterCounts,
    open,
    total: events.length,
    filter: state.filter,
    query: state.query,

    setFilter: (filter: EventFilter) => patch((s) => ({ ...s, filter })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openEvent: (name: string) => setOpenName(name),
    closeEvent: () => setOpenName(null),
  };
}

export type EventsController = ReturnType<typeof useEvents>;
