/* The React binding over CoBrowse: two sections (Live, Recordings), the
 * live list's search and sort, the recordings list's own search, and one
 * open row on each side.
 *
 * ⚠ THE LIVE LIST IS THE SESSIONS TABLE (2026-09-15). Its rows are
 * `SessionRow`s built by `liveSessionRowOf`, its search is the same rule
 * verbs `useSessions` binds - over a catalogue narrowed to what production's
 * live search accepts - and its sort is a column header. See
 * shared/cobrowse-logic.ts for the why. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIVE_SESSIONS,
  RECORDINGS,
  INITIAL_COBROWSE_STATE,
  type CobrowseSection,
  type CobrowseState,
  type LiveSession,
  type Recording,
  filterRecordings,
} from '@shared/cobrowse-data.ts';
import { DEFAULT_LIVE_SORT, filterLiveRows, liveSessionRowOf, sortLiveRows } from '@shared/cobrowse-logic.ts';
import { recordingMetaOf } from '@shared/media-logic.ts';
import {
  addManyToRules,
  addPropertyInRules,
  addToRules,
  entryOf,
  filterToIdentity,
  moveEventInRules,
  removeFromRules,
  removePropertyInRules,
  replaceInRules,
  splitFilters,
  togglePropertyOrderInRules,
  updateInRules,
  updatePropertyInRules,
  type CatalogueEntry,
  type ColumnSort,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';

export function useCobrowse() {
  const [liveSessions] = useState<LiveSession[]>(() => [...LIVE_SESSIONS]);
  const [recordings, setRecordings] = useState<Recording[]>(() => [...RECORDINGS]);
  const [state, setState] = useState<CobrowseState>(INITIAL_COBROWSE_STATE);
  const [openLiveId, setOpenLiveId] = useState<string | null>(null);
  const [openRecordingId, setOpenRecordingId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: CobrowseState) => CobrowseState) => setState(fn), []);

  /* ── THE LIVE LIST, AS ROWS ─────────────────────────────────────────────
     The clock ticks once a second so "how long have they been on" moves -
     a live duration that does not move is indistinguishable from a session
     that ended. Every row is rebuilt from the tick, which is five objects. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const liveRows = useMemo(() => liveSessions.map((s) => liveSessionRowOf(s, now)), [liveSessions, now]);

  /* ── THE LIVE SEARCH: THE SAME VERBS SESSIONS USES ──────────────────────
     One `filters` array and the shared rule transforms, bound to it the way
     useSessions binds them to its own. The event verbs are bound too, even
     though the live catalogue offers no events: the card asks for them, and a
     verb that exists and is never called is cheaper than a second card. */
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [sort, setSort] = useState<ColumnSort>(DEFAULT_LIVE_SORT);
  const onRules = useCallback((fn: (rules: readonly SearchFilter[]) => SearchFilter[]) => setFilters((r) => fn(r)), []);
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
  const clearSearch = useCallback(() => setFilters([]), []);
  /* The name on a row narrows to that person - production's `onUserClick` on
     the live list does exactly this, through the User ID filter. */
  const filterToUser = useCallback(
    (s: SessionRow) => {
      const entry = entryOf(s.userId ? 'userId' : 'userAnonymousId');
      if (entry) onRules((r) => filterToIdentity(r, entry, s.userId ?? s.userAnonymousId));
    },
    [onRules],
  );

  const matchedLive = useMemo(() => filterLiveRows(liveRows, filters), [liveRows, filters]);
  const visibleLive = useMemo(() => sortLiveRows(matchedLive, sort), [matchedLive, sort]);
  const { events, properties } = useMemo(() => splitFilters(filters), [filters]);
  const visibleRecordings = useMemo(
    () => filterRecordings(recordings, state.recordingsQuery),
    [recordings, state.recordingsQuery],
  );

  const openLive = liveSessions.find((s) => s.id === openLiveId) ?? null;
  const openRecording = recordings.find((r) => r.id === openRecordingId) ?? null;

  /* ── THE CALL, AS A SMALL MACHINE (2026-09-14) ──────────────────────────
     Production's assist actions: Call starts a call (after a confirm), Remote
     control is only possible on a call, Annotate only during a call or while
     controlling. Ending the call drops both. All of it is per open session
     and resets when you leave it. */
  const [call, setCall] = useState<'idle' | 'onCall'>('idle');
  const [remoteControl, setRemoteControl] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const leaveLive = () => {
    setCall('idle');
    setRemoteControl(false);
    setAnnotating(false);
    setOpenLiveId(null);
  };

  return {
    liveSessions,
    recordings,
    visibleLive,
    visibleRecordings,
    openLive,
    openRecording,
    section: state.section,
    recordingsQuery: state.recordingsQuery,

    setSection: (section: CobrowseSection) => patch((s) => ({ ...s, section })),
    setRecordingsQuery: (recordingsQuery: string) => patch((s) => ({ ...s, recordingsQuery })),

    /* the live list's search and sort */
    liveRows,
    matchedLive,
    filters,
    events,
    properties,
    addFilter,
    addFilters,
    updateFilter,
    replaceFilter,
    removeFilter,
    clearSearch,
    filterToUser,
    moveEvent: (from: number, to: number) => onRules((r) => moveEventInRules(r, from, to)),
    addProperty: (eventKey: string, entry: CatalogueEntry) => onRules((r) => addPropertyInRules(r, eventKey, entry)),
    updateProperty: (eventKey: string, propKey: string, p: Partial<SearchFilter>) =>
      onRules((r) => updatePropertyInRules(r, eventKey, propKey, p)),
    removeProperty: (eventKey: string, propKey: string) => onRules((r) => removePropertyInRules(r, eventKey, propKey)),
    togglePropertyOrder: (eventKey: string) => onRules((r) => togglePropertyOrderInRules(r, eventKey)),
    sort,
    /* A third click on a header clears antd's order; the list answers with its
       default, newest first. */
    setSort: (next: ColumnSort | null) => setSort(next ?? DEFAULT_LIVE_SORT),

    openLiveSession: (id: string) => setOpenLiveId(id),
    closeLiveSession: leaveLive,

    call,
    remoteControl,
    annotating,
    startCall: () => setCall('onCall'),
    endCall: () => {
      setCall('idle');
      setRemoteControl(false);
      setAnnotating(false);
    },
    toggleRemoteControl: () => setRemoteControl((v) => !v),
    toggleAnnotating: () => setAnnotating((v) => !v),

    /* ⚠ A RECORDING OPENS IN A NEW TAB, because that is what production does:
       `fetchRecordingUrl` then `window.open(url, '_blank')`, no in-app player.
       The row and its "Play video" link both land here. `openRecording` is
       kept for the moment between the click and the tab (a flash of "opening"
       on the row is honest; a drawer would not be). */
    openRecordingRow: (id: number) => {
      const r = recordings.find((x) => x.id === id);
      if (!r) return;
      setOpenRecordingId(id);
      window.open(recordingMetaOf(r).signedUrl, '_blank', 'noopener');
      window.setTimeout(() => setOpenRecordingId((cur) => (cur === id ? null : cur)), 600);
    },
    closeRecordingRow: () => setOpenRecordingId(null),
    renameRecording: (id: number, name: string) =>
      setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r))),
    removeRecording: (id: number) => setRecordings((prev) => prev.filter((r) => r.id !== id)),
  };
}

export type CobrowseController = ReturnType<typeof useCobrowse>;
