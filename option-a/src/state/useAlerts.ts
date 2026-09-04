/* The React binding over the alerts domain: a list, a search, and one open
 * row for the StubDrawer. No filter menu - a search over the name and the
 * metric it watches is every real question this shelf gets asked. */

import { useCallback, useMemo, useState } from 'react';
import { ALERTS, INITIAL_ALERTS_STATE, type Alert, type AlertsState, filterAlerts } from '@shared/alerts-data.ts';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(() => [...ALERTS]);
  const [state, setState] = useState<AlertsState>(INITIAL_ALERTS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: AlertsState) => AlertsState) => setState(fn), []);

  const visible = useMemo(() => filterAlerts(alerts, state), [alerts, state]);
  const open = alerts.find((a) => a.id === openId) ?? null;

  const remove = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    alerts,
    visible,
    open,
    total: alerts.length,
    query: state.query,

    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openAlert: (id: number) => setOpenId(id),
    closeAlert: () => setOpenId(null),
    remove,
  };
}

export type AlertsController = ReturnType<typeof useAlerts>;
