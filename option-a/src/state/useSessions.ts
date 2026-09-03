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

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRangeValue } from '@shared/date-range.ts';
import {
  DEFAULT_DISPLAY,
  INITIAL_SESSIONS_STATE,
  PAGE_SIZE,
  SAVED_SEGMENTS,
  SESSIONS,
  displayCount,
  emptyReason,
  filterSessions,
  incompleteCount,
  addManyToRules,
  addPropertyInRules,
  addToRules,
  makeFilter,
  moveEventInRules,
  pageOf,
  setLiveSegments,
  removeFromRules,
  removePropertyInRules,
  replaceInRules,
  togglePropertyOrderInRules,
  updateInRules,
  updatePropertyInRules,
  splitFilters,
  toggleSessionField,
  translate,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionDisplay,
  type SessionField,
  type SavedSegment,
  type SessionRow,
  type SessionTab,
  type SessionTag,
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

  /* ── THE SEARCH: ONE ARRAY, AND THE VERBS ARE NOT HERE ──────────────────
     Every one of these was a `setState` updater written out longhand until
     2026-09-02. They are `SearchFilter[] -> SearchFilter[]` transforms in the
     shared layer now, and this file binds them to `state.filters` - because
     THE SEGMENT DRAWER BINDS THE SAME ONES to a draft (see useFilterDraft). A
     segment is one saved search, so there is one set of verbs for editing a
     search and two places you can be standing while you use them. */

  const onRules = useCallback(
    (fn: (rules: readonly SearchFilter[]) => SearchFilter[]) =>
      setState((s) => ({ ...s, filters: fn(s.filters), page: 1 })),
    [],
  );

  const addFilter = useCallback((entry: CatalogueEntry) => onRules((r) => addToRules(r, entry)), [onRules]);
  const addFilters = useCallback((rows: SearchFilter[]) => onRules((r) => addManyToRules(r, rows)), [onRules]);
  const updateFilter = useCallback(
    (key: string, p: Partial<SearchFilter>) => onRules((r) => updateInRules(r, key, p)),
    [onRules],
  );
  const replaceFilter = useCallback(
    (key: string, entry: CatalogueEntry) => onRules((r) => replaceInRules(r, key, entry)),
    [onRules],
  );
  const removeFilter = useCallback((key: string) => onRules((r) => removeFromRules(r, key)), [onRules]);
  const moveEvent = useCallback(
    (from: number, to: number) => onRules((r) => moveEventInRules(r, from, to)),
    [onRules],
  );
  const addProperty = useCallback(
    (eventKey: string, entry: CatalogueEntry) => onRules((r) => addPropertyInRules(r, eventKey, entry)),
    [onRules],
  );
  const updateProperty = useCallback(
    (eventKey: string, propKey: string, p: Partial<SearchFilter>) =>
      onRules((r) => updatePropertyInRules(r, eventKey, propKey, p)),
    [onRules],
  );
  const removeProperty = useCallback(
    (eventKey: string, propKey: string) => onRules((r) => removePropertyInRules(r, eventKey, propKey)),
    [onRules],
  );
  const togglePropertyOrder = useCallback(
    (eventKey: string) => onRules((r) => togglePropertyOrderInRules(r, eventKey)),
    [onRules],
  );

  /* ── everything else on the search instance ── */

  const setEventsOrder = useCallback((o: EventsOrder) => patch({ eventsOrder: o }), [patch]);
  const setRange = useCallback((r: DateRangeValue) => patch({ range: r }), [patch]);
  const setTab = useCallback((t: SessionTab) => patch({ tab: t }), [patch]);
  /** The issue-type strip. Single-select, and clicking the one that is already
   *  on returns to All - production's `toggleTag`, and the same behaviour the
   *  Issues page's category strip has. */
  const setTag = useCallback(
    (t: SessionTag) => patch({ tag: t === state.tag ? 'all' : t }),
    [patch, state.tag],
  );
  const setPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), []);

  const clearSearch = useCallback(
    () => patch({ filters: [], savedSegmentId: undefined }),
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

  /* ── SEGMENTS ────────────────────────────────────────────────────────────
     A saved search, and now a section of this page rather than a dropdown at
     the top of it (Mehdi, 2026-09-02). The list is state because it is edited:
     a segment is created from the live search, renamed, re-ruled and deleted,
     and none of that is a fixture read.

     ⚠ `openId` is a SEGMENT ID or the sentinel 'new'. Not a boolean plus an id:
     two pieces of state that have to agree is how a drawer ends up open with
     nothing in it. */
  const [segments, setSegments] = useState<SavedSegment[]>(() => SAVED_SEGMENTS.map((x) => ({ ...x })));
  const [openId, setOpenId] = useState<string | null>(null);

  /* ⚠ THE EVALUATOR AND THE CATALOGUE READ THIS LIST, and neither is reachable
     from React. A search can filter BY a segment and the picker offers segments
     as entries, so both have to see a segment that was just created, renamed or
     re-ruled. See `setLiveSegments`: the alternative was threading the list
     through five call signatures so a leaf could look up a name. */
  useEffect(() => setLiveSegments(segments), [segments]);

  const openSegment = useCallback((id: string) => setOpenId(id), []);
  const closeSegment = useCallback(() => setOpenId(null), []);

  /** A new segment starts from WHAT IS ON SCREEN, not from nothing. The button
   *  that opens it sits under a search you have just built, and an empty drawer
   *  there would throw that away and ask you to type it again. */
  const newSegment = useCallback(() => setOpenId('new'), []);

  const saveSegment = useCallback((seg: SavedSegment) => {
    setSegments((all) => {
      const i = all.findIndex((x) => x.id === seg.id);
      const next = { ...seg, updatedAt: Date.now() };
      return i < 0 ? [next, ...all] : all.map((x) => (x.id === seg.id ? next : x));
    });
    setOpenId(null);
  }, []);

  const deleteSegment = useCallback((id: string) => {
    setSegments((all) => all.filter((x) => x.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  /** ⚠ APPLYING A SEGMENT LOADS ITS RULES, not a row that says its name.
   *
   *  Production inserts the segment as one opaque event, which is what
   *  `loadSegment` below still does and what the picker still offers - that is
   *  how you COMPOSE with a segment, and it is a real thing to want.
   *
   *  This is the other verb, and the tab's own: you are opening the saved
   *  search, so what lands in the field is the search. It is editable, you can
   *  see why the list looks the way it does, and the rows are the same rows the
   *  drawer just showed you. */
  const applySegment = useCallback((id: string) => {
    setSegments((all) => {
      const seg = all.find((x) => x.id === id);
      if (seg) {
        setState((st) => ({
          ...st,
          tab: 'all',
          filters: seg.filters.map((f) => ({ ...f })),
          eventsOrder: seg.eventsOrder,
          savedSegmentId: seg.id,
          page: 1,
        }));
      }
      return all;
    });
    setOpenId(null);
  }, []);

  /* ── what the list is ── */

  /* ⚠ BOOKMARKING IS A REAL EDIT, so it is state rather than a fixture flag.
     The row's bookmark went from a mark that reported `favorite` to a control
     that sets it (Mehdi, 2026-09-02), and a control whose click changes nothing
     is worse than no control. It is an overlay keyed by session id rather than
     a copy of the list: the fixture stays the fixture, and "what did I change"
     is one object you can read. */
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  const toggleBookmark = useCallback(
    (sessionId: string) =>
      setBookmarks((b) => ({ ...b, [sessionId]: !(b[sessionId] ?? SESSIONS.find((s) => s.sessionId === sessionId)?.favorite ?? false) })),
    [],
  );

  const all: readonly SessionRow[] = useMemo(() => {
    if (state.dataState === 'empty') return [];
    if (Object.keys(bookmarks).length === 0) return SESSIONS;
    return SESSIONS.map((s) => (s.sessionId in bookmarks ? { ...s, favorite: bookmarks[s.sessionId]! } : s));
  }, [state.dataState, bookmarks]);
  const matched = useMemo(() => filterSessions(state, all), [state, all]);

  /* ⚠ WHAT THE STRIP COUNTS AGAINST: the search, the window and the tab
     applied, and the strip's OWN choice released. The same `without(key)`
     arithmetic every filter menu in this app uses, and the reason is the same -
     a tab has to report how many rows IT would leave, not how many are left
     after it already narrowed. Counted with the tag applied, every tab but the
     current one would read zero. */
  const inScope = useMemo(
    () => filterSessions({ ...state, tag: 'all' }, all),
    [state, all],
  );

  /* ⚠ EVERY SESSION IN THE WINDOW, with no filter and no tab applied. It is
     what a SEGMENT is counted against - a segment is its own search, so
     counting one inside another search would answer a question nobody asked -
     and it is what the drawer's value pickers offer their shares from. */
  const inWindow = useMemo(
    () =>
      filterSessions(
        { ...INITIAL_SESSIONS_STATE, range: state.range, dataState: state.dataState },
        all,
      ),
    [state.range, state.dataState, all],
  );
  const rows = useMemo(() => pageOf(matched, state.page), [matched, state.page]);
  const { events, properties } = useMemo(() => splitFilters(state.filters), [state.filters]);

  const openSegmentValue =
    openId === 'new' ? null : (segments.find((x) => x.id === openId) ?? null);

  return {
    state,
    toggleBookmark,
    /* segments */
    segments,
    openSegmentId: openId,
    openSegment: openSegmentValue,
    openSegmentBy: openSegment,
    closeSegment,
    newSegment,
    saveSegment,
    deleteSegment,
    applySegment,
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
    /* Everything the search left, not just this page of it: the value picker's
       counts are computed against this, so they answer "how many would this
       leave me" rather than "how many are on screen". */
    matched,
    inScope,
    inWindow,
    total: matched.length,
    pageSize: PAGE_SIZE,
    page: state.page,
    setPage,
    emptyReason: emptyReason(state, matched.length),
    /* the header */
    tab: state.tab,
    setTab,
    tag: state.tag,
    setTag,
    range: state.range,
    setRange,
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
