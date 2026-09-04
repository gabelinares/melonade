/* ═══════════════════════════════════════════════════════════════════════════
   COBROWSE.

   Production splits this across two routes - `/assist` (who's live right
   now) and `/recordings` (video captured from a past co-browsing call) - and
   draws the live list by reusing the sessions table's own row component.
   CoBrowse has no menu Subitems (§30: it's one row), so the split becomes an
   in-page Tabs strip, the same shape Properties' User/Event split uses one
   level below ITS Subitem.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LiveSession {
  id: string;
  userId?: string;
  userAnonymousId: string;
  startedAt: number;
  durationSec: number;
  city: string;
  country: string;
}

export interface Recording {
  id: number;
  name: string;
  recordedBy: string;
  recordedAt: number;
}

const NOW = Date.now();
const MIN = 60 * 1000;
const minsAgo = (m: number) => NOW - m * MIN;
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const LIVE_SESSIONS: readonly LiveSession[] = [
  { id: 'l-1', userId: 'ana.ferreira@northwind.com', userAnonymousId: 'a-9f21', startedAt: minsAgo(2), durationSec: 118, city: 'Lisbon', country: 'Portugal' },
  { id: 'l-2', userId: 'luis.moreno@vantage.io', userAnonymousId: 'a-11c8', startedAt: minsAgo(6), durationSec: 340, city: 'Madrid', country: 'Spain' },
  { id: 'l-3', userAnonymousId: 'a-8801', startedAt: minsAgo(9), durationSec: 62, city: 'Toronto', country: 'Canada' },
  { id: 'l-4', userId: 'sara.haddad@cedarworks.ae', userAnonymousId: 'a-6674', startedAt: minsAgo(14), durationSec: 810, city: 'Dubai', country: 'UAE' },
  { id: 'l-5', userAnonymousId: 'a-2290', startedAt: minsAgo(21), durationSec: 45, city: 'Berlin', country: 'Germany' },
];

export const RECORDINGS: readonly Recording[] = [
  { id: 1, name: 'Checkout confusion — Ana F.', recordedBy: 'Sarah K.', recordedAt: daysAgo(1, 14) },
  { id: 2, name: 'Onboarding walkthrough — Luis M.', recordedBy: 'You', recordedAt: daysAgo(3, 11) },
  { id: 3, name: 'Billing dispute call', recordedBy: 'Mehdi O.', recordedAt: daysAgo(6, 16) },
  { id: 4, name: 'Feature request — Sara H.', recordedBy: 'You', recordedAt: daysAgo(11, 9) },
  { id: 5, name: 'Failed payment support', recordedBy: 'Nikita M.', recordedAt: daysAgo(18, 13) },
];

export type CobrowseSection = 'live' | 'recordings';

export type LiveSort = 'startedAt' | 'duration';

export interface CobrowseState {
  section: CobrowseSection;
  sort: LiveSort;
  order: 'asc' | 'desc';
  recordingsQuery: string;
}

export const INITIAL_COBROWSE_STATE: CobrowseState = {
  section: 'live',
  sort: 'startedAt',
  order: 'desc',
  recordingsQuery: '',
};

export function sortLiveSessions(sessions: readonly LiveSession[], sort: LiveSort, order: 'asc' | 'desc'): LiveSession[] {
  const out = [...sessions];
  out.sort((a, b) => {
    const diff = sort === 'startedAt' ? a.startedAt - b.startedAt : a.durationSec - b.durationSec;
    return order === 'asc' ? diff : -diff;
  });
  return out;
}

export const matchesRecordingQuery = (r: Recording, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || r.name.toLowerCase().includes(q);
};

export function filterRecordings(recordings: readonly Recording[], query: string): Recording[] {
  return recordings.filter((r) => matchesRecordingQuery(r, query));
}
