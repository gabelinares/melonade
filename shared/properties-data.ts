/* ═══════════════════════════════════════════════════════════════════════════
   DATA MANAGEMENT — PROPERTIES.

   Two catalogues sharing one shape: fields captured on a USER (an account
   plan, a role) and fields captured on an EVENT (a checkout's total, a
   search's query). Production draws them as two tabs of the same table, which
   is the one place in this port where a Subitem legitimately grows its own
   in-page tabs - the split is one level BELOW "Properties", the same shape
   CoBrowse's Live/Recordings split is.
   ═══════════════════════════════════════════════════════════════════════════ */

export type PropertyScope = 'user' | 'event';

export interface Property {
  id: string;
  scope: PropertyScope;
  name: string;
  displayName: string;
  description: string;
  hidden: boolean;
  /** #Users for a user property, 30-day volume for an event property - the
   *  page labels the column, this field just carries the number. */
  count: number;
}

export const PROPERTIES: readonly Property[] = [
  { id: 'u-plan', scope: 'user', name: 'plan', displayName: 'Plan', description: 'The account’s current subscription tier.', hidden: false, count: 3120 },
  { id: 'u-role', scope: 'user', name: 'role', displayName: 'Role', description: 'The user’s role within their organisation.', hidden: false, count: 2840 },
  { id: 'u-company', scope: 'user', name: 'company', displayName: 'Company', description: 'Company name, set at sign-up.', hidden: false, count: 2710 },
  { id: 'u-seats', scope: 'user', name: 'seats', displayName: 'Seats', description: 'Number of seats on the account’s plan.', hidden: false, count: 1980 },
  { id: 'u-internal_flag', scope: 'user', name: 'internal_flag', displayName: 'Internal flag', description: 'Marks internal test accounts.', hidden: true, count: 42 },
  { id: 'u-trial_days_left', scope: 'user', name: 'trial_days_left', displayName: 'Trial days left', description: 'Days remaining on an active trial.', hidden: false, count: 620 },
  { id: 'u-locale', scope: 'user', name: 'locale', displayName: 'Locale', description: 'Preferred language and region.', hidden: false, count: 3340 },
  { id: 'u-referrer', scope: 'user', name: 'referrer', displayName: 'Referrer', description: 'How the account first arrived.', hidden: false, count: 2205 },

  { id: 'e-total', scope: 'event', name: 'total', displayName: 'Total', description: 'Order total, in cents.', hidden: false, count: 8760 },
  { id: 'e-query', scope: 'event', name: 'query', displayName: 'Query', description: 'The text a search was submitted with.', hidden: false, count: 67200 },
  { id: 'e-plan_from', scope: 'event', name: 'plan_from', displayName: 'Plan (from)', description: 'The plan an upgrade started from.', hidden: false, count: 315 },
  { id: 'e-plan_to', scope: 'event', name: 'plan_to', displayName: 'Plan (to)', description: 'The plan an upgrade landed on.', hidden: false, count: 315 },
  { id: 'e-error_message', scope: 'event', name: 'error_message', displayName: 'Error message', description: 'The message attached to a JS error.', hidden: false, count: 5640 },
  { id: 'e-video_id', scope: 'event', name: 'video_id', displayName: 'Video ID', description: 'Which video started playback.', hidden: false, count: 9870 },
  { id: 'e-debug_trace', scope: 'event', name: 'debug_trace', displayName: 'Debug trace', description: 'Internal diagnostic payload.', hidden: true, count: 118 },
];

export interface PropertiesState {
  scope: PropertyScope;
  query: string;
  showHidden: boolean;
}

export const INITIAL_PROPERTIES_STATE: PropertiesState = { scope: 'user', query: '', showHidden: false };

export const matchesPropertyQuery = (p: Property, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    p.name.toLowerCase().includes(q) ||
    p.displayName.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
};

export function filterProperties(properties: readonly Property[], state: PropertiesState): Property[] {
  return properties.filter(
    (p) =>
      p.scope === state.scope &&
      (state.showHidden || !p.hidden) &&
      matchesPropertyQuery(p, state.query),
  );
}
