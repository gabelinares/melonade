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
import { initialDefinition, type CardDefinition } from '@shared/analytics-logic.ts';
import type { SessionRow } from '@shared/sessions-data.ts';
import { DEFAULT_RANGE, type DateRangeValue } from '@shared/date-range.ts';

export function useCards() {
  const [cards, setCards] = useState<Card[]>(() => [...CARDS]);
  const [state, setState] = useState<CardsState>(INITIAL_CARDS_STATE);
  const [openId, setOpenId] = useState<number | null>(null);
  /* ── THE CARD BUILDER'S STATE (2026-09-14) ────────────────────────────────
     Production's WidgetView edits a draft and enables "Update" only once the
     draft differs from what was saved. Saved definitions live per card;
     the draft is per open card and starts from the saved one. */
  const [saved, setSaved] = useState<Record<number, CardDefinition>>({});
  const [draft, setDraft] = useState<CardDefinition | null>(null);
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_RANGE);
  const [watching, setWatching] = useState<SessionRow | null>(null);

  const patch = useCallback((fn: (s: CardsState) => CardsState) => setState(fn), []);

  const visible = useMemo(() => filterCards(cards, state), [cards, state]);
  const typeCounts = useMemo(() => cardTypeCounts(cards, state.query), [cards, state.query]);
  const open = cards.find((c) => c.id === openId) ?? null;
  const savedDefinition = open ? (saved[open.id] ?? initialDefinition(open)) : null;
  const definition = draft ?? savedDefinition;
  const isDirty = definition != null && savedDefinition != null && JSON.stringify(definition) !== JSON.stringify(savedDefinition);

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

    openCard: (id: number) => {
      setOpenId(id);
      setDraft(null);
      setWatching(null);
    },
    closeCard: () => {
      setOpenId(null);
      setDraft(null);
      setWatching(null);
    },
    remove,

    definition,
    isDirty,
    editDefinition: (fn: (d: CardDefinition) => CardDefinition) => setDraft((d) => fn(d ?? savedDefinition!)),
    save: () => {
      if (!open || !definition) return;
      setSaved((all) => ({ ...all, [open.id]: definition }));
      setDraft(null);
      setCards((all) => all.map((c) => (c.id === open.id ? { ...c, updatedAt: Date.now() } : c)));
    },
    rename: (id: number, name: string) =>
      setCards((all) => all.map((c) => (c.id === id ? { ...c, name, updatedAt: Date.now() } : c))),
    range,
    setRange,
    watching,
    watch: (s: SessionRow) => setWatching(s),
    closeSession: () => setWatching(null),
  };
}

export type CardsController = ReturnType<typeof useCards>;
