/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT ANALYTICS — DASHBOARDS.

   A dashboard is a saved arrangement of cards, and this list answers one
   question: which ones exist, who owns them, when were they last touched. The
   canvas itself - adding a card, laying it out - is not this round; see the
   StubDrawer note on the page.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Dashboard {
  id: number;
  name: string;
  owner: string;
  /** `owner === 'You'`, kept as its own field so the scope filter and the
   *  table never have to agree on that string twice. */
  mine: boolean;
  updatedAt: number;
  visibility: 'team' | 'private';
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const DASHBOARDS: readonly Dashboard[] = [
  { id: 1, name: 'Activation funnel', owner: 'You', mine: true, updatedAt: daysAgo(0, 9), visibility: 'team' },
  { id: 2, name: 'Checkout health', owner: 'Sarah K.', mine: false, updatedAt: daysAgo(1, 14), visibility: 'team' },
  { id: 3, name: 'Weekly product review', owner: 'You', mine: true, updatedAt: daysAgo(2, 11), visibility: 'team' },
  { id: 4, name: 'Mobile app overview', owner: 'Mehdi O.', mine: false, updatedAt: daysAgo(4, 16), visibility: 'private' },
  { id: 5, name: 'Support escalations', owner: 'Nikita M.', mine: false, updatedAt: daysAgo(6, 10), visibility: 'team' },
  { id: 6, name: 'Onboarding drop-off', owner: 'You', mine: true, updatedAt: daysAgo(9, 9), visibility: 'private' },
  { id: 7, name: 'Pricing page experiment', owner: 'Sarah K.', mine: false, updatedAt: daysAgo(13, 15), visibility: 'team' },
  { id: 8, name: 'Draft — Q3 retro', owner: 'You', mine: true, updatedAt: daysAgo(18, 17), visibility: 'private' },
  { id: 9, name: 'Enterprise accounts', owner: 'Nikita M.', mine: false, updatedAt: daysAgo(26, 11), visibility: 'team' },
  { id: 10, name: 'Error budget', owner: 'Mehdi O.', mine: false, updatedAt: daysAgo(34, 9), visibility: 'private' },
  { id: 11, name: 'Full traffic baseline', owner: 'You', mine: true, updatedAt: daysAgo(52, 10), visibility: 'team' },
];

export type DashboardScope = 'all' | 'mine';

export interface DashboardsState {
  scope: DashboardScope;
  query: string;
}

export const INITIAL_DASHBOARDS_STATE: DashboardsState = { scope: 'all', query: '' };

export const matchesDashboardQuery = (d: Dashboard, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || d.name.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q);
};

export function filterDashboards(dashboards: readonly Dashboard[], state: DashboardsState): Dashboard[] {
  return dashboards.filter(
    (d) => (state.scope === 'all' || d.mine) && matchesDashboardQuery(d, state.query),
  );
}

export const dashboardScopeCounts = (
  dashboards: readonly Dashboard[],
  query: string,
): { key: DashboardScope; label: string; count: number }[] => {
  const inQuery = dashboards.filter((d) => matchesDashboardQuery(d, query));
  return [
    { key: 'all', label: 'All dashboards', count: inQuery.length },
    { key: 'mine', label: 'My dashboards', count: inQuery.filter((d) => d.mine).length },
  ];
};
