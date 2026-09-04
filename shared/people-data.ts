/* ═══════════════════════════════════════════════════════════════════════════
   DATA MANAGEMENT — PEOPLE.

   The roster identified sessions build up: everyone the tracker or the SDK
   has put a name or an id to. Production's own filter bar and column picker
   are user-property machinery this fixture cannot back honestly, so the page
   keeps only what a name, an id, a place and two dates can answer on their
   own: search and sort.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Person {
  userId: string;
  name?: string;
  city: string;
  country: string;
  lastSeenAt: number;
  createdAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const PEOPLE: readonly Person[] = [
  { userId: 'ana.ferreira@northwind.com', name: 'Ana Ferreira', city: 'Lisbon', country: 'Portugal', lastSeenAt: daysAgo(0, 9), createdAt: daysAgo(210) },
  { userId: 'luis.moreno@vantage.io', name: 'Luis Moreno', city: 'Madrid', country: 'Spain', lastSeenAt: daysAgo(0, 15), createdAt: daysAgo(140) },
  { userId: 'mia.okonkwo@brightline.co', name: 'Mia Okonkwo', city: 'Lagos', country: 'Nigeria', lastSeenAt: daysAgo(1, 11), createdAt: daysAgo(95) },
  { userId: 'jon.eriksen@meridian.se', name: 'Jon Eriksen', city: 'Malmö', country: 'Sweden', lastSeenAt: daysAgo(1, 17), createdAt: daysAgo(310) },
  { userId: 'priya.raman@lattice.in', name: 'Priya Raman', city: 'Bengaluru', country: 'India', lastSeenAt: daysAgo(2, 8), createdAt: daysAgo(60) },
  { userId: 'tomas.novak@harbourpoint.cz', name: 'Tomas Novak', city: 'Brno', country: 'Czechia', lastSeenAt: daysAgo(3, 13), createdAt: daysAgo(180) },
  { userId: 'sara.haddad@cedarworks.ae', name: 'Sara Haddad', city: 'Dubai', country: 'UAE', lastSeenAt: daysAgo(3, 19), createdAt: daysAgo(45) },
  { userId: 'a-8801', city: 'Toronto', country: 'Canada', lastSeenAt: daysAgo(4, 10), createdAt: daysAgo(4, 10) },
  { userId: 'elin.saarinen@northwind.com', name: 'Elin Saarinen', city: 'Helsinki', country: 'Finland', lastSeenAt: daysAgo(5, 14), createdAt: daysAgo(250) },
  { userId: 'a-4f2a', city: 'Austin', country: 'United States', lastSeenAt: daysAgo(6, 9), createdAt: daysAgo(6, 9) },
  { userId: 'rafael.souza@lattice.in', name: 'Rafael Souza', city: 'São Paulo', country: 'Brazil', lastSeenAt: daysAgo(9, 16), createdAt: daysAgo(120) },
  { userId: 'wei.zhang@brightline.co', name: 'Wei Zhang', city: 'Singapore', country: 'Singapore', lastSeenAt: daysAgo(14, 11), createdAt: daysAgo(400) },
  { userId: 'a-2290', city: 'Berlin', country: 'Germany', lastSeenAt: daysAgo(21, 10), createdAt: daysAgo(21, 10) },
  { userId: 'noor.hassan@meridian.se', name: 'Noor Hassan', city: 'Cairo', country: 'Egypt', lastSeenAt: daysAgo(33, 12), createdAt: daysAgo(90) },
];

export interface PeopleState {
  query: string;
}

export const INITIAL_PEOPLE_STATE: PeopleState = { query: '' };

/** A person's name, falling back to their id - the same "identified or
 *  anonymous" grammar the sessions list already reads off `userId`. */
export const personLabel = (p: Person): string => p.name ?? p.userId;

export const matchesPersonQuery = (p: Person, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || personLabel(p).toLowerCase().includes(q) || p.userId.toLowerCase().includes(q);
};

export function filterPeople(people: readonly Person[], state: PeopleState): Person[] {
  return people.filter((p) => matchesPersonQuery(p, state.query));
}
