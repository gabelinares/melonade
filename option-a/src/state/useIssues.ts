/* The React binding over shared/issues-logic.ts. Deliberately thin: it holds
 * state and delegates every question to the pure layer, so the two options
 * cannot drift in behaviour. Everything derived is a useMemo over one state
 * object, which means a filter change recomputes exactly once. */

import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_ACTIVE_SEGMENTS,
  INITIAL_STATE,
  PAGE_SIZE,
  activeFilterCount,
  activeFilters,
  categoryCount,
  clearFilterKey,
  counts,
  criticalState,
  displayChangeCount,
  emptyReason,
  filterDimensions,
  filterIssues,
  groupIssues,
  NO_SESSION_FILTERS,
  TOP_SESSIONS,
  isFilterValueActive,
  matchedRules,
  sessionPool,
  shortlistSessions,
  toggleSessionFilter,
  titleOf,
  toggleField,
  toggleFilterValue,
  type CaptureMode,
  type CategoryName,
  type Display,
  type FieldKey,
  type FilterKey,
  type Filters,
  type Issue,
  type IssuesState,
  type SessionFilterKey,
  type SessionFilters,
} from '@shared/issues-logic.ts';
import { ISSUES } from '@shared/issues-data.ts';

/** The issues you have not opened yet, seeded: the three most recently seen.
 *  Derived rather than listed, so it survives the fixtures changing under it. */
const NEW_ISSUE_IDS: ReadonlySet<number> = new Set(
  [...ISSUES].sort((a, b) => a.seenAgoMin - b.seenAgoMin).slice(0, 3).map((i) => i.id),
);

/**
 * The side panels the work pane can open on the right, one at a time.
 *
 * A union rather than a boolean per panel, because they share one column: two
 * booleans would let both be true and there is nowhere to put the second one.
 */
/* Two TABS in the one side panel, and the panel belongs to the SESSION REPLAY:
   'journey' is what the person did, 'details' is the write-up read beside the
   recording. Neither exists at the issue depth, where the write-up is the
   document on the page. */
export type SidePanel = 'journey' | 'details';

