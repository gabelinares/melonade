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
import { recordingMetaOf } from '@shared/media-logic.ts';

export function useCobrowse() {
  const [liveSessions] = useState<LiveSession[]>(() => [...LIVE_SESSIONS]);
  const [recordings, setRecordings] = useState<Recording[]>(() => [...RECORDINGS]);
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
    sort: state.sort,
    order: state.order,
    recordingsQuery: state.recordingsQuery,

    setSection: (section: CobrowseSection) => patch((s) => ({ ...s, section })),
    setSort: (sort: LiveSort) => patch((s) => ({ ...s, sort })),
    setOrder: (order: 'asc' | 'desc') => patch((s) => ({ ...s, order })),
    setRecordingsQuery: (recordingsQuery: string) => patch((s) => ({ ...s, recordingsQuery })),

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
