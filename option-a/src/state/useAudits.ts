/* The React binding over the audits domain: a list, a tab, a search, a window,
 * four filter dimensions, an ordering, and one interval that moves the running
 * jobs forward. Everything else - what a tab counts, what share of the traffic
 * was read, how a job eases toward done - is arithmetic in
 * shared/audits-data.ts, the same split every other controller here follows. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUDITS,
  INITIAL_AUDITS_STATE,
  NO_AUDIT_FILTERS,
  type Audit,
  type AuditFieldKey,
  type AuditFilterKey,
  type AuditSortKey,
  type AuditTab,
  type AuditsState,
  activeAuditFilters,
  advanceAudits,
  auditCounts,
  auditDimensions,
  auditDisplayCount,
  auditFilterCount,
  filterAudits,
  toggleAuditField,
  toggleAuditFilter,
} from '@shared/audits-data.ts';
import type { DateRangeValue } from '@shared/date-range.ts';

/** How often the demo's running audits move. Slow enough to read as a job
 *  rather than a progress bar animation. */
const TICK_MS = 1800;

export function useAudits(onFinished?: (audit: Audit) => void) {
  const [audits, setAudits] = useState<Audit[]>(() => [...AUDITS]);
  const [state, setState] = useState<AuditsState>(INITIAL_AUDITS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  /* Every "how long ago" question is asked against ONE now, taken per render.
     Calling Date.now() inside the filter and again inside the counts is how a
     row ends up in a list its own tab says is empty. */
  const now = Date.now();

  /* Liveness. A list of jobs that never moves teaches the wrong thing about
     what this agent does, so the running ones advance while the page is open
     and announce themselves when they land - which is also the only way to see
     the running row become a ready one. */
  /* ⚠ THE ANNOUNCEMENT LEAVES THE UPDATER. `onFinished` raises a toast, which
     is a setState on the App provider, and it was being called from inside the
     `setAudits` updater - React runs updaters during the render phase, so that
     is "cannot update a component while rendering a different component", and
     under StrictMode the updater runs twice so the toast fired twice as well.
     It was invisible while the fixture had one audit at 38% that never finished
     inside a session; it surfaced the moment the fixture grew a second running
     job. The updater stays pure, the announcement is queued out of the render
     phase, and a Set makes it once per audit however many times React replays
     the update. */
  const announced = useRef<Set<number>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => {
      setAudits((prev) => {
        const { audits: next, finished } = advanceAudits(prev);
        const fresh = finished.filter((a) => !announced.current.has(a.id));
        if (fresh.length) {
          fresh.forEach((a) => announced.current.add(a.id));
          queueMicrotask(() => fresh.forEach((a) => onFinished?.(a)));
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [onFinished]);

  const patch = useCallback((fn: (s: AuditsState) => AuditsState) => setState(fn), []);

  const visible = useMemo(() => filterAudits(audits, state, now), [audits, state, now]);
  const counts = useMemo(() => auditCounts(audits, state, now), [audits, state, now]);
  const dimensions = useMemo(() => auditDimensions(audits, state, now), [audits, state, now]);
  const chips = useMemo(() => activeAuditFilters(audits, state, now), [audits, state, now]);
  const open = audits.find((a) => a.id === openId) ?? null;

  const remove = useCallback((id: number) => {
    setAudits((prev) => prev.filter((a) => a.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    audits,
    visible,
    counts,
    dimensions,
    chips,
    open,
    total: audits.length,
    state,
    tab: state.tab,
    query: state.query,
    range: state.range,
    display: state.display,
    filterCount: auditFilterCount(state.filters),
    displayCount: auditDisplayCount(state.display),
    hasField: (f: AuditFieldKey) => state.display.fields.includes(f),

    setTab: (tab: AuditTab) => patch((s) => ({ ...s, tab })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),
    setRange: (range: DateRangeValue) => patch((s) => ({ ...s, range })),
    setSort: (sort: AuditSortKey) => patch((s) => ({ ...s, display: { ...s.display, sort } })),
    toggleField: (f: AuditFieldKey) => patch((s) => ({ ...s, display: toggleAuditField(s.display, f) })),
    toggleFilter: (key: AuditFilterKey, value: string) =>
      patch((s) => ({ ...s, filters: toggleAuditFilter(s.filters, key, value) })),
    isFilterActive: (key: AuditFilterKey, value: string) => state.filters[key].includes(value),
    /* ⚠ Clear-all empties the questions you asked and the search. It does NOT
       touch the date window, which is not a question - it is the state the list
       is permanently in, printed on its own control. */
    clearFilters: () => patch((s) => ({ ...s, filters: NO_AUDIT_FILTERS, query: '' })),
    resetDisplay: () => patch((s) => ({ ...s, display: INITIAL_AUDITS_STATE.display })),

    openAudit: (id: number) => setOpenId(id),
    closeAudit: () => setOpenId(null),
    remove,
  };
}

export type AuditsController = ReturnType<typeof useAudits>;
