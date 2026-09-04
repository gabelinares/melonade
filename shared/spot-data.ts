/* ═══════════════════════════════════════════════════════════════════════════
   SPOT.

   A short screen recording, captured and shared like a Loom clip. Production
   draws this as a card grid, not a table - the thumbnail IS the scannable
   fact, the way a session's own journey would be if the payload carried one.
   Every other page in this port is a table because Mehdi's own words were
   "tables and stuff"; Spot is the one deliberate exception, because forcing
   a video library into text rows would lose the one thing worth showing.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Spot {
  id: number;
  title: string;
  ownerName: string;
  mine: boolean;
  durationSec: number;
  createdAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const SPOTS: readonly Spot[] = [
  { id: 1, title: 'Checkout bug — cart not clearing', ownerName: 'You', mine: true, durationSec: 42, createdAt: daysAgo(0, 9) },
  { id: 2, title: 'New onboarding flow walkthrough', ownerName: 'Sarah K.', mine: false, durationSec: 118, createdAt: daysAgo(1, 14) },
  { id: 3, title: 'Pricing page A/B — variant B', ownerName: 'You', mine: true, durationSec: 76, createdAt: daysAgo(2, 11) },
  { id: 4, title: 'Mobile nav overlap on iPad', ownerName: 'Mehdi O.', mine: false, durationSec: 29, createdAt: daysAgo(4, 16) },
  { id: 5, title: 'Feature demo — Test Agents', ownerName: 'Nikita M.', mine: false, durationSec: 205, createdAt: daysAgo(6, 10) },
  { id: 6, title: 'Support call follow-up clip', ownerName: 'You', mine: true, durationSec: 63, createdAt: daysAgo(9, 9) },
  { id: 7, title: 'Dashboard load time issue', ownerName: 'Sarah K.', mine: false, durationSec: 51, createdAt: daysAgo(13, 15) },
  { id: 8, title: 'Design review — sidebar redesign', ownerName: 'You', mine: true, durationSec: 340, createdAt: daysAgo(18, 17) },
  { id: 9, title: 'Bug repro — export button disabled', ownerName: 'Mehdi O.', mine: false, durationSec: 34, createdAt: daysAgo(26, 11) },
];

export type SpotScope = 'all' | 'mine';

export interface SpotState {
  scope: SpotScope;
  query: string;
  selected: number[];
}

export const INITIAL_SPOT_STATE: SpotState = { scope: 'all', query: '', selected: [] };

export const matchesSpotQuery = (s: Spot, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || s.title.toLowerCase().includes(q);
};

export function filterSpots(spots: readonly Spot[], state: SpotState): Spot[] {
  return spots.filter((s) => (state.scope === 'all' || s.mine) && matchesSpotQuery(s, state.query));
}

export const spotScopeCounts = (
  spots: readonly Spot[],
  query: string,
): { key: SpotScope; label: string; count: number }[] => {
  const inQuery = spots.filter((s) => matchesSpotQuery(s, query));
  return [
    { key: 'all', label: 'All spots', count: inQuery.length },
    { key: 'mine', label: 'My spots', count: inQuery.filter((s) => s.mine).length },
  ];
};

/** "1:22" — minutes:seconds, the shape a video's own scrubber uses, unlike
 *  the "6m 03s" prose `formatDuration` in sessions-logic.ts prints. */
export const clipDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
