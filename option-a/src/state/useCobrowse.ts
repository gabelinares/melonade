/* The React binding over CoBrowse: two sections (Live, Recordings), the
 * live list's own sort, the recordings list's own search, and one open row
 * on each side for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  LIVE_SESSIONS,
  RECORDINGS,
  INITIAL_COBROWSE_STATE,
  type CobrowseSection,
  type CobrowseState,
  type LiveSession,
  type LiveSort,
  type Recording,
  filterRecordings,
  sortLiveSessions,
} from '@shared/cobrowse-data.ts';

export function useCobrowse() {
  const [liveSessions] = useState<LiveSession[]>(() => [...LIVE_SESSIONS]);
  const [recordings] = useState<Recording[]>(() => [...RECORDINGS]);
  const [state, setState] = useState<CobrowseState>(INITIAL_COBROWSE_STATE);
  const [openLiveId, setOpenLiveId] = useState<string | null>(null);
  const [openRecordingId, setOpenRecordingId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: CobrowseState) => CobrowseState) => setState(fn), []);

  const visibleLive = useMemo(
    () => sortLiveSessions(liveSessions, state.sort, state.order),
    [liveSessions, state.sort, state.order],
  );
  const visibleRecordings = useMemo(
    () => filterRecordings(recordings, state.recordingsQuery),
    [recordings, state.recordingsQuery],
  );

  const openLive = liveSessions.find((s) => s.id === openLiveId) ?? null;
  const openRecording = recordings.find((r) => r.id === openRecordingId) ?? null;

  return {
    liveSessions,
    recordings,
    visibleLive,
    visibleRecordings,
    openLive,
    openRecording,
    section: state.section,
    sort: state.sort,
    order: state.order,
    recordingsQuery: state.recordingsQuery,

    setSection: (section: CobrowseSection) => patch((s) => ({ ...s, section })),
    setSort: (sort: LiveSort) => patch((s) => ({ ...s, sort })),
    setOrder: (order: 'asc' | 'desc') => patch((s) => ({ ...s, order })),
    setRecordingsQuery: (recordingsQuery: string) => patch((s) => ({ ...s, recordingsQuery })),

    openLiveSession: (id: string) => setOpenLiveId(id),
    closeLiveSession: () => setOpenLiveId(null),
    openRecordingRow: (id: number) => setOpenRecordingId(id),
    closeRecordingRow: () => setOpenRecordingId(null),
  };
}

export type CobrowseController = ReturnType<typeof useCobrowse>;
