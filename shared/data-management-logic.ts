/* ══════════════════════════════════════════════════════════════════════════
   WHAT SITS BEHIND A DATA MANAGEMENT ROW (2026-09-14).

   The five list pages shipped on 09-04 with a StubDrawer on every row. This is
   the data those rows open onto, derived from the fixtures that already exist
   rather than invented beside them: an activity event's properties come from
   the PROPERTIES catalogue, a person's timeline is drawn from the EVENTS
   catalogue with the ACTIVITY log's real rows mixed in, a person's sessions
   are the SESSIONS that carry their id. Everything is deterministic on a
   string hash, so the same row opens onto the same detail every time.

   Production's shapes, read out of the code (see DESIGN.md §43):
   `DataManagement/Activity/EventDetailsModal`, `UsersEvents/UserPage`,
   `DataManagement/DataItemPage` (shared by Events and Properties),
   `Tags/TagForm`.
   ══════════════════════════════════════════════════════════════════════════ */

import { ACTIVITY, type ActivityEvent } from './activity-data.ts';
import { EVENTS, type DistinctEvent } from './events-data.ts';
import { PEOPLE, type Person } from './people-data.ts';
import { PROPERTIES, type Property } from './properties-data.ts';
import { SESSIONS, type SessionRow } from './sessions-data.ts';

/* A small stable hash - the same idiom avatar.ts uses for its hue. */
export const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const pick = <T,>(arr: readonly T[], seed: string): T => arr[hashOf(seed) % arr.length]!;

/* ── EVENT PROPERTIES ─────────────────────────────────────────────────────── */

export type PropertyOrigin = 'openreplay' | 'custom';

export interface EventProperty {
  name: string;
  displayName: string;
  value: string;
  origin: PropertyOrigin;
}

/** What the tracker attaches to every event on its own. */
const OPENREPLAY_PROPERTIES: readonly { name: string; displayName: string }[] = [
  { name: 'url', displayName: 'URL' },
  { name: 'page_title', displayName: 'Page title' },
  { name: 'browser', displayName: 'Browser' },
  { name: 'os', displayName: 'OS' },
  { name: 'device_type', displayName: 'Device type' },
  { name: 'country', displayName: 'Country' },
  { name: 'city', displayName: 'City' },
  { name: 'session_id', displayName: 'Session ID' },
  { name: 'sdk_version', displayName: 'SDK version' },
];

/** Which EVENT-scope properties each distinct event carries. The catalogue
 *  (`properties-data.ts`) says what a property is; this says who sends it. */
export const EVENT_PROPERTY_MAP: Readonly<Record<string, readonly string[]>> = {
  page_view: ['referrer', 'locale'],
  click: [],
  input_change: [],
  signup_completed: ['locale', 'referrer'],
  checkout_started: ['total'],
  checkout_completed: ['total', 'referrer'],
  rage_click: [],
  dead_click: [],
  error: ['error_message', 'debug_trace'],
  trial_started: ['locale'],
  invite_sent: [],
  plan_upgraded: ['plan_from', 'plan_to'],
  search_performed: ['query'],
  video_played: ['video_id'],
};

const URLS = ['/checkout', '/pricing', '/dashboard', '/settings/billing', '/onboarding/step-2', '/search', '/videos/launch', '/team'];
const TITLES: Record<string, string> = {
  '/checkout': 'Checkout',
  '/pricing': 'Pricing',
  '/dashboard': 'Dashboard',
  '/settings/billing': 'Billing settings',
  '/onboarding/step-2': 'Onboarding · Step 2',
  '/search': 'Search',
  '/videos/launch': 'Launch video',
  '/team': 'Team',
};
const BROWSERS = ['Chrome 128', 'Safari 17.6', 'Firefox 130', 'Edge 128'];
const OSES = ['macOS 14', 'Windows 11', 'iOS 17', 'Android 14'];
const PLANS = ['free', 'trial', 'team', 'business'];
const LOCALES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'de-DE'];
const REFERRERS = ['google.com', 'direct', 'producthunt.com', 'twitter.com', 'newsletter'];
const QUERIES = ['export csv', 'invite teammate', 'billing', 'dark mode', 'api key'];
const ERRORS = [
  "TypeError: Cannot read properties of undefined (reading 'total')",
  'ChunkLoadError: Loading chunk 42 failed',
  'NetworkError when attempting to fetch resource',
];

