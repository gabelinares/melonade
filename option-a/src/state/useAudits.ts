/* The audits list is the smallest state in the app: a list, a tab, a query, and
 * one interval that moves the running jobs forward. Everything else - what a
 * tab counts, what percentage of the traffic was read, how a job eases toward
 * done - is arithmetic in shared/audits-data.ts. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUDITS,
  type Audit,
  type AuditTab,
  advanceAudits,
  auditCounts,
  filterAudits,
} from '@shared/audits-data.ts';

/** How often the demo's running audits move. Slow enough to read as a job
 *  rather than a progress bar animation. */
const TICK_MS = 1800;

export function useAudits(onFinished?: (audit: Audit) => void) {
  const [audits, setAudits] = useState<Audit[]>(() => [...AUDITS]);
  const [tab, setTab] = useState<AuditTab>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  /* Liveness. A list of jobs that never moves teaches the wrong thing about
     what this agent does, so the running ones advance while the page is open
     and announce themselves when they land - which is also the only way to see
     the running row become a ready one. */
  useEffect(() => {
    const id = window.setInterval(() => {
      setAudits((prev) => {
        const { audits: next, finished } = advanceAudits(prev);
        finished.forEach((a) => onFinished?.(a));
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [onFinished]);

  const visible = useMemo(() => filterAudits(audits, tab, query), [audits, tab, query]);
  const counts = useMemo(() => auditCounts(audits, query), [audits, query]);
  const open = audits.find((a) => a.id === openId) ?? null;

  const remove = useCallback((id: number) => {
    setAudits((prev) => prev.filter((a) => a.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    audits,
    visible,
    counts,
    tab,
    query,
    open,
    total: audits.length,
    setTab,
    setQuery,
    openAudit: (id: number) => setOpenId(id),
    closeAudit: () => setOpenId(null),
    remove,
  };
}

export type AuditsController = ReturnType<typeof useAudits>;
