/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT ANALYTICS — CARDS.

   A card is one metric: a timeseries, a funnel, a table. Dashboards are built
   from them, but this list is the library on its own - the same shelf a
   dashboard's "Add card" would pick from, which is why it carries a type
   filter and nothing else production doesn't already ask of it.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CardType = 'timeseries' | 'table' | 'funnel' | 'heatmap' | 'pathAnalysis';

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  timeseries: 'Timeseries',
  table: 'Table',
  funnel: 'Funnel',
  heatmap: 'Heatmap',
  pathAnalysis: 'Path analysis',
};

export interface Card {
  id: number;
  name: string;
  owner: string;
  type: CardType;
  updatedAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const CARDS: readonly Card[] = [
  { id: 1, name: 'Sign-ups over time', owner: 'you@openreplay.com', type: 'timeseries', updatedAt: daysAgo(0, 9) },
  { id: 2, name: 'Checkout funnel', owner: 'sarah@openreplay.com', type: 'funnel', updatedAt: daysAgo(1, 13) },
  { id: 3, name: 'Rage clicks by page', owner: 'mehdi@openreplay.com', type: 'heatmap', updatedAt: daysAgo(2, 16) },
  { id: 4, name: 'Top error rates', owner: 'you@openreplay.com', type: 'table', updatedAt: daysAgo(3, 10) },
  { id: 5, name: 'Onboarding path', owner: 'nikita@openreplay.com', type: 'pathAnalysis', updatedAt: daysAgo(5, 11) },
  { id: 6, name: 'Session duration', owner: 'you@openreplay.com', type: 'timeseries', updatedAt: daysAgo(7, 9) },
  { id: 7, name: 'Support ticket volume', owner: 'sarah@openreplay.com', type: 'table', updatedAt: daysAgo(10, 14) },
  { id: 8, name: 'Mobile drop-off funnel', owner: 'mehdi@openreplay.com', type: 'funnel', updatedAt: daysAgo(15, 15) },
  { id: 9, name: 'Feature adoption path', owner: 'you@openreplay.com', type: 'pathAnalysis', updatedAt: daysAgo(21, 9) },
  { id: 10, name: 'Click density — pricing', owner: 'nikita@openreplay.com', type: 'heatmap', updatedAt: daysAgo(29, 12) },
  { id: 11, name: 'Weekly active users', owner: 'you@openreplay.com', type: 'timeseries', updatedAt: daysAgo(38, 10) },
  { id: 12, name: 'Churned accounts', owner: 'mehdi@openreplay.com', type: 'table', updatedAt: daysAgo(47, 11) },
];

export type CardTypeFilter = 'all' | CardType;

export interface CardsState {
  type: CardTypeFilter;
  query: string;
}

export const INITIAL_CARDS_STATE: CardsState = { type: 'all', query: '' };

export const matchesCardQuery = (c: Card, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q);
};

export function filterCards(cards: readonly Card[], state: CardsState): Card[] {
  return cards.filter((c) => (state.type === 'all' || c.type === state.type) && matchesCardQuery(c, state.query));
}

export const cardTypeCounts = (
  cards: readonly Card[],
  query: string,
): { key: CardTypeFilter; label: string; count: number }[] => {
  const inQuery = cards.filter((c) => matchesCardQuery(c, query));
  const types = Array.from(new Set(cards.map((c) => c.type)));
  return [
    { key: 'all', label: 'All types', count: inQuery.length },
    ...types.map((t) => ({
      key: t as CardTypeFilter,
      label: CARD_TYPE_LABELS[t],
      count: inQuery.filter((c) => c.type === t).length,
    })),
  ];
};