/** A sample value for a catalogue property, stable on the seed. */
export function sampleValue(propName: string, seed: string): string {
  switch (propName) {
    case 'plan': return pick(PLANS, seed + propName);
    case 'plan_from': return pick(PLANS.slice(0, 3), seed + propName);
    case 'plan_to': return pick(PLANS.slice(1), seed + propName);
    case 'role': return pick(['owner', 'admin', 'member', 'viewer'], seed + propName);
    case 'company': return pick(['Northwind', 'Vantage', 'Brightline', 'Meridian', 'Lattice', 'Harbourpoint'], seed + propName);
    case 'seats': return String(2 + (hashOf(seed + propName) % 40));
    case 'internal_flag': return hashOf(seed + propName) % 5 === 0 ? 'true' : 'false';
    case 'trial_days_left': return String(hashOf(seed + propName) % 14);
    case 'locale': return pick(LOCALES, seed + propName);
    case 'referrer': return pick(REFERRERS, seed + propName);
    case 'total': return String(1900 + (hashOf(seed + propName) % 48000));
    case 'query': return pick(QUERIES, seed + propName);
    case 'error_message': return pick(ERRORS, seed + propName);
    case 'video_id': return `vid_${(hashOf(seed + propName) % 9000 + 1000).toString(36)}`;
    case 'debug_trace': return `at render (app.js:${120 + (hashOf(seed) % 900)}:${hashOf(seed + 'c') % 80})`;
    default: return '—';
  }
}

/** Every property an activity row carried, the tracker's first, then yours. */
export function eventPropertiesOf(e: Pick<ActivityEvent, 'id' | 'eventName' | 'city' | 'distinctId'>): EventProperty[] {
  const seed = `${e.id}:${e.distinctId}`;
  const url = pick(URLS, seed);
  const session = sessionForActivity(e);
  const ors: EventProperty[] = [
    { name: 'url', displayName: 'URL', value: `https://app.acme.com${url}`, origin: 'openreplay' },
    { name: 'page_title', displayName: 'Page title', value: TITLES[url] ?? 'Acme', origin: 'openreplay' },
    { name: 'browser', displayName: 'Browser', value: session?.browser ?? pick(BROWSERS, seed), origin: 'openreplay' },
    { name: 'os', displayName: 'OS', value: session?.os ?? pick(OSES, seed), origin: 'openreplay' },
    { name: 'device_type', displayName: 'Device type', value: session?.deviceType ?? 'desktop', origin: 'openreplay' },
    { name: 'country', displayName: 'Country', value: session?.country ?? 'Portugal', origin: 'openreplay' },
    { name: 'city', displayName: 'City', value: e.city, origin: 'openreplay' },
    { name: 'session_id', displayName: 'Session ID', value: session?.sessionId ?? '—', origin: 'openreplay' },
    { name: 'sdk_version', displayName: 'SDK version', value: '16.1.0', origin: 'openreplay' },
  ];
  const custom = (EVENT_PROPERTY_MAP[e.eventName] ?? []).map((name): EventProperty => {
    const def = PROPERTIES.find((p) => p.scope === 'event' && p.name === name);
    return { name, displayName: def?.displayName ?? name, value: sampleValue(name, seed), origin: 'custom' };
  });
  return [...ors, ...custom];
}

export const OPENREPLAY_PROPERTY_NAMES: readonly string[] = OPENREPLAY_PROPERTIES.map((p) => p.name);

/** The catalogue rows an event's page lists under "Event properties". */
export function propertiesOfEvent(eventName: string): Property[] {
  const names = EVENT_PROPERTY_MAP[eventName] ?? [];
  return PROPERTIES.filter((p) => p.scope === 'event' && names.includes(p.name));
}

/** The reverse: which distinct events send this event property. */
export function eventsWithProperty(propName: string): DistinctEvent[] {
  return EVENTS.filter((e) => (EVENT_PROPERTY_MAP[e.name] ?? []).includes(propName));
}

/** Which people carry this user property - a stable subset sized to the
 *  catalogue's own count, so a property "on 2,140 users" shows more names
 *  than one on 315. */
export function usersWithProperty(p: Property): Person[] {
  if (p.scope !== 'user') return [];
  const share = Math.max(0.2, Math.min(1, p.count / 3000));
  return PEOPLE.filter((u) => (hashOf(u.userId + p.name) % 100) / 100 < share);
}

export type PropertyType = 'string' | 'number' | 'boolean';
export function propertyTypeOf(p: Property): PropertyType {
  if (['seats', 'trial_days_left', 'total'].includes(p.name)) return 'number';
  if (p.name === 'internal_flag') return 'boolean';
  return 'string';
}

/* ── A PERSON ─────────────────────────────────────────────────────────────── */

export interface PersonProperty {
  name: string;
  value: string;
  /** The flat fields the tracker set (name, email, location) and the custom
   *  ones you set are both editable in production's drawer. */
  origin: PropertyOrigin;
}

const splitName = (p: Person): [string, string] => {
  const n = p.name ?? '';
  const i = n.lastIndexOf(' ');
  return i < 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 1)];
};

/** Everything production's "All User Properties" drawer merges: the flat
 *  identity fields, then the user-scope catalogue with a sample value each. */
