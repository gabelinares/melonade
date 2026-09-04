/* ═══════════════════════════════════════════════════════════════════════════
   DATA MANAGEMENT — EVENTS.

   The catalogue of distinct event names the tracker has seen: what fires on
   its own (autocaptured) and what a team named explicitly (custom).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DistinctEvent {
  name: string;
  displayName: string;
  description: string;
  autoCaptured: boolean;
  volume30d: number;
}

export const EVENTS: readonly DistinctEvent[] = [
  { name: 'click', displayName: 'Click', description: 'Any click captured automatically by the tracker.', autoCaptured: true, volume30d: 1284000 },
  { name: 'page_view', displayName: 'Page view', description: 'A page finished loading and was recorded.', autoCaptured: true, volume30d: 842000 },
  { name: 'input_change', displayName: 'Input change', description: 'A form field changed value.', autoCaptured: true, volume30d: 391000 },
  { name: 'signup_completed', displayName: 'Signup completed', description: 'A new account finished the sign-up flow.', autoCaptured: false, volume30d: 4820 },
  { name: 'checkout_started', displayName: 'Checkout started', description: 'A cart moved into checkout.', autoCaptured: false, volume30d: 12400 },
  { name: 'checkout_completed', displayName: 'Checkout completed', description: 'A checkout finished with a successful payment.', autoCaptured: false, volume30d: 8760 },
  { name: 'rage_click', displayName: 'Rage click', description: 'Several rapid clicks on the same element — usually frustration.', autoCaptured: true, volume30d: 21300 },
  { name: 'dead_click', displayName: 'Dead click', description: 'A click on an element with no observable effect.', autoCaptured: true, volume30d: 18900 },
  { name: 'error', displayName: 'JS error', description: 'An uncaught exception in the page.', autoCaptured: true, volume30d: 5640 },
  { name: 'trial_started', displayName: 'Trial started', description: 'A free trial began.', autoCaptured: false, volume30d: 2130 },
  { name: 'invite_sent', displayName: 'Invite sent', description: 'A teammate invite was sent from account settings.', autoCaptured: false, volume30d: 940 },
  { name: 'plan_upgraded', displayName: 'Plan upgraded', description: 'An account moved to a higher plan.', autoCaptured: false, volume30d: 315 },
  { name: 'search_performed', displayName: 'Search performed', description: 'A search query was submitted.', autoCaptured: false, volume30d: 67200 },
  { name: 'video_played', displayName: 'Video played', description: 'A video element started playback.', autoCaptured: true, volume30d: 9870 },
];

export type EventFilter = 'all' | 'autocaptured' | 'custom';

export interface EventsState {
  filter: EventFilter;
  query: string;
}

export const INITIAL_EVENTS_STATE: EventsState = { filter: 'all', query: '' };

export const matchesEventQuery = (e: DistinctEvent, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    e.name.toLowerCase().includes(q) ||
    e.displayName.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q)
  );
};

export function filterEvents(events: readonly DistinctEvent[], state: EventsState): DistinctEvent[] {
  return events.filter(
    (e) =>
      (state.filter === 'all' || (state.filter === 'autocaptured') === e.autoCaptured) &&
      matchesEventQuery(e, state.query),
  );
}

export const eventFilterCounts = (
  events: readonly DistinctEvent[],
  query: string,
): { key: EventFilter; label: string; count: number }[] => {
  const inQuery = events.filter((e) => matchesEventQuery(e, query));
  return [
    { key: 'all', label: 'All events', count: inQuery.length },
    { key: 'autocaptured', label: 'Autocaptured', count: inQuery.filter((e) => e.autoCaptured).length },
    { key: 'custom', label: 'Custom', count: inQuery.filter((e) => !e.autoCaptured).length },
  ];
};

/** "1.3M", "842K" — the same compact form production's own Intl formatter
 *  produces, kept as one function so a volume never gets formatted twice. */
export const formatVolume = (n: number): string =>
  Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(n);
