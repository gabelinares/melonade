/* The React binding over shared/issues-logic.ts. Deliberately thin: it holds
 * state and delegates every question to the pure layer, so the two options
 * cannot drift in behaviour. */

import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_ACTIVE_SEGMENTS,
  INITIAL_STATE,
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
  type SessionFilters,
  type FilterKey,
  type Filters,
  type Issue,
  type IssuesState,
} from '@shared/issues-logic.ts';

/* This option groups by impact out of the box, because its list is a triage
 * queue with sticky band headers rather than a sortable table. The denser option
 * defaults to no grouping. Same shared shape, different starting point. */
const B_INITIAL: IssuesState = {
  ...INITIAL_STATE,
  display: { ...INITIAL_STATE.display, group: 'impact', fields: ['impact', 'category', 'origin', 'lastSeen'] },
};

/**
 * The side panels the work pane can open on the right, one at a time.
 *
 * A union rather than a boolean per panel, because they share one column: two
 * booleans would let both be true and there is nowhere to put the second one.
 * Adding a panel is adding a value here, a glyph to the header's panel group,
 * and a branch in WorkPane. Nothing about the layout has to move.
 */
export type SidePanel = 'journey';

export function useIssues() {
  const [state, setState] = useState<IssuesState>(B_INITIAL);
  /* No pagination. The list column scrolls, so "page 2" is a page-shaped idea
     that does not apply to a triage pane, and paging would break the one thing
     this layout buys: never losing the queue. Selection takes its place. */
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* ── depth ────────────────────────────────────────────────────────────────
     The flow is list -> write-up -> replay, and DEPTH IS DERIVED, not stored.
     There is exactly one fact behind it: has a session been opened. Everything
     the layout does - the queue leaving, the write-up collapsing to its header,
     the player appearing - reads off that one boolean.

     Storing a `depth` string instead would create a second source of truth and
     with it the classic prototype bug: a screen that says it is watching with
     nothing to watch. Here that state cannot be represented. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);

  /* WHICH SIDE PANEL IS OPEN, and null for none.
     This replaced a `theater` boolean. Once the queue stopped being rendered at
     watch depth, "full width" had exactly one remaining effect - hiding the
     journey - which made it the same control as the panel toggle in the header
     wearing a different name. One of them had to go, and a named panel is the
     one that survives a second panel being added. */
  const [sidePanel, setSidePanel] = useState<SidePanel | null>('journey');

  /* HOW THIS ISSUE'S SESSIONS ARE NARROWED, for the band under the write-up.
     It lives here rather than inside the band for one reason: the band is not
     the only thing that walks the shortlist. J and K walk it too, from the
     keyboard handler in the shell, and two places deriving "the three sessions
     you can hop between" from two different filter states is how the chip that
     is highlighted stops being the chip that is playing. One definition, read
     by both. Cleared whenever the selection moves - see `select`. */
  const [sessionFilters, setSessionFilters] = useState<SessionFilters>(NO_SESSION_FILTERS);
  const [sessionQuery, setSessionQuery] = useState('');

  /* HOW MANY OF THE SHORTLIST ARE ON THE STRIP. It opens at three, which is the
     band's cap, and "show more" adds three. Held here rather than in the strip
     because it decides what J and K can reach, and a keyboard that walks past
     the end of what is drawn is worse than a keyboard that stops. */
  const [visibleSessions, setVisibleSessions] = useState(TOP_SESSIONS);

  /* Whether finishing a recording rolls into the next one. A mode, so it
     survives moving between sessions and between issues: somebody who asked to
     be played through did not ask once per recording. */
  const [autoplay, setAutoplay] = useState(false);

  /* WHETHER THE QUEUE IS ON SCREEN AT TRIAGE. It already leaves on its own once
     a recording opens - see the note in AppShell - and this is the other half:
     a reader who has picked their issue and wants the whole pane for it can put
     the queue away without going a depth deeper. The control is in the pane
     header, on the left, mirroring the side-panel toggles on the right. */
  const [queueOpen, setQueueOpen] = useState(true);

  /* Which issues have been pushed to the tracker, and under what key. Keyed by
     issue rather than global, because "create a task" is an action ON an issue
     and the answer to "did I already file this" has to survive walking away and
     coming back. The key is DERIVED from the id, not generated: a random one
     would change on every render and make the screen unscreenshotable. */
  const [tasks, setTasks] = useState<Record<number, string>>({});

  const [captureMode, setCaptureMode] = useState<CaptureMode>('segments');
  const [activeSegmentIds, setActiveSegmentIds] = useState<number[]>(DEFAULT_ACTIVE_SEGMENTS);

  const patch = useCallback((fn: (s: IssuesState) => IssuesState) => setState(fn), []);

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      patch((s) => ({ ...s, filters: { ...s.filters, [key]: value } }));
    },
    [patch],
  );

  /* Every filter write goes through the shared toggler, which owns the
     string-to-value conversion for segment ids and the replace-vs-accumulate
     rule for single-select dimensions. */
  const toggleValue = useCallback(
    (key: FilterKey, value: string) =>
      patch((s) => ({ ...s, filters: toggleFilterValue(s.filters, key, value) })),
    [patch],
  );

  const setDisplay = useCallback(
    <K extends keyof Display>(key: K, value: Display[K]) =>
      patch((s) => ({ ...s, display: { ...s.display, [key]: value } })),
    [patch],
  );

  const filtered = useMemo(() => filterIssues(state), [state]);
  const groups = useMemo(() => groupIssues(state, filtered), [state, filtered]);

  /* One flat walk order, derived from the groups, so J and K move the way the eye
     does rather than the way the array happens to be sorted. */
  const walkOrder = useMemo(() => groups.flatMap((g) => g.issues), [groups]);

  /* The selection has to survive the list changing under it. If a filter removes
     the selected issue, fall back to the first row rather than showing an empty
     pane next to a full list. */
  const selected = useMemo(() => {
    if (walkOrder.length === 0) return null;
    return walkOrder.find((i) => i.id === selectedId) ?? walkOrder[0] ?? null;
  }, [walkOrder, selectedId]);

  /* Choosing a different issue restarts the flow, and that is the intended
     read of "go back to the list and start again": you have not picked a
     session for this one yet, so there is nothing to watch and no reason to
     keep the queue narrow. Every exit from depth funnels through here or
     closeSession, so the three flags can never disagree. */
  const select = useCallback((id: number | null) => {
    setSelectedId(id);
    setOpenIndex(null);
    setPeek(false);
    /* A filter written against one issue's sessions means nothing against the
       next issue's, and a band that arrives pre-narrowed by a search you have
       forgotten typing is the worst kind of empty state. */
    setSessionFilters(NO_SESSION_FILTERS);
    setSessionQuery('');
    setVisibleSessions(TOP_SESSIONS);
  }, []);

  const toggleSidePanel = useCallback(
    (panel: SidePanel) => setSidePanel((open) => (open === panel ? null : panel)),
    [],
  );

  const openSessionAt = useCallback(
    (index: number) => {
      const total = sessions.length;
      if (index < 0 || index >= total) return;
      setOpenIndex(index);
      /* A peek left open from the previous session would hide the one you just
         asked for behind the write-up you already read. */
      setPeek(false);
    },
    [selected],
  );

  const closeSession = useCallback(() => {
    setOpenIndex(null);
    setPeek(false);
  }, []);

  /* EVERY session on this issue, not just the hand-written ones. See
     `sessionPool`: an issue with 71 impact was hit by about 130 people, and a
     strip that can only ever say "3 of 3" cannot show what this looks like when
     the number is big. Memoised per issue in the shared layer, so the identity
     comparisons below are stable. */
  const sessions = useMemo(() => (selected ? sessionPool(selected) : []), [selected]);

  const openSession = useMemo(
    () => (openIndex != null ? (sessions[openIndex] ?? null) : null),
    [openIndex, sessions],
  );

  /** The whole ranked, filtered list. What the strip DRAWS is the front of it,
   *  `visibleSessions` long; the cards band takes the first three. */
  const shortlist = useMemo(
    () => shortlistSessions(sessions, sessionFilters, sessionQuery),
    [sessions, sessionFilters, sessionQuery],
  );

  /** Step to the next or previous session IN THE SHORTLIST, which is what the
   *  arrows on the strip and J/K both mean by "next". Indices out is the
   *  issue's own numbering, because that is what the player reads. */
  const stepSession = useCallback(
    (delta: number) => {
      /* Bounded by what is DRAWN, not by what exists. Stepping to a session
         that is not on the strip would light no chip and read as the control
         being broken. "Show more" is how you reach further. */
      const reachable = shortlist.slice(0, visibleSessions);
      if (reachable.length === 0) return;
      const current = openIndex != null ? sessions[openIndex] : undefined;
      const at = current ? reachable.indexOf(current) : -1;
      const next = reachable[Math.min(reachable.length - 1, Math.max(0, at + delta))];
      if (next) setOpenIndex(sessions.indexOf(next));
    },
    [sessions, shortlist, visibleSessions, openIndex],
  );

  /** One step back up the flow, which is what Esc means everywhere here. The
   *  collapsed journey counts as a level: you widened the player to get here,
   *  so the first Esc gives the panel back rather than throwing away the
   *  session as well. */
  const stepOut = useCallback(() => {
    if (peek) return setPeek(false);
    if (openIndex != null && sidePanel == null) return setSidePanel('journey');
    if (openIndex != null) return closeSession();
  }, [peek, openIndex, sidePanel, closeSession]);

  const step = useCallback(
    (delta: number) => {
      if (walkOrder.length === 0) return;
      const at = walkOrder.findIndex((i) => i.id === selected?.id);
      const next = Math.min(walkOrder.length - 1, Math.max(0, (at < 0 ? 0 : at) + delta));
      const target = walkOrder[next];
      if (target) select(target.id);
    },
    [walkOrder, selected, select],
  );

  return {
    state,
    filters: state.filters,
    display: state.display,
    dataState: state.dataState,
    rules: state.rules,

    filtered,
    groups,
    walkOrder,
    total: filtered.length,

    selected,
    selectedId: selected?.id ?? null,
    select,
    stepNext: () => step(1),
    stepPrev: () => step(-1),

    /* the flow. Both of these read off `openSession` rather than off
       `openIndex`, so an index left pointing past a shorter session list - which
       a filter change can do - collapses back to triage instead of rendering a
       watch layout with nothing in the player. */
    openIndex: openSession ? openIndex : null,
    openSession,
    openSessionAt,
    stepSession,
    closeSession,
    stepOut,

    /* THE THREE SESSIONS, derived once. Everything that offers a way between
       them - the cards, the chips, the arrows, J and K - reads this. */
    sessions,
    shortlist,
    visibleSessions,
    showMoreSessions: useCallback(
      () => setVisibleSessions((v) => v + TOP_SESSIONS),
      [],
    ),
    autoplay,
    toggleAutoplay: useCallback(() => setAutoplay((a) => !a), []),
    queueOpen,
    toggleQueue: useCallback(() => setQueueOpen((o) => !o), []),
    sessionFilters,
    sessionQuery,
    setSessionQuery,
    toggleSessionFilter: useCallback(
      (key: Parameters<typeof toggleSessionFilter>[1], value: string) =>
        setSessionFilters((f) => toggleSessionFilter(f, key, value)),
      [],
    ),
    clearSessionFilters: useCallback(() => {
      setSessionFilters(NO_SESSION_FILTERS);
      setSessionQuery('');
    }, []),

    sidePanel: openSession ? sidePanel : null,
    setSidePanel,
    toggleSidePanel,
    peek,
    togglePeek: () => setPeek((p) => !p),
    depth: (openSession ? 'watch' : 'triage') as 'triage' | 'watch',

    /* the filter menu's contents, counts included */
    dimensions: useMemo(() => filterDimensions(state), [state]),
    activeFilters: useMemo(() => activeFilters(state), [state]),
    isFilterActive: useCallback(
      (key: FilterKey, value: string) => isFilterValueActive(state.filters, key, value),
      [state.filters],
    ),
    toggleValue,
    clearDimension: useCallback(
      (key: FilterKey) => patch((s) => ({ ...s, filters: clearFilterKey(s.filters, key) })),
      [patch],
    ),

    counts: useMemo(() => counts(state), [state]),
    activeFilterCount: activeFilterCount(state.filters),
    displayChangeCount: displayChangeCount(state.display, B_INITIAL.display),
    emptyReason: useMemo(() => emptyReason(state), [state]),
    categoryCount: useCallback((c: CategoryName) => categoryCount(state, c), [state]),
    criticalState: useCallback((id: number) => criticalState(state, id), [state]),
    matchedRules: useCallback((id: number) => matchedRules(state, id), [state]),
    titleOf: useCallback((i: Issue) => titleOf(state, i), [state]),
    isHidden: useCallback((id: number) => state.hidden[id] != null, [state]),
    hiddenReason: useCallback((id: number) => state.hidden[id], [state]),
    hasField: useCallback((f: FieldKey) => state.display.fields.includes(f), [state.display]),

    setFilter,
    setDisplay,
    toggleField: useCallback(
      (f: FieldKey) => patch((s) => ({ ...s, display: toggleField(s.display, f) })),
      [patch],
    ),
    clearFilters: () => patch((s) => ({ ...s, filters: B_INITIAL.filters })),
    resetDisplay: () => patch((s) => ({ ...s, display: B_INITIAL.display })),

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

    taskKey: (id: number) => tasks[id],
    createTask: (id: number) =>
      setTasks((t) => ({ ...t, [id]: `ACME-${100 + id}` })),

    setDataState: (dataState: IssuesState['dataState']) => patch((s) => ({ ...s, dataState })),

    captureMode,
    setCaptureMode,
    activeSegmentIds,
    toggleSegment: (id: number) =>
      setActiveSegmentIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id])),
  };
}

export type IssuesController = ReturnType<typeof useIssues>;
