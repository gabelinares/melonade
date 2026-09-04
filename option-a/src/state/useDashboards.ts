/* The React binding over the dashboards domain: a list, a scope (all/mine), a
 * search, and one open row for the StubDrawer. No live-ticking - unlike
 * audits, a dashboard is not a job in progress, it's a saved thing. */

import { useCallback, useMemo, useState } from 'react';
import {
  DASHBOARDS,
  INITIAL_DASHBOARDS_STATE,
  type Dashboard,
  type DashboardScope,
  type DashboardsState,
  dashboardScopeCounts,
  filterDashboards,
} from '@shared/dashboards-data.ts';

export function useDashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>(() => [...DASHBOARDS]);
  const [state, setState] = useState<DashboardsState>(INITIAL_DASHBOARDS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: DashboardsState) => DashboardsState) => setState(fn), []);

  const visible = useMemo(() => filterDashboards(dashboards, state), [dashboards, state]);
  const scopeCounts = useMemo(() => dashboardScopeCounts(dashboards, state.query), [dashboards, state.query]);
  const open = dashboards.find((d) => d.id === openId) ?? null;

  const remove = useCallback((id: number) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    dashboards,
    visible,
    scopeCounts,
    open,
    total: dashboards.length,
    scope: state.scope,
    query: state.query,

    setScope: (scope: DashboardScope) => patch((s) => ({ ...s, scope })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openDashboard: (id: number) => setOpenId(id),
    closeDashboard: () => setOpenId(null),
    remove,
  };
}

export type DashboardsController = ReturnType<typeof useDashboards>;
