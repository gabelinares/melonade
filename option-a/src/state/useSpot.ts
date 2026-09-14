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
import { spotCommentsOf, spotMetaOf, type SpotComment } from '@shared/media-logic.ts';

export function useSpot() {
  const [spots, setSpots] = useState<Spot[]>(() => [...SPOTS]);
  const [state, setState] = useState<SpotState>(INITIAL_SPOT_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: SpotState) => SpotState) => setState(fn), []);

  const visible = useMemo(() => filterSpots(spots, state), [spots, state]);
  const scopeCounts = useMemo(() => spotScopeCounts(spots, state.query), [spots, state.query]);
  const open = spots.find((s) => s.id === openId) ?? null;

  /* ── THE PLAYER PAGE'S OWN STATE (2026-09-14) ───────────────────────────
     Production's SpotPlayer holds the comment thread and the access flag per
     spot; both start from the fixture and keep what you change while the app
     is open. Comments you post are yours ("You"), appended in order. */
  const [posted, setPosted] = useState<Record<number, SpotComment[]>>({});
  const [access, setAccess] = useState<Record<number, boolean>>({});
  const comments: SpotComment[] = useMemo(
    () => (open ? [...spotCommentsOf(open), ...(posted[open.id] ?? [])] : []),
    [open, posted],
  );
  const isPublic = open ? (access[open.id] ?? spotMetaOf(open).isPublic) : false;

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
    rename: (id: number, title: string) => setSpots((prev) => prev.map((x) => (x.id === id ? { ...x, title } : x))),

    comments,
    /** Production caps a signed-in viewer at 25 messages per spot. */
    canComment: comments.length < 25,
    addComment: (body: string) => {
      if (!open) return;
      const c: SpotComment = { id: `${open.id}-u${Date.now()}`, author: 'You', minutesAgo: 0, body };
      setPosted((all) => ({ ...all, [open.id]: [...(all[open.id] ?? []), c] }));
    },
    isPublic,
    setPublic: (on: boolean) => open && setAccess((all) => ({ ...all, [open.id]: on })),
  };
}

export type SpotController = ReturnType<typeof useSpot>;