export function personPropertiesOf(p: Person): PersonProperty[] {
  const [first, last] = splitName(p);
  const flat: PersonProperty[] = [
    { name: 'name', value: p.name ?? '', origin: 'openreplay' },
    { name: 'first_name', value: first, origin: 'openreplay' },
    { name: 'last_name', value: last, origin: 'openreplay' },
    { name: 'email', value: p.userId.includes('@') ? p.userId : '', origin: 'openreplay' },
    { name: 'city', value: p.city, origin: 'openreplay' },
    { name: 'country', value: p.country, origin: 'openreplay' },
  ];
  const custom = PROPERTIES.filter((x) => x.scope === 'user' && !x.hidden).map(
    (x): PersonProperty => ({ name: x.name, value: sampleValue(x.name, p.userId), origin: 'custom' }),
  );
  return [...flat, ...custom];
}

/** The tracking ids production lists under "Tracking IDs linked to this
 *  user": the user id, plus the anonymous ids of their sessions. */
export function trackingIdsOf(p: Person): string[] {
  const anon = sessionsOfPerson(p.userId).map((s) => s.userAnonymousId);
  return [p.userId, ...Array.from(new Set(anon))];
}

export const sessionsOfPerson = (userId: string): SessionRow[] =>
  SESSIONS.filter((s) => s.userId === userId);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A person's timeline: the ACTIVITY rows that are really theirs, plus a
 *  generated fortnight of the ordinary traffic every identified user leaves -
 *  page views and clicks mostly, the named events now and then. Sixteen real
 *  rows across fifteen people would otherwise make a timeline one line long. */
export function personEvents(p: Person, now = Date.now()): ActivityEvent[] {
  const real = ACTIVITY.filter((e) => e.distinctId === p.userId);
  const weighted: string[] = [
    'page_view', 'page_view', 'page_view', 'click', 'click', 'click', 'input_change',
    'search_performed', 'video_played', 'checkout_started', 'error', 'invite_sent', 'plan_upgraded', 'dead_click',
  ];
  const n = 18 + (hashOf(p.userId) % 14);
  const generated: ActivityEvent[] = Array.from({ length: n }, (_, i) => {
    const seed = `${p.userId}:${i}`;
    const name = pick(weighted, seed);
    const def = EVENTS.find((e) => e.name === name);
    const spread = Math.min(14 * DAY, now - p.createdAt);
    return {
      id: 100_000 + (hashOf(seed) % 900_000),
      eventName: name,
      autoCaptured: def?.autoCaptured ?? true,
      at: now - (hashOf(seed + 't') % Math.max(HOUR, spread)),
      distinctId: p.userId,
      identified: true,
      city: p.city,
      environment: hashOf(seed + 'env') % 9 === 0 ? 'staging' : 'production',
    };
  });
  return [...real, ...generated].sort((a, b) => b.at - a.at);
}

export interface DayGroup {
  key: string;
  label: string;
  events: ActivityEvent[];
}

/** Grouped by calendar day, newest first, labelled the way production does
 *  ("Sep 14, 2026") with Today and Yesterday said in words. */
export function groupByDay(events: readonly ActivityEvent[], now = Date.now()): DayGroup[] {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dayKey = (t: number) => new Date(t).toDateString();
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  const groups = new Map<string, DayGroup>();
  for (const e of events) {
    const key = dayKey(e.at);
    if (!groups.has(key)) {
      const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : fmt.format(new Date(e.at));
      groups.set(key, { key, label, events: [] });
    }
    groups.get(key)!.events.push(e);
  }
  return Array.from(groups.values());
}

/** The session an activity row happened in. An identified id resolves to one
 *  of that person's real sessions; an anonymous one to a stable pick. */
export function sessionForActivity(e: Pick<ActivityEvent, 'id' | 'distinctId'>): SessionRow | null {
  if (SESSIONS.length === 0) return null;
  const mine = SESSIONS.filter((s) => s.userId === e.distinctId || s.userAnonymousId === e.distinctId);
  const pool = mine.length ? mine : SESSIONS;
  return pool[hashOf(`${e.id}:${e.distinctId}`) % pool.length] ?? null;
}

export const displayNameOfEvent = (name: string): string =>
  EVENTS.find((e) => e.name === name)?.displayName ?? name;

export const formatClock = (t: number): string =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(t));

/** The sessions catalogue names events its own way (`checkout_start`, not
 *  `checkout_started`; `location`, not `page_view`). This is the bridge an
 *  event page's "Play sessions" crosses; null means the catalogue has no such
 *  event and the jump lands on an unfiltered list. */
export const CATALOGUE_ID_BY_EVENT: Readonly<Record<string, string | null>> = {
  page_view: 'location',
  click: 'click',
  input_change: 'input',
  signup_completed: 'signup_submitted',
  checkout_started: 'checkout_start',
  checkout_completed: 'checkout_complete',
  rage_click: 'rageclick',
  dead_click: 'deadclick',
  error: 'error',
  trial_started: null,
  invite_sent: 'invite_sent',
  plan_upgraded: 'plan_upgraded',
  search_performed: 'search_performed',
  video_played: null,
};
