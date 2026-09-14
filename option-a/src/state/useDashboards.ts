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
import { COL_SPAN, initialWidgets, type Widget } from '@shared/analytics-logic.ts';
import { CARDS } from '@shared/cards-data.ts';
import { DEFAULT_RANGE, type DateRangeValue } from '@shared/date-range.ts';

export function useDashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>(() => [...DASHBOARDS]);
  const [state, setState] = useState<DashboardsState>(INITIAL_DASHBOARDS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);
  /* ── WHAT IS ON EACH DASHBOARD (2026-09-14) ───────────────────────────────
     Production's DashboardView: a grid of widgets, each a card at a column
     span, added from a picker and removed from the widget's own menu. Seeded
     from the fixtures once, then edited here, so adding a card to "Checkout
     health" and coming back finds it there. */
  const [widgets, setWidgets] = useState<Record<number, Widget[]>>(() =>
    Object.fromEntries(DASHBOARDS.map((d) => [d.id, initialWidgets(d)])),
  );
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_RANGE);

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

    widgets: openId != null ? (widgets[openId] ?? []) : [],
    widgetsOf: (id: number) => widgets[id] ?? [],
    addCard: (dashboardId: number, cardId: number) => {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return;
      setWidgets((all) => {
        const cur = all[dashboardId] ?? [];
        if (cur.some((w) => w.cardId === cardId)) return all;
        return { ...all, [dashboardId]: [...cur, { cardId, span: COL_SPAN[card.type] }] };
      });
      setDashboards((all) => all.map((d) => (d.id === dashboardId ? { ...d, updatedAt: Date.now() } : d)));
    },
    removeCard: (dashboardId: number, cardId: number) =>
      setWidgets((all) => ({ ...all, [dashboardId]: (all[dashboardId] ?? []).filter((w) => w.cardId !== cardId) })),
    rename: (id: number, name: string) =>
      setDashboards((all) => all.map((d) => (d.id === id ? { ...d, name, updatedAt: Date.now() } : d))),
    setVisibility: (id: number, visibility: Dashboard['visibility']) =>
      setDashboards((all) => all.map((d) => (d.id === id ? { ...d, visibility, updatedAt: Date.now() } : d))),
    range,
    setRange,
  };
}

export type DashboardsController = ReturnType<typeof useDashboards>;
