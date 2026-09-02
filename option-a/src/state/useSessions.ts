/* The React binding over shared/sessions-logic.ts. Same shape and the same
 * thinness as useIssues and useTests: it holds state and every question about
 * what the list contains, what a row means or what a sentence translates to
 * goes to the pure layer.
 *
 * One thing worth naming, because it is the whole point of the redesign: there
 * is ONE `filters` array here, not one for events and one for properties. That
 * is the production store's own shape (`searchStore.instance.filters`, each
 * item carrying `isEvent`), so the unified search is the data model drawn
 * straight rather than a new one. Every mutation below maps to a method that
 * already exists: addFilter, updateFilter, removeFilter, edit, clearSearch. */

import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_DISPLAY,
  INITIAL_SESSIONS_STATE,
  PAGE_SIZE,
  SESSIONS,
  displayCount,
  emptyReason,
  filterSessions,
  incompleteCount,
  issueTypeCount,
  makeFilter,
  pageOf,
  splitFilters,
  toggleSessionField,
  translate,
  type CatalogueEntry,
  type DateRange,
  type EventsOrder,
  type IssueType,
  type SearchFilter,
  type SessionDisplay,
  type SessionField,
  type SessionRow,
  type SessionTab,
  type SessionsState,
} from '@shared/sessions-logic.ts';

