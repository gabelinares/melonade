/* The React binding over the cards domain: a list, a type filter, a search,
 * and one open row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  CARDS,
  INITIAL_CARDS_STATE,
  type Card,
  type CardTypeFilter,
  type CardsState,
  cardTypeCounts,
  filterCards,
} from '@shared/cards-data.ts';

export function useCards() {
  const [cards, setCards] = useState<Card[]>(() => [...CARDS]);
  const [state, setState] = useState<CardsState>(INITIAL_CARDS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: CardsState) => CardsState) => setState(fn), []);

  const visible = useMemo(() => filterCards(cards, state), [cards, state]);
  const typeCounts = useMemo(() => cardTypeCounts(cards, state.query), [cards, state.query]);
  const open = cards.find((c) => c.id === openId) ?? null;

  const remove = useCallback((id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);

  return {
    cards,
    visible,
    typeCounts,
    open,
    total: cards.length,
    type: state.type,
    query: state.query,

    setType: (type: CardTypeFilter) => patch((s) => ({ ...s, type })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openCard: (id: number) => setOpenId(id),
    closeCard: () => setOpenId(null),
    remove,
  };
}

export type CardsController = ReturnType<typeof useCards>;
