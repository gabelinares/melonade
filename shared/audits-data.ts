/* ═══════════════════════════════════════════════════════════════════════════
   THE UX AUDIT AGENT'S DOMAIN.

   An audit is not an issue and not a test: it is a long-running JOB over a
   sample of sessions that produces a static, consulting-style artifact - a
   report you present, export as a PDF or hand to a client. That is why this
   list is the shortest of the three and why the workflow around it is
   deliberately thin. The report is the product; the list is a shelf.
   ═══════════════════════════════════════════════════════════════════════════ */

export type AuditStatus = 'running' | 'ready';

export interface Audit {
  id: number;
  name: string;
  /** What the agent read: a segment, a period, or both. Printed under the name
   *  because an audit without its scope is an unlabelled number. */
  scope: string[];
  periodDays: 7 | 30 | 90;
  /** Sessions matching the scope in the period. */
  matched: number;
  /** Sessions actually analysed. */
  sampleSize: number;
  status: AuditStatus;
  /** 0-100, and never printed as a number - see `advanceAudits`. */
  progress: number;
  createdBy: string;
  /** Yours to delete. Somebody else's audit is readable, not disposable. */
  mine: boolean;
  createdAt: number;
  /** The composite UX health score, once there is one. */
  healthScore?: number;
  emailWhenDone?: boolean;
}

const JULY = (day: number, hour = 10) => new Date(2026, 6, day, hour).getTime();

export const AUDITS: readonly Audit[] = [
  {
    id: 3,
    name: 'Mobile visitors — July',
    scope: ['Mobile visitors', 'Last 7 days'],
    periodDays: 7,
    matched: 5320,
    sampleSize: 1000,
    status: 'running',
    progress: 38,
    createdBy: 'You',
    mine: true,
    createdAt: JULY(9, 9),
    emailWhenDone: true,
  },
  {
    id: 2,
    name: 'Checkout & billing — July',
    scope: ['Billing & checkout', 'Last 30 days'],
    periodDays: 30,
    matched: 8140,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'You',
    mine: true,
    createdAt: JULY(7, 15),
    healthScore: 67,
  },
  {
    id: 1,
    name: 'Full traffic baseline — June',
    scope: ['Full traffic', 'Last 30 days'],
    periodDays: 30,
    matched: 58200,
    sampleSize: 2000,
    status: 'ready',
    progress: 100,
    createdBy: 'Mehdi O.',
    mine: false,
    createdAt: JULY(1, 11),
    healthScore: 71,
  },
];

export type AuditTab = 'all' | AuditStatus;

/** The share of matched sessions the agent actually read. A percentage, not the
 *  raw pair: nobody should have to work out that 1,000 of 5,320 is a fifth. The
 *  exact numbers stay one hover away. */
export const samplePercent = (a: Audit): number =>
  a.matched ? Math.max(1, Math.round((a.sampleSize / a.matched) * 100)) : 0;

export type HealthBand = 'good' | 'fair' | 'poor';

export const healthBand = (score: number): HealthBand =>
  score >= 75 ? 'good' : score >= 50 ? 'fair' : 'poor';

/**
 * One tick of the demo's liveness: running audits ease forward and the ones
 * that finish are returned so the page can say so.
 *
 * The easing is the point. A job like this has an unknowable duration, so the
 * bar moves fast early and crawls near the end - and the UI never prints a
 * percentage, because a number here would be a promise the agent cannot keep.
 */
export function advanceAudits(audits: readonly Audit[]): { audits: Audit[]; finished: Audit[] } {
  const finished: Audit[] = [];
  const next = audits.map((a) => {
    if (a.status !== 'running') return a;
    const step = Math.max(0.6, (100 - a.progress) * 0.09) + Math.random();
    const progress = Math.min(100, a.progress + step);
    if (progress >= 99.5) {
      const done: Audit = { ...a, progress: 100, status: 'ready', healthScore: 60 + Math.round(Math.random() * 20) };
      finished.push(done);
      return done;
    }
    return { ...a, progress };
  });
  return { audits: next, finished };
}

export interface AuditTabCount {
  key: AuditTab;
  label: string;
  count: number;
}

export function auditCounts(audits: readonly Audit[], query: string): AuditTabCount[] {
  const pool = audits.filter((a) => matchesAuditQuery(a, query));
  return [
    { key: 'all', label: 'All', count: pool.length },
    { key: 'running', label: 'Running', count: pool.filter((a) => a.status === 'running').length },
    { key: 'ready', label: 'Ready', count: pool.filter((a) => a.status === 'ready').length },
  ];
}

export const matchesAuditQuery = (a: Audit, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || a.name.toLowerCase().includes(q) || a.scope.some((s) => s.toLowerCase().includes(q));
};

export function filterAudits(audits: readonly Audit[], tab: AuditTab, query: string): Audit[] {
  return audits.filter((a) => (tab === 'all' || a.status === tab) && matchesAuditQuery(a, query));
}