export function useSessions() {
  const [state, setState] = useState<SessionsState>(INITIAL_SESSIONS_STATE);

  const patch = useCallback(
    (p: Partial<SessionsState>) =>
      /* Any change to what the list contains sends you back to page 1. A
         narrower search that left you on page 7 of 2 is the oldest bug in every
         table that ever shipped. */
      setState((s) => ({ ...s, ...p, page: 'page' in p ? (p.page as number) : 1 })),
    [],
  );

  /* ── the search: one array, four verbs ── */

  const addFilter = useCallback((entry: CatalogueEntry) => {
    setState((s) => {
      const f = makeFilter(entry);
      /* Events keep their sequence and properties follow them, so a new event
         lands after the last event rather than at the end of everything. The
         array stays ONE array; only the insertion point knows about kind. */
      const at = f.isEvent ? s.filters.filter((x) => x.isEvent).length : s.filters.length;
      const next = [...s.filters];
      next.splice(at, 0, f);
      return { ...s, filters: next, page: 1 };
    });
  }, []);

  const addFilters = useCallback((rows: SearchFilter[]) => {
    setState((s) => {
      const events = [...s.filters.filter((f) => f.isEvent), ...rows.filter((f) => f.isEvent)];
      const props = [...s.filters.filter((f) => !f.isEvent), ...rows.filter((f) => !f.isEvent)];
      return { ...s, filters: [...events, ...props], page: 1 };
    });
  }, []);

  const updateFilter = useCallback((key: string, p: Partial<SearchFilter>) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) => (f.key === key ? { ...f, ...p } : f)),
      page: 1,
    }));
  }, []);

  /** Replace a row's subject in place, keeping its position. This is the
   *  production "click the name button and pick another" path, and it has to
   *  keep the row where it is: re-picking the second of three events must not
   *  send it to the bottom. */
  const replaceFilter = useCallback((key: string, entry: CatalogueEntry) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) => (f.key === key ? { ...makeFilter(entry), key: f.key } : f)),
      page: 1,
    }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setState((s) => ({ ...s, filters: s.filters.filter((f) => f.key !== key), page: 1 }));
  }, []);

  /** Drag-to-reorder, over the EVENTS only. Both indices are event indices;
   *  this maps them back into the one array so the properties never move. */
  const moveEvent = useCallback((from: number, to: number) => {
    setState((s) => {
      const events = s.filters.filter((f) => f.isEvent);
      if (from === to || from < 0 || to < 0 || from >= events.length || to >= events.length) return s;
      const reordered = [...events];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved!);
      return { ...s, filters: [...reordered, ...s.filters.filter((f) => !f.isEvent)], page: 1 };
    });
  }, []);

  /* ── an event's own properties ── */

  const addProperty = useCallback((eventKey: string, entry: CatalogueEntry) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.key === eventKey ? { ...f, properties: [...(f.properties ?? []), makeFilter(entry)] } : f,
      ),
      page: 1,
    }));
  }, []);

  const updateProperty = useCallback((eventKey: string, propKey: string, p: Partial<SearchFilter>) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.key === eventKey
          ? { ...f, properties: (f.properties ?? []).map((x) => (x.key === propKey ? { ...x, ...p } : x)) }
          : f,
      ),
      page: 1,
    }));
  }, []);

  const removeProperty = useCallback((eventKey: string, propKey: string) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.key === eventKey ? { ...f, properties: (f.properties ?? []).filter((x) => x.key !== propKey) } : f,
      ),
      page: 1,
    }));
  }, []);

  /** The word between an event's properties. One value per event, as in
   *  production, and clicking it is the only way to change it. */
  const togglePropertyOrder = useCallback((eventKey: string) => {
    setState((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.key === eventKey ? { ...f, propertyOrder: f.propertyOrder === 'or' ? 'and' : 'or' } : f,
      ),
      page: 1,
    }));
  }, []);

  /* ── everything else on the search instance ── */

  const setEventsOrder = useCallback((o: EventsOrder) => patch({ eventsOrder: o }), [patch]);
  const setRange = useCallback((r: DateRange) => patch({ range: r }), [patch]);
  const setTab = useCallback((t: SessionTab) => patch({ tab: t }), [patch]);
  const setPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), []);

  const toggleIssueType = useCallback(
    (t: IssueType | 'all') =>
      patch({
        issueTypes:
          t === 'all'
            ? []
            : state.issueTypes.includes(t)
              ? state.issueTypes.filter((x) => x !== t)
              : [...state.issueTypes, t],
      }),
    [patch, state.issueTypes],
  );

  const clearSearch = useCallback(
    () => patch({ filters: [], issueTypes: [], savedSegmentId: undefined }),
    [patch],
  );

  const setDisplay = useCallback(
    <K extends keyof SessionDisplay>(key: K, value: SessionDisplay[K]) =>
      patch({ display: { ...state.display, [key]: value } }),
    [patch, state.display],
  );

  const toggleField = useCallback(
    (f: SessionField) => patch({ display: toggleSessionField(state.display, f) }),
    [patch, state.display],
  );

  const resetDisplay = useCallback(() => patch({ display: DEFAULT_DISPLAY }), [patch]);

  const setDataState = useCallback(
    (d: SessionsState['dataState']) => patch({ dataState: d }),
    [patch],
  );

  /** Load a saved segment. In production this fetches the segment's filters;
   *  here it puts the segment in as the one event it is, which is exactly what
   *  `processFilterResponse` does with a segment. */
  const loadSegment = useCallback(
    (entry: CatalogueEntry) =>
      setState((s) => ({
        ...s,
        filters: [makeFilter(entry)],
        savedSegmentId: entry.id,
        page: 1,
      })),
    [],
  );

  /* ── what the list is ── */

  const all: readonly SessionRow[] = state.dataState === 'empty' ? [] : SESSIONS;
  const matched = useMemo(() => filterSessions(state, all), [state, all]);
  const rows = useMemo(() => pageOf(matched, state.page), [matched, state.page]);
  const { events, properties } = useMemo(() => splitFilters(state.filters), [state.filters]);

  return {
    state,
    /* the search */
    filters: state.filters,
    events,
    properties,
    eventsOrder: state.eventsOrder,
    addFilter,
    addFilters,
    updateFilter,
    replaceFilter,
    removeFilter,
    moveEvent,
    addProperty,
    updateProperty,
    removeProperty,
    togglePropertyOrder,
    setEventsOrder,
    clearSearch,
    loadSegment,
    incomplete: incompleteCount(state),
    /* the list */
    rows,
    total: matched.length,
    pageSize: PAGE_SIZE,
    page: state.page,
    setPage,
    emptyReason: emptyReason(state, matched.length),
    /* the header */
    tab: state.tab,
    setTab,
    range: state.range,
    setRange,
    issueTypes: state.issueTypes,
    toggleIssueType,
    issueTypeCount: useCallback((t: IssueType) => issueTypeCount(all, t), [all]),
    /* display */
    display: state.display,
    setDisplay,
    toggleField,
    resetDisplay,
    displayChangeCount: displayCount(state.display),
    /* the prototype's own switch, as on Issues */
    dataState: state.dataState,
    setDataState,
    /* natural language */
    translate,
  };
}
