/* ═══════════════════════════════════════════════════════════════════════════
   DATA MANAGEMENT — ACTIVITY.

   The raw event log: every event, in order, with who fired it and where.
   Production's own page is the heaviest in Data Management - draggable
   columns, a show/hide picker, a live new-events badge, two separate filter
   catalogues (event filters and property filters). This round keeps the two
   real questions the log answers - WHICH events, WHEN - as a FilterMenu and
   the shared DateRange, and cuts the column customisation: a stub table with
   a working "hide this column" picker over five fixed columns is a control
   that changes nothing anyone would notice.
   ═══════════════════════════════════════════════════════════════════════════ */

import { DEFAULT_RANGE, withinRange, type DateRangeValue } from './date-range.ts';

export interface ActivityEvent {
  id: number;
  eventName: string;
  autoCaptured: boolean;
  at: number;
  distinctId: string;
  identified: boolean;
  city: string;
  environment: 'production' | 'staging' | 'development';
}

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();
const hoursAgo = (h: number) => NOW - h * HOUR;

export const ACTIVITY: readonly ActivityEvent[] = [
  { id: 1, eventName: 'click', autoCaptured: true, at: hoursAgo(0.05), distinctId: 'ana.ferreira@northwind.com', identified: true, city: 'Lisbon', environment: 'production' },
  { id: 2, eventName: 'checkout_completed', autoCaptured: false, at: hoursAgo(0.3), distinctId: 'luis.moreno@vantage.io', identified: true, city: 'Madrid', environment: 'production' },
  { id: 3, eventName: 'page_view', autoCaptured: true, at: hoursAgo(0.6), distinctId: 'a-8801', identified: false, city: 'Toronto', environment: 'production' },
  { id: 4, eventName: 'rage_click', autoCaptured: true, at: hoursAgo(1.1), distinctId: 'mia.okonkwo@brightline.co', identified: true, city: 'Lagos', environment: 'staging' },
  { id: 5, eventName: 'error', autoCaptured: true, at: hoursAgo(1.4), distinctId: 'a-4f2a', identified: false, city: 'Austin', environment: 'production' },
  { id: 6, eventName: 'signup_completed', autoCaptured: false, at: hoursAgo(2.2), distinctId: 'jon.eriksen@meridian.se', identified: true, city: 'Malmö', environment: 'production' },
  { id: 7, eventName: 'search_performed', autoCaptured: false, at: hoursAgo(3.5), distinctId: 'priya.raman@lattice.in', identified: true, city: 'Bengaluru', environment: 'production' },
  { id: 8, eventName: 'click', autoCaptured: true, at: hoursAgo(4.8), distinctId: 'a-2290', identified: false, city: 'Berlin', environment: 'development' },
  { id: 9, eventName: 'checkout_started', autoCaptured: false, at: hoursAgo(6.2), distinctId: 'tomas.novak@harbourpoint.cz', identified: true, city: 'Brno', environment: 'production' },
  { id: 10, eventName: 'dead_click', autoCaptured: true, at: hoursAgo(9), distinctId: 'sara.haddad@cedarworks.ae', identified: true, city: 'Dubai', environment: 'staging' },
  { id: 11, eventName: 'page_view', autoCaptured: true, at: hoursAgo(14), distinctId: 'elin.saarinen@northwind.com', identified: true, city: 'Helsinki', environment: 'production' },
  { id: 12, eventName: 'trial_started', autoCaptured: false, at: hoursAgo(20), distinctId: 'rafael.souza@lattice.in', identified: true, city: 'São Paulo', environment: 'production' },
  { id: 13, eventName: 'video_played', autoCaptured: true, at: hoursAgo(28), distinctId: 'wei.zhang@brightline.co', identified: true, city: 'Singapore', environment: 'production' },
  { id: 14, eventName: 'invite_sent', autoCaptured: false, at: hoursAgo(40), distinctId: 'noor.hassan@meridian.se', identified: true, city: 'Cairo', environment: 'production' },
  { id: 15, eventName: 'error', autoCaptured: true, at: hoursAgo(55), distinctId: 'a-6674', identified: false, city: 'Amsterdam', environment: 'staging' },
];

export type ActivityFilterKey = 'events' | 'environments';

export interface ActivityFilters {
  events: string[];
  environments: string[];
}

export const NO_ACTIVITY_FILTERS: ActivityFilters = { events: [], environments: [] };

export interface ActivityState {
  query: string;
  range: DateRangeValue;
  filters: ActivityFilters;
}

export const INITIAL_ACTIVITY_STATE: ActivityState = {
  query: '',
  range: DEFAULT_RANGE,
  filters: NO_ACTIVITY_FILTERS,
};

export const matchesActivityQuery = (e: ActivityEvent, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || e.eventName.toLowerCase().includes(q) || e.distinctId.toLowerCase().includes(q);
};

const matchesActivityFilters = (e: ActivityEvent, f: ActivityFilters): boolean =>
  (f.events.length === 0 || f.events.includes(e.eventName)) &&
  (f.environments.length === 0 || f.environments.includes(e.environment));

const inActivityScope = (e: ActivityEvent, state: ActivityState, now: number): boolean =>
  matchesActivityQuery(e, state.query) && withinRange(e.at, state.range, now) && matchesActivityFilters(e, state.filters);

export function filterActivity(
  events: readonly ActivityEvent[],
  state: ActivityState,
  now: number = Date.now(),
): ActivityEvent[] {
  return events.filter((e) => inActivityScope(e, state, now)).sort((a, b) => b.at - a.at);
}

export interface ActivityFilterDimension {
  key: ActivityFilterKey;
  label: string;
  options: { value: string; label: string; count: number }[];
}

export function activityDimensions(
  events: readonly ActivityEvent[],
  state: ActivityState,
  now: number = Date.now(),
): ActivityFilterDimension[] {
  const base = events.filter((e) => matchesActivityQuery(e, state.query) && withinRange(e.at, state.range, now));
  const countWith = (key: ActivityFilterKey, value: string) =>
    base.filter((e) => matchesActivityFilters(e, { ...state.filters, [key]: [value] })).length;

  const eventNames = Array.from(new Set(events.map((e) => e.eventName))).sort();
  const environments = Array.from(new Set(events.map((e) => e.environment))).sort();

  return [
    {
      key: 'events',
      label: 'Event',
      options: eventNames.map((v) => ({ value: v, label: v, count: countWith('events', v) })),
    },
    {
      key: 'environments',
      label: 'Environment',
      options: environments.map((v) => ({ value: v, label: v, count: countWith('environments', v) })),
    },
  ];
}

export const activityFilterCount = (f: ActivityFilters): number => f.events.length + f.environments.length;

export function toggleActivityFilter(f: ActivityFilters, key: ActivityFilterKey, value: string): ActivityFilters {
  const current = f[key];
  return { ...f, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] };
}

export interface ActivityFilterChip {
  key: ActivityFilterKey;
  value: string;
  dimension: string;
  label: string;
}

export function activeActivityFilters(
  events: readonly ActivityEvent[],
  state: ActivityState,
  now: number = Date.now(),
): ActivityFilterChip[] {
  return activityDimensions(events, state, now).flatMap((d) =>
    d.options
      .filter((o) => state.filters[d.key].includes(o.value))
      .map((o) => ({ key: d.key, value: o.value, dimension: d.label, label: o.label })),
  );
}
