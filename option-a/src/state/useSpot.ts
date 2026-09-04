/* The React binding over the Spot domain: a list, a scope, a search, a
 * selection for bulk delete, and one open card for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  INITIAL_SPOT_STATE,
  SPOTS,
  type Spot,
  type SpotScope,
  type SpotState,
  filterSpots,
  spotScopeCounts,
} from '@shared/spot-data.ts';

export function useSpot() {
  const [spots, setSpots] = useState<Spot[]>(() => [...SPOTS]);
  const [state, setState] = useState<SpotState>(INITIAL_SPOT_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: SpotState) => SpotState) => setState(fn), []);

  const visible = useMemo(() => filterSpots(spots, state), [spots, state]);
  const scopeCounts = useMemo(() => spotScopeCounts(spots, state.query), [spots, state.query]);
  const open = spots.find((s) => s.id === openId) ?? null;

  const toggleSelected = useCallback(
    (id: number) =>
      patch((s) => ({ ...s, selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] })),
    [patch],
  );

  const clearSelection = useCallback(() => patch((s) => ({ ...s, selected: [] })), [patch]);

  const deleteSelected = useCallback(() => {
    setSpots((prev) => prev.filter((s) => !state.selected.includes(s.id)));
    patch((s) => ({ ...s, selected: [] }));
  }, [state.selected, patch]);

  const remove = useCallback((id: number) => {
    setSpots((prev) => prev.filter((s) => s.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    spots,
    visible,
    scopeCounts,
    open,
    total: spots.length,
    scope: state.scope,
    query: state.query,
    selected: state.selected,

    setScope: (scope: SpotScope) => patch((s) => ({ ...s, scope })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),
    toggleSelected,
    clearSelection,
    deleteSelected,
    remove,

    openSpot: (id: number) => setOpenId(id),
    closeSpot: () => setOpenId(null),
  };
}

export type SpotController = ReturnType<typeof useSpot>;