export function useIssues() {
  const [state, setState] = useState<IssuesState>(INITIAL_STATE);
  const [page, setPage] = useState(1);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('segments');
  const [activeSegmentIds, setActiveSegmentIds] = useState<number[]>(DEFAULT_ACTIVE_SEGMENTS);

  /* ── the flow ─────────────────────────────────────────────────────────────
     Graphite's list is a paginated table and stays one, because that table is
     the thing this option is liked for. What it did not have was anywhere to
     GO: the write-up was an expanding row and there was no replay at all.

     So the detail is a screen you enter, and from here down the state is the
     same state option B's flow runs on, reading the same pure layer. DEPTH IS
     DERIVED, never stored: one fact - has a session been opened - decides
     whether this is the write-up or a recording. A screen that says it is
     watching with nothing to watch cannot be represented. */
  /* ── WHAT YOU HAVE NOT LOOKED AT YET ──────────────────────────────────────
     The menu's dot says an agent has found something; this is the same fact one
     level down - which of the things it found are new to you. Seeded from the
     three most recently seen issues, because "newest arrivals you have not
     opened" is what anybody means by new here, and cleared the moment you open
     one. It is deliberately session-only: a prototype that remembered would
     show a reviewer an empty list of new issues on their second visit. */
  const [openedIds, setOpenedIds] = useState<ReadonlySet<number>>(
    () => new Set(ISSUES.map((i) => i.id).filter((id) => !NEW_ISSUE_IDS.has(id))),
  );

  const [openId, setOpenId] = useState<number | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel | null>('journey');
  const [visibleSessions, setVisibleSessions] = useState(TOP_SESSIONS);
  const [autoplay, setAutoplay] = useState(false);
  const [sessionFilters, setSessionFilters] = useState<SessionFilters>(NO_SESSION_FILTERS);
  const [sessionQuery, setSessionQuery] = useState('');
  const [tasks, setTasks] = useState<Record<number, string>>({});

  const patch = useCallback((fn: (s: IssuesState) => IssuesState) => setState(fn), []);

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      patch((s) => ({ ...s, filters: { ...s.filters, [key]: value } }));
      setPage(1);
    },
    [patch],
  );

  /* Every filter write goes through the shared toggler, which owns the
     string-to-value conversion for segment ids and the replace-vs-accumulate
     rule for single-select dimensions. No component knows either. */
  const toggleValue = useCallback(
    (key: FilterKey, value: string) => {
      patch((s) => ({ ...s, filters: toggleFilterValue(s.filters, key, value) }));
      setPage(1);
    },
    [patch],
  );

  const clearDimension = useCallback(
    (key: FilterKey) => {
      patch((s) => ({ ...s, filters: clearFilterKey(s.filters, key) }));
      setPage(1);
    },
    [patch],
  );

  const setDisplay = useCallback(
    <K extends keyof Display>(key: K, value: Display[K]) => {
      patch((s) => ({ ...s, display: { ...s.display, [key]: value } }));
      setPage(1);
    },
    [patch],
  );

  const filtered = useMemo(() => filterIssues(state), [state]);

  /* Grouping turns pagination OFF.
   *
   * The two do not mix. Grouping within a page makes every band count a
   * half-truth: with ten rows shown out of eleven, the "Low impact" header read
   * "2" while three existed, which is accurate about the page and wrong about the
   * question the reader is asking. Grouping across pages is worse, because a band
   * would start on page one and finish on page two.
   *
   * So the group choice decides: no grouping keeps the ten-row page, and any
   * grouping shows the whole set and lets the bands be true. */
  const paginated = state.display.group === 'none';
  const pageCount = paginated ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, pageCount);
  const visible = useMemo(
    () =>
      paginated
        ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
        : filtered,
    [filtered, safePage, paginated],
  );

  const groups = useMemo(() => groupIssues(state, visible), [state, visible]);

  const opened = useMemo(
    () => (openId == null ? null : (filtered.find((i) => i.id === openId) ?? null)),
    [openId, filtered],
  );

  /* EVERY session on this issue, not just the hand-written ones. Memoised per
     issue in the shared layer, so the identity comparisons below are stable. */
  const sessions = useMemo(() => (opened ? sessionPool(opened) : []), [opened]);

  const openSession = useMemo(
    () => (openIndex != null ? (sessions[openIndex] ?? null) : null),
    [openIndex, sessions],
  );

  const shortlist = useMemo(
    () => shortlistSessions(sessions, sessionFilters, sessionQuery),
    [sessions, sessionFilters, sessionQuery],
  );

  const openIssue = useCallback((id: number | null) => {
    /* opening IS reading it: there is no second gesture to mark it seen, and a
       "mark as read" control on a row nobody asked for is a control nobody
       uses. */
    if (id != null) setOpenedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setOpenId(id);
    setOpenIndex(null);
    setPeek(false);
    setVisibleSessions(TOP_SESSIONS);
    setSessionFilters(NO_SESSION_FILTERS);
    setSessionQuery('');
  }, []);

  const openSessionAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= sessions.length) return;
      setOpenIndex(index);
      setPeek(false);
    },
    [sessions],
  );

  /** Step within what is DRAWN, not within what exists. Stepping to a session
   *  that is not on the strip would light no chip and read as a broken
   *  control; "show more" is how you reach further. */
  const stepSession = useCallback(
    (delta: number) => {
      const reachable = shortlist.slice(0, visibleSessions);
      if (reachable.length === 0) return;
      const current = openIndex != null ? sessions[openIndex] : undefined;
      const at = current ? reachable.indexOf(current) : -1;
      const next = reachable[Math.min(reachable.length - 1, Math.max(0, at + delta))];
      if (next) setOpenIndex(sessions.indexOf(next));
    },
    [sessions, shortlist, visibleSessions, openIndex],
  );

  /** One step back up the flow, which is what Esc means everywhere here. */
  const stepOut = useCallback(() => {
    if (peek) return setPeek(false);
    if (openIndex != null && sidePanel == null) return setSidePanel('journey');
    if (openIndex != null) return setOpenIndex(null);
    if (openId != null) return openIssue(null);
  }, [peek, openIndex, sidePanel, openId, openIssue]);

  return {
    /* ── the flow ── */
    opened,
    openIssue,
    sessions,
    shortlist,
    openIndex: openSession ? openIndex : null,
    openSession,
    openSessionAt,
    stepSession,
    closeSession: useCallback(() => { setOpenIndex(null); setPeek(false); }, []),
    stepOut,
    depth: (openSession ? 'watch' : 'triage') as 'triage' | 'watch',
    peek,
    togglePeek: useCallback(() => setPeek((p) => !p), []),
    sidePanel: openSession ? sidePanel : null,
    setSidePanel,
    toggleSidePanel: useCallback(
      (panel: SidePanel) => setSidePanel((open) => (open === panel ? null : panel)),
      [],
    ),
    visibleSessions,
    showMoreSessions: useCallback(() => setVisibleSessions((v) => v + TOP_SESSIONS), []),
    autoplay,
    toggleAutoplay: useCallback(() => setAutoplay((a) => !a), []),
    sessionFilters,
    sessionQuery,
    setSessionQuery,
    toggleSessionFilter: useCallback(
      (key: SessionFilterKey, value: string) =>
        setSessionFilters((f) => toggleSessionFilter(f, key, value)),
      [],
    ),
    clearSessionFilters: useCallback(() => {
      setSessionFilters(NO_SESSION_FILTERS);
      setSessionQuery('');
    }, []),

    /* The key of the task filed for an issue, derived from the id rather than
       generated: a random one would change on every render. */
    taskKey: useCallback((id: number) => tasks[id], [tasks]),
    createTask: useCallback(
      (id: number) => setTasks((t) => ({ ...t, [id]: `ACME-${100 + (id % 900)}` })),
      [],
    ),

    state,
    filters: state.filters,
    display: state.display,
    dataState: state.dataState,
    rules: state.rules,

    filtered,
    visible,
    groups,
    total: filtered.length,
    page: safePage,
    pageSize: PAGE_SIZE,
    pageCount,
    paginated,
    setPage,

    /* the filter menu's contents, counts included */
    dimensions: useMemo(() => filterDimensions(state), [state]),
    activeFilters: useMemo(() => activeFilters(state), [state]),
    isFilterActive: useCallback(
      (key: FilterKey, value: string) => isFilterValueActive(state.filters, key, value),
      [state.filters],
    ),
    toggleValue,
    clearDimension,

    counts: useMemo(() => counts(state), [state]),
    activeFilterCount: activeFilterCount(state.filters),
    displayChangeCount: displayChangeCount(state.display, INITIAL_STATE.display),
    emptyReason: useMemo(() => emptyReason(state), [state]),
    categoryCount: useCallback((c: CategoryName) => categoryCount(state, c), [state]),
    criticalState: useCallback((id: number) => criticalState(state, id), [state]),
    matchedRules: useCallback((id: number) => matchedRules(state, id), [state]),
    titleOf: useCallback((i: Issue) => titleOf(state, i), [state]),
    isHidden: useCallback((id: number) => state.hidden[id] != null, [state]),
    isNew: useCallback((id: number) => !openedIds.has(id), [openedIds]),
    hiddenReason: useCallback((id: number) => state.hidden[id], [state]),
    hasField: useCallback((f: FieldKey) => state.display.fields.includes(f), [state.display]),

    setFilter,
    setDisplay,
    toggleField: useCallback(
      (f: FieldKey) => patch((s) => ({ ...s, display: toggleField(s.display, f) })),
      [patch],
    ),
    clearFilters: () => {
      patch((s) => ({ ...s, filters: INITIAL_STATE.filters }));
      setPage(1);
    },
    resetDisplay: () => patch((s) => ({ ...s, display: INITIAL_STATE.display })),

    hide: (id: number, note: string, reasons: string[]) =>
      patch((s) => ({
        ...s,
        hidden: { ...s.hidden, [id]: [...reasons, note].filter(Boolean).join(' · ') },
      })),
    unhide: (id: number) =>
      patch((s) => {
        const hidden = { ...s.hidden };
        delete hidden[id];
        return { ...s, hidden };
      }),
    rename: (id: number, title: string) =>
      patch((s) => ({ ...s, renamed: { ...s.renamed, [id]: title } })),
    dropCritical: (id: number) =>
      patch((s) => ({ ...s, dropped: { ...s.dropped, [id]: true } })),
    restoreCritical: (id: number) =>
      patch((s) => {
        const dropped = { ...s.dropped };
        delete dropped[id];
        return { ...s, dropped };
      }),
    addRule: (description: string) =>
      patch((s) => ({
        ...s,
        rules: [
          ...s.rules,
          {
            id: Math.max(0, ...s.rules.map((r) => r.id)) + 1,
            description,
            createdBy: 'Gabriel L.',
            mine: true,
          },
        ],
      })),
    removeRule: (id: number) =>
      patch((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),

    setDataState: (dataState: IssuesState['dataState']) => patch((s) => ({ ...s, dataState })),

    captureMode,
    setCaptureMode,
    activeSegmentIds,
    toggleSegment: (id: number) =>
      setActiveSegmentIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id])),
  };
}

export type IssuesController = ReturnType<typeof useIssues>;
