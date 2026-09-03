/* ═══════════════════════════════════════════════════════════════════════════
   SESSIONS, as data — and THE FILTER CATALOGUE, as the backend actually
   returns it.

   Two fixtures in one file because they are one contract. Every field on
   `SessionRow` is a field the real list payload already carries (read out of
   `SessionItem`'s own props on 2026-09-02), and every entry in `CATALOGUE` is
   shaped the way `filterStore.processFilterResponse` shapes what comes back
   from `filterService.fetchFilters(projectId)`. The redesign is allowed to
   rearrange, rename and re-draw all of it; it is NOT allowed to need a field
   that is not here. See context/sessions-feature-inventory-2026-09-02.md.

   ⚠ NOTHING HERE USES Math.random OR Date.now, and that is a rule rather than
   a habit — same as replay.ts. A list that reshuffles between renders cannot be
   screenshotted, reviewed, or diffed against the version Mehdi looked at.
   Ages are integer MINUTES AGO, the way issues-data states `seenAgoMin`, so
   the fixture is a fact and the clock is the app's problem.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── the session ──────────────────────────────────────────────────────────── */

export type Plan = 'paid' | 'trial' | 'free';

/** The issue types the list payload tags a session with. Production's own set
 *  (`Types/session/issue`) minus `mouse_thrashing`, which production hides.
 *
 *  ⚠ `click_rage` AND `tap_rage` are both here, and they are the same
 *  behaviour on two kinds of device - production platform-gates the two so a
 *  web project only ever sees one. `rageType()` below assigns by device, so a
 *  phone's rage is a tap and a desktop's is a click. That matters because the
 *  issue-type strip offers both tabs: this fixture is one project holding
 *  desktop and mobile together, and a tab that can never match anything reads
 *  as broken rather than as empty. */
export type IssueType =
  | 'js_exception'
  | 'bad_request'
  | 'click_rage'
  | 'tap_rage'
  | 'crash'
  | 'incident';

/** Rage, by device. See the note on IssueType. */
const rageType = (deviceType: string): IssueType =>
  deviceType === 'desktop' ? 'click_rage' : 'tap_rage';

/** A generated set, with its rage put on the right device. */
const forDevice = (types: readonly IssueType[], deviceType: string): IssueType[] =>
  types.map((t) => (t === 'click_rage' ? rageType(deviceType) : t));

export interface SessionRow {
  sessionId: string;
  /** Present on identified sessions. Absent means anonymous, and the row shows
   *  the anonymous id instead — which is the one thing the production card
   *  changes colour for, so it is a real distinction and not a nicety. */
  userId?: string;
  userAnonymousId: string;
  /** What the row prints. Derived in production; a field here so the fixture
   *  can hold both identified and anonymous shapes without a helper. */
  displayName: string;
  /** Seeds the avatar. Deterministic in production too (`userNumericHash`). */
  numericHash: number;

  /** Minutes since the session started. The clock is the app's. */
  startedAgoMin: number;
  /** Seconds. Formatted by the app, because "6m 03s" is a design decision. */
  durationSec: number;

  eventsCount: number;
  /** In the payload and NOT on the production card. The Display menu can now
   *  put it on a column, which is most of what this redesign buys. */
  errorsCount: number;
  pagesCount: number;

  /** Whether anybody has opened this replay yet. Drives the row's dot. */
  viewed: boolean;
  favorite: boolean;

  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  country: string;
  countryCode: string;
  city: string;

  /** The project's custom fields. Clickable in production: clicking one adds
   *  it to the search as a filter, which is the single best affordance on the
   *  card today and the one the redesign has to keep. */
  metadata: Record<string, string>;

  issueTypes: IssueType[];

  /** Live sessions get a running clock instead of a duration. */
  live: boolean;
  plan: Plan;
}

/* ── the fixture ──────────────────────────────────────────────────────────────
   134 sessions, because three of three proves nothing: the same reason the
   Atrium prototype carries a hundred and thirty. A list that only ever holds a
   handful cannot show what pagination, sorting, an empty filter result or a
   column of tabular figures actually look like.

   THE FIRST TWELVE ARE WRITTEN BY HAND. They are the ones any screenshot lands
   on, so they carry the shapes that have to be visible at a glance: identified
   and anonymous, viewed and not, errors and none, live, bookmarked, mobile,
   a session with no metadata, and the longest and shortest durations. The rest
   are derived from them by a pure generator below - a fixture, not a demo.
   ──────────────────────────────────────────────────────────────────────────── */

const LEAD: SessionRow[] = [
  {
    sessionId: '7f3a91c2',
    userId: 'u-4021',
    userAnonymousId: 'a-9f21',
    displayName: 'ana.ferreira@northwind.com',
    numericHash: 4021,
    startedAgoMin: 7,
    durationSec: 363,
    eventsCount: 47,
    errorsCount: 3,
    pagesCount: 5,
    viewed: false,
    favorite: false,
    browser: 'Chrome',
    os: 'macOS',
    deviceType: 'desktop',
    country: 'France',
    countryCode: 'FR',
    city: 'Lyon',
    metadata: { plan: 'paid', cohort: 'beta', accountId: 'acc-1188' },
    issueTypes: ['bad_request', 'click_rage'],  // desktop lead
    live: false,
    plan: 'paid',
  },
  {
    sessionId: '2c18de40',
    userAnonymousId: 'a-4f2a',
    displayName: 'a-4f2a',
    numericHash: 1902,
    startedAgoMin: 13,
    durationSec: 80,
    eventsCount: 12,
    errorsCount: 0,
    pagesCount: 2,
    viewed: true,
    favorite: false,
    browser: 'Safari',
    os: 'iOS',
    deviceType: 'mobile',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Hamburg',
    metadata: {},
    issueTypes: [],
    live: false,
    plan: 'free',
  },
  {
    sessionId: 'b9042a77',
    userId: 'u-1187',
    userAnonymousId: 'a-11c8',
    displayName: 'luis.moreno@vantage.io',
    numericHash: 1187,
    startedAgoMin: 21,
    durationSec: 721,
    eventsCount: 88,
    errorsCount: 11,
    pagesCount: 9,
    viewed: false,
    favorite: true,
    browser: 'Chrome',
    os: 'Windows',
    deviceType: 'desktop',
    country: 'Brazil',
    countryCode: 'BR',
    city: 'São Paulo',
    metadata: { plan: 'paid', cohort: 'ga', accountId: 'acc-0042' },
    issueTypes: ['js_exception', 'crash'],
    live: false,
    plan: 'paid',
  },
  {
    sessionId: '55e1b309',
    userId: 'u-7734',
    userAnonymousId: 'a-7734',
    displayName: 'mia.okonkwo@brightline.co',
    numericHash: 7734,
    startedAgoMin: 2,
    durationSec: 250,
    eventsCount: 31,
    errorsCount: 0,
    pagesCount: 4,
    viewed: false,
    favorite: false,
    browser: 'Firefox',
    os: 'Linux',
    deviceType: 'desktop',
    country: 'Nigeria',
    countryCode: 'NG',
    city: 'Lagos',
    metadata: { plan: 'trial', cohort: 'beta' },
    issueTypes: [],
    live: true,
    plan: 'trial',
  },
  {
    sessionId: 'e6720b14',
    userAnonymousId: 'a-8801',
    displayName: 'a-8801',
    numericHash: 8801,
    startedAgoMin: 38,
    durationSec: 48,
    eventsCount: 9,
    errorsCount: 1,
    pagesCount: 1,
    viewed: true,
    favorite: false,
    browser: 'Edge',
    os: 'Windows',
    deviceType: 'desktop',
    country: 'Poland',
    countryCode: 'PL',
    city: 'Kraków',
    metadata: { plan: 'free' },
    issueTypes: ['js_exception'],
    live: false,
    plan: 'free',
  },
  {
    sessionId: '1a4c8f52',
    userId: 'u-2290',
    userAnonymousId: 'a-2290',
    displayName: 'jon.eriksen@meridian.se',
    numericHash: 2290,
    startedAgoMin: 54,
    durationSec: 1442,
    eventsCount: 174,
    errorsCount: 6,
    pagesCount: 22,
    viewed: false,
    favorite: false,
    browser: 'Chrome',
    os: 'macOS',
    deviceType: 'desktop',
    country: 'Sweden',
    countryCode: 'SE',
    city: 'Malmö',
    metadata: { plan: 'paid', cohort: 'ga', accountId: 'acc-3310' },
    issueTypes: ['click_rage'],
    live: false,
    plan: 'paid',
  },
  {
    sessionId: '9d31e7ab',
    userId: 'u-5512',
    userAnonymousId: 'a-5512',
    displayName: 'priya.raman@lattice.in',
    numericHash: 5512,
    startedAgoMin: 71,
    durationSec: 196,
    eventsCount: 24,
    errorsCount: 0,
    pagesCount: 3,
    viewed: true,
    favorite: false,
    browser: 'Chrome',
    os: 'Android',
    deviceType: 'mobile',
    country: 'India',
    countryCode: 'IN',
    city: 'Pune',
    metadata: { plan: 'trial', cohort: 'beta' },
    issueTypes: ['bad_request'],
    live: false,
    plan: 'trial',
  },
  {
    sessionId: '3b8005cd',
    userAnonymousId: 'a-6674',
    displayName: 'a-6674',
    numericHash: 6674,
    startedAgoMin: 96,
    durationSec: 615,
    eventsCount: 63,
    errorsCount: 2,
    pagesCount: 7,
    viewed: true,
    favorite: false,
    browser: 'Safari',
    os: 'macOS',
    deviceType: 'desktop',
    country: 'Spain',
    countryCode: 'ES',
    city: 'Valencia',
    metadata: { plan: 'free', cohort: 'ga' },
    issueTypes: ['incident'],
    live: false,
    plan: 'free',
  },
  {
    sessionId: 'c40f2e68',
    userId: 'u-9903',
    userAnonymousId: 'a-9903',
    displayName: 'tomas.novak@harbourpoint.cz',
    numericHash: 9903,
    startedAgoMin: 128,
    durationSec: 92,
    eventsCount: 14,
    errorsCount: 4,
    pagesCount: 2,
    viewed: false,
    favorite: true,
    browser: 'Chrome',
    os: 'Windows',
    deviceType: 'desktop',
    country: 'Czechia',
    countryCode: 'CZ',
    city: 'Brno',
    metadata: { plan: 'paid', accountId: 'acc-7781' },
    issueTypes: ['js_exception', 'bad_request'],
    live: false,
    plan: 'paid',
  },
  {
    sessionId: '82ba17f9',
    userId: 'u-3348',
    userAnonymousId: 'a-3348',
    displayName: 'sara.haddad@cedarworks.ae',
    numericHash: 3348,
    startedAgoMin: 163,
    durationSec: 431,
    eventsCount: 52,
    errorsCount: 0,
    pagesCount: 6,
    viewed: true,
    favorite: false,
    browser: 'Safari',
    os: 'iPadOS',
    deviceType: 'tablet',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    city: 'Dubai',
    metadata: { plan: 'paid', cohort: 'ga', accountId: 'acc-2204' },
    issueTypes: [],
    live: false,
    plan: 'paid',
  },
  {
    sessionId: 'd7c93041',
    userAnonymousId: 'a-1450',
    displayName: 'a-1450',
    numericHash: 1450,
    startedAgoMin: 214,
    durationSec: 27,
    eventsCount: 4,
    errorsCount: 0,
    pagesCount: 1,
    viewed: true,
    favorite: false,
    browser: 'Chrome',
    os: 'Android',
    deviceType: 'mobile',
    country: 'Indonesia',
    countryCode: 'ID',
    city: 'Bandung',
    metadata: {},
    issueTypes: [],
    live: false,
    plan: 'free',
  },
  {
    sessionId: '46e8a2b5',
    userId: 'u-6120',
    userAnonymousId: 'a-6120',
    displayName: 'chloe.dubois@atlasgrid.fr',
    numericHash: 6120,
    startedAgoMin: 287,
    durationSec: 968,
    eventsCount: 119,
    errorsCount: 17,
    pagesCount: 13,
    viewed: false,
    favorite: false,
    browser: 'Firefox',
    os: 'macOS',
    deviceType: 'desktop',
    country: 'France',
    countryCode: 'FR',
    city: 'Paris',
    metadata: { plan: 'paid', cohort: 'beta', accountId: 'acc-1188' },
    issueTypes: ['crash', 'click_rage', 'js_exception'],
    live: false,
    plan: 'paid',
  },
];

/* ── the tail ────────────────────────────────────────────────────────────────
   Derived, deterministically, from the twelve above. Each derived session takes
   a lead session's shape and walks its numbers by a fixed offset, so the tail
   has the same spread as the head and the same session is the same session on
   every render.

   The arithmetic is a linear congruence rather than a hash: it is short, it has
   no dependency, and the only property required of it is that consecutive
   indices do not produce consecutive-looking rows. */
const PLACES: ReadonlyArray<[string, string, string]> = [
  ['France', 'FR', 'Lyon'],
  ['Germany', 'DE', 'Berlin'],
  ['Brazil', 'BR', 'Recife'],
  ['United States', 'US', 'Austin'],
  ['Japan', 'JP', 'Osaka'],
  ['United Kingdom', 'GB', 'Leeds'],
  ['Canada', 'CA', 'Montréal'],
  ['Australia', 'AU', 'Perth'],
  ['Mexico', 'MX', 'Guadalajara'],
  ['Netherlands', 'NL', 'Utrecht'],
  ['Portugal', 'PT', 'Porto'],
  ['Kenya', 'KE', 'Nairobi'],
];

const NAMES: readonly string[] = [
  'ada.stone@northwind.com',
  'ravi.patel@vantage.io',
  'nina.berg@meridian.se',
  'omar.said@cedarworks.ae',
  'kate.lynch@brightline.co',
  'yuki.tanaka@atlasgrid.jp',
  'pedro.silva@harbourpoint.br',
  'lena.hoff@lattice.de',
];

const BROWSERS: ReadonlyArray<[string, string, SessionRow['deviceType']]> = [
  ['Chrome', 'macOS', 'desktop'],
  ['Chrome', 'Windows', 'desktop'],
  ['Safari', 'iOS', 'mobile'],
  ['Firefox', 'Linux', 'desktop'],
  ['Edge', 'Windows', 'desktop'],
  ['Chrome', 'Android', 'mobile'],
  ['Safari', 'macOS', 'desktop'],
  ['Safari', 'iPadOS', 'tablet'],
];

/* ⚠ INDEXED WITH `i * 4`, NOT `i * 3`, and the difference is nine sets against
   three. `gcd(3, 9) = 3`, so `(i * 3) % 9` only ever reached indices 0, 3 and
   6 - `[]`, `['bad_request']`, `['crash']` - and SIX OF THESE NINE SETS WERE
   DEAD CODE from the day the fixture was written. Every `click_rage` set was
   among them, which is why the issue-type strip came back reading "Click Rage
   3" (the three hand-written leads) and "Tap Rage 0".

   The stride has to be COPRIME WITH THE LENGTH to walk the whole list; 4 is.
   ⚠ And this was invisible until 2026-09-02, because nothing had ever drawn a
   count per issue type - the errors column showed a number per session and the
   strip shows a number per KIND. A fixture defect is only as visible as the
   least aggregated view of it. */
const ISSUE_SETS: ReadonlyArray<IssueType[]> = [
  [],
  [],
  ['js_exception'],
  ['bad_request'],
  ['click_rage'],
  ['js_exception', 'bad_request'],
  ['crash'],
  ['incident'],
  [],
];

const TOTAL = 134;

function derive(i: number): SessionRow {
  const lead = LEAD[i % LEAD.length]!;
  /* one multiplication and one modulo, and the only thing asked of it is that
     neighbouring rows do not look sequential */
  const n = (i * 37 + 11) % 97;
  const [country, countryCode, city] = PLACES[(i * 5 + 3) % PLACES.length]!;
  const [browser, os, deviceType] = BROWSERS[(i * 3 + 1) % BROWSERS.length]!;
  const identified = n % 3 !== 0;
  /* PER SESSION, and it stays per session: this is what names an anonymous
     visitor, and two anonymous visits are two visitors as far as this list can
     tell. */
  const sessionHash = 1000 + ((i * 613 + 77) % 8999);
  const anon = `a-${sessionHash.toString(16).padStart(4, '0')}`;

  /* ── WHICH PERSON, CHOSEN ONCE ─────────────────────────────────────────
     ⚠ THE IDENTITY USED TO BE TWO INDEPENDENT DERIVATIONS: the name came from
     `(i * 7 + 2) % 8` and the id from `1000 + (i * 613 + 77) % 8999`, one per
     person and one per session. So `ada.stone@northwind.com` appeared on
     eleven rows carrying eleven different user ids, and filtering to that
     person gave eleven different people. Nothing rendered the id, which is the
     only reason it survived this long - the moment the avatar seeds on it, the
     same person has eleven faces.

     One person, one id, one hash, one avatar. */
  const person = (i * 7 + 2) % NAMES.length;
  const name = NAMES[person]!;
  const userHash = 1000 + ((person * 1373 + 401) % 8999);
  const events = 4 + ((i * 17 + n) % 180);
  /* errors are RARE and clustered, which is the only honest shape for them: a
     column of "3 errors" on every row says nothing, and a filter on errors > 0
     that matches everything is not a filter. */
  const errors = n % 4 === 0 ? (n % 19) : 0;

  return {
    sessionId: `s${(i * 2654435761 % 4294967296).toString(16).slice(0, 8).padStart(8, '0')}`,
    userId: identified ? `u-${userHash}` : undefined,
    userAnonymousId: anon,
    displayName: identified ? name : anon,
    /* What the avatar is seeded on, so it follows whichever identity the row
       actually has: the person if there is one, the anonymous visitor if not. */
    numericHash: identified ? userHash : sessionHash,
    /* Ordered oldest-last, in a widening spread: the newest sessions are
       minutes apart and the oldest are weeks, which is what a list sorted by
       time actually looks like.

       ⚠ THE CURVE REACHES SIXTY DAYS, and that is a requirement rather than a
       flourish. Until 2026-09-02 it topped out at THREE AND A HALF, so every
       preset on the date control - 7 days, 30 days, 90 days - returned the
       identical 134 rows and the only way to tell was to count them. A control
       that cannot change anything is worse than a missing one: it teaches
       people the filter is broken. The exponent leaves roughly a quarter of the
       list inside a day and three quarters inside a month, which is the shape
       of real traffic and gives every preset a different answer. */
    startedAgoMin: 3 + Math.round(Math.pow(i / (TOTAL - 1), 3.1) * 60 * 1440),
    durationSec: 18 + ((i * 53 + n * 7) % 1500),
    eventsCount: events,
    errorsCount: errors,
    pagesCount: 1 + (events % 18),
    viewed: n % 5 !== 0,
    favorite: n % 23 === 0,
    browser,
    os,
    deviceType,
    country,
    countryCode,
    city,
    metadata: identified
      ? {
          plan: lead.plan,
          cohort: n % 2 === 0 ? 'ga' : 'beta',
          accountId: `acc-${1000 + (n * 41) % 8999}`,
        }
      : n % 7 === 0
        ? {}
        : { plan: 'free' },
    issueTypes: forDevice(
      errors > 0
        ? (ISSUE_SETS[(i * 4) % ISSUE_SETS.length]!.length
            ? ISSUE_SETS[(i * 4) % ISSUE_SETS.length]!
            : ['js_exception'])
        : ISSUE_SETS[(i * 4) % ISSUE_SETS.length]!.filter((t) => t === 'click_rage' || t === 'incident'),
      deviceType,
    ),
    live: false,
    plan: lead.plan,
  };
}

export const SESSIONS: readonly SessionRow[] = [
  ...LEAD,
  ...Array.from({ length: TOTAL - LEAD.length }, (_, k) => derive(k + LEAD.length)),
];

/** The bookmarked subset, which is the Vault tab's whole source. Derived rather
 *  than a second list, so a session cannot be bookmarked in one place and not
 *  the other. */
export const bookmarked = (rows: readonly SessionRow[] = SESSIONS) => rows.filter((s) => s.favorite);

/* ── THE FILTER CATALOGUE ─────────────────────────────────────────────────────
   Shaped the way the backend returns it and the way `processFilterResponse`
   reshapes it: a flat list of entries, each carrying `isEvent`, a `category`
   the picker groups by, and a `dataType` the operator set comes from.

   The four category kinds the production store special-cases are all here,
   because each behaves differently and the redesign has to keep all four
   behaviours:

     auto_captured  → "Autocapture"   events the tracker records by itself
     user_events    → "Events"        events the customer sends
     features       → "Features"      a feature flag, sent as TAG_TRIGGER
     segments       → "Segments"      a SAVED SEARCH, used as one event
                                      ⚠ no sub-properties, and it disables
                                        saving the search it appears in
   plus the property categories, which are anything else the API returns.
   ──────────────────────────────────────────────────────────────────────────── */

export type DataType = 'string' | 'number' | 'boolean' | 'duration' | 'array';

export interface CatalogueEntry {
  /** The API's own id. Stable, and what a saved search stores. */
  id: string;
  /** The backend key. `TAG_TRIGGER` for a feature, the segment's own name for a
   *  segment, `duration` for the special-cased duration filter. */
  name: string;
  displayName: string;
  /** Grouped by this in the picker. The label comes from `CATEGORY_LABELS`. */
  category: string;
  isEvent: boolean;
  dataType: DataType;
  /** An event whose properties can be filtered. False on segments and
   *  features, which is a rule in production, not an accident. */
  hasProperties?: boolean;
  /** The `duration` filter gets its own operator set. */
  autoCaptured?: boolean;
  /** Some values are a closed set, so the value field is a select rather than
   *  a free text box with autocomplete. */
  options?: readonly string[];
  /** Shown under the name in the picker. The production picker has room for
   *  this and prints nothing. */
  hint?: string;
}

/** The display name for a category key. `processFilterResponse` renames two of
 *  these on the way through; the rest are capitalised. */
export const CATEGORY_LABELS: Record<string, string> = {
  auto_captured: 'Autocapture',
  user_events: 'Events',
  features: 'Features',
  segments: 'Segments',
  user: 'User',
  session: 'Session',
  technology: 'Technology',
  geography: 'Geography',
  metadata: 'Metadata',
};

/** Which categories the picker lists first. Autocapture leads because it is
 *  what a project has without doing any work. */
export const CATEGORY_ORDER: readonly string[] = [
  'auto_captured',
  'user_events',
  'features',
  'segments',
  'user',
  'session',
  'technology',
  'geography',
  'metadata',
];

const ev = (
  id: string,
  displayName: string,
  category: string,
  extra: Partial<CatalogueEntry> = {},
): CatalogueEntry => ({
  id,
  name: id,
  displayName,
  category,
  isEvent: true,
  dataType: 'string',
  hasProperties: true,
  ...extra,
});

const prop = (
  id: string,
  displayName: string,
  category: string,
  dataType: DataType = 'string',
  extra: Partial<CatalogueEntry> = {},
): CatalogueEntry => ({
  id,
  name: id,
  displayName,
  category,
  isEvent: false,
  dataType,
  ...extra,
});

/* ── THE STORE'S OWN SHAPES ───────────────────────────────────────────────────
   ⚠ These three moved here from `sessions-logic.ts` on 2026-09-02, and logic
   re-exports them so nothing else changed. They belong here for the same
   reason `SessionRow` does: they are what `searchStore.instance` holds, and
   this file's job is the API's shapes. What forced the move is a good sign
   rather than a bad one - A SAVED SEGMENT NOW CARRIES ITS OWN RULES, and a
   segment is a fixture, so the fixture file needs the type of a rule.
   ──────────────────────────────────────────────────────────────────────────── */

export type EventsOrder = 'then' | 'and' | 'or';
export type PropertyOrder = 'and' | 'or';

export interface SearchFilter {
  /** A row's own identity. Two rows can sit on the same catalogue entry - two
   *  Clicks in a sequence is the normal case - so the entry id cannot be the
   *  key. */
  key: string;
  entryId: string;
  isEvent: boolean;
  operator: string;
  /** Always an array, as in production, even for a single value. */
  value: string[];
  /** Duration only: seconds. Kept apart from `value` because the backend takes
   *  a pair, not a list. */
  min?: number;
  max?: number;
  /** An event's properties. Absent on properties themselves - the nesting is
   *  one level deep in production and there is no reason to model two. */
  properties?: SearchFilter[];
  /** One value per event, as in production: the word between an event's own
   *  properties, toggled by clicking it. */
  propertyOrder?: PropertyOrder;
}

/* ── SAVED SEGMENTS ───────────────────────────────────────────────────────────
   ⚠ A SEGMENT IS ONE SAVED SEARCH, and as of 2026-09-02 it says so in the
   data (Mehdi: "remember, the segment is just one saved search so the design
   should be really consistent").

   It used to be a name and two booleans, and its RULES lived in a hardcoded
   `inSegment()` switch in sessions-logic - four `case` arms saying, in
   TypeScript, what a segment is supposed to hold as data. So the one thing a
   segment IS was the one thing you could not read, edit or show. That switch is
   gone: `filters` and `eventsOrder` here are the same two fields the live
   search holds, they are evaluated by the same functions, and they are drawn by
   the same rows.

   THE RULES BELOW SAY WHAT EACH SEGMENT'S NAME SAYS, which the switch mostly
   did not. "Paid users, checkout" tested `plan === 'paid'` and nothing about
   checkout; it is a sequence and a plan now. That is a deliberate change and
   the reason it is safe: the rules are the segment, so a segment that matched
   something its name did not describe was the old model's bug, not a
   behaviour worth preserving.

   ⚠ KEYS ARE DETERMINISTIC (`seg-118/1`) rather than from `nextFilterKey()`.
   A fixture that renumbered itself per load would make every React key in the
   drawer unstable, and two loads of the same segment would not be equal.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SavedSegment {
  id: string;
  name: string;
  /** Somebody else's segment cannot be overwritten, only used - which is a real
   *  rule in production and the reason Save is sometimes disabled. */
  mine: boolean;
  shared: boolean;
  createdBy: string;
  updatedAt: number;
  /** THE SEARCH IT IS. One array, events and properties together, exactly as
   *  the live search holds it. */
  filters: SearchFilter[];
  eventsOrder: EventsOrder;
}

/** One rule of a segment. `n` only has to be unique inside its own segment. */
const rule = (
  segId: string,
  n: number,
  entryId: string,
  isEvent: boolean,
  operator: string,
  value: string[] = [],
): SearchFilter => ({ key: `${segId}/${n}`, entryId, isEvent, operator, value });

const SEG_DAY = 24 * 60 * 60 * 1000;

export const SAVED_SEGMENTS: readonly SavedSegment[] = [
  {
    id: 'seg-118',
    name: 'Paid users, checkout',
    mine: true,
    shared: true,
    createdBy: 'You',
    updatedAt: Date.now() - 2 * SEG_DAY,
    eventsOrder: 'then',
    filters: [
      rule('seg-118', 1, 'add_to_cart', true, 'is'),
      rule('seg-118', 2, 'checkout_start', true, 'is'),
      rule('seg-118', 3, 'meta.plan', false, 'is', ['paid']),
    ],
  },
  {
    id: 'seg-204',
    name: 'Mobile rage clicks',
    mine: true,
    shared: false,
    createdBy: 'You',
    updatedAt: Date.now() - 5 * SEG_DAY,
    eventsOrder: 'and',
    /* ⚠ THE EVENT, not the issue type. The switch tested `click_rage`, which
       no mobile session in the fixture carries - so once the rules became real
       this segment held nothing at every window, which reads as a broken
       segment rather than as an empty one. On a phone the thing is a TAP, and
       `taprage` is the event the catalogue already offers for it. */
    filters: [
      rule('seg-204', 1, 'taprage', true, 'is'),
      rule('seg-204', 2, 'userDeviceType', false, 'is', ['mobile']),
    ],
  },
  {
    id: 'seg-311',
    name: 'Trials, week one',
    mine: false,
    shared: true,
    createdBy: 'Sarah K.',
    updatedAt: Date.now() - 9 * SEG_DAY,
    eventsOrder: 'and',
    filters: [rule('seg-311', 1, 'meta.plan', false, 'is', ['trial'])],
  },
  {
    id: 'seg-402',
    name: 'Crashes, last 24h',
    mine: false,
    shared: true,
    createdBy: 'Mehdi O.',
    updatedAt: Date.now() - 14 * SEG_DAY,
    eventsOrder: 'and',
    filters: [rule('seg-402', 1, 'issueType', false, 'hasAny', ['crash'])],
  },
  /* Two more than the switch had, because a tab is a list and four rows cannot
     show an ordering, a filter or an owner doing anything. Both are rules the
     evaluator already supports. */
  {
    id: 'seg-503',
    name: 'Slow sessions on Safari',
    mine: true,
    shared: false,
    createdBy: 'You',
    updatedAt: Date.now() - 1 * SEG_DAY,
    eventsOrder: 'and',
    filters: [
      rule('seg-503', 1, 'userBrowser', false, 'is', ['Safari']),
      rule('seg-503', 2, 'errorsCount', false, '>', ['0']),
    ],
  },
  {
    id: 'seg-604',
    name: 'France, never watched',
    mine: false,
    shared: true,
    createdBy: 'Nikita M.',
    updatedAt: Date.now() - 21 * SEG_DAY,
    eventsOrder: 'and',
    filters: [
      rule('seg-604', 1, 'userCountry', false, 'is', ['France']),
      rule('seg-604', 2, 'viewed', false, 'isFalse'),
    ],
  },
];

export const CATALOGUE: readonly CatalogueEntry[] = [
  /* ── autocapture: what the tracker records without being told ── */
  ev('click', 'Click', 'auto_captured', { autoCaptured: true, hint: 'Any click the tracker saw' }),
  ev('input', 'Input', 'auto_captured', { autoCaptured: true }),
  ev('location', 'Page', 'auto_captured', { autoCaptured: true, hint: 'A URL the session reached' }),
  ev('rageclick', 'Rage click', 'auto_captured', { autoCaptured: true }),
  ev('deadclick', 'Dead click', 'auto_captured', { autoCaptured: true }),
  ev('error', 'Error', 'auto_captured', { autoCaptured: true }),
  ev('request', 'Network request', 'auto_captured', { autoCaptured: true }),
  ev('graphql', 'GraphQL', 'auto_captured', { autoCaptured: true }),
  ev('statechange', 'State action', 'auto_captured', { autoCaptured: true }),
  ev('crash', 'Crash', 'auto_captured', { autoCaptured: true }),
  ev('taprage', 'Tap rage', 'auto_captured', { autoCaptured: true }),
  ev('swipe', 'Swipe', 'auto_captured', { autoCaptured: true }),

  /* ── the customer's own events, IN FUNNEL ORDER ──
     The order matters: `sessionEvents` builds a session's event list by
     filtering this catalogue and keeping its order, so this list is also the
     shape of a typical journey. Listed alphabetically, "checkout_complete"
     would come before "add_to_cart" and every THEN sequence anybody tried
     would return nothing. */
  ev('search_performed', 'search_performed', 'user_events'),
  ev('add_to_cart', 'add_to_cart', 'user_events'),
  ev('checkout_start', 'checkout_start', 'user_events'),
  ev('checkout_complete', 'checkout_complete', 'user_events'),
  ev('signup_submitted', 'signup_submitted', 'user_events'),
  ev('plan_upgraded', 'plan_upgraded', 'user_events'),
  ev('invite_sent', 'invite_sent', 'user_events'),
  ev('support_opened', 'support_opened', 'user_events'),

  /* ── feature flags. Sent as TAG_TRIGGER with the flag's id as the value, so
        they carry no properties of their own. ── */
  ev('TAG_TRIGGER:new-checkout', 'new-checkout', 'features', {
    name: 'TAG_TRIGGER',
    hasProperties: false,
    hint: 'Feature flag',
  }),
  ev('TAG_TRIGGER:pricing-v3', 'pricing-v3', 'features', {
    name: 'TAG_TRIGGER',
    hasProperties: false,
    hint: 'Feature flag',
  }),
  ev('TAG_TRIGGER:mobile-nav', 'mobile-nav', 'features', {
    name: 'TAG_TRIGGER',
    hasProperties: false,
    hint: 'Feature flag',
  }),

  /* ── SEGMENTS. A saved search used as one event, which is why the search it
        appears in cannot itself be saved.

        ⚠ DERIVED FROM `SAVED_SEGMENTS`, not listed again. There were two
        hand-kept lists of segments in this file and they had already drifted:
        the catalogue named three and the saved list held four, so one segment
        was usable from the tab and invisible in the picker. One list. ── */
  ...SAVED_SEGMENTS.map((seg) =>
    ev(seg.id, seg.name, 'segments', { hasProperties: false, hint: 'Saved segment' }),
  ),

  /* ── properties: user ── */
  prop('userId', 'User ID', 'user'),
  prop('userAnonymousId', 'Anonymous ID', 'user'),
  prop('userCountry', 'Country', 'geography', 'string'),
  prop('userCity', 'City', 'geography'),
  prop('userState', 'Region', 'geography'),

  /* ── properties: session ── */
  prop('duration', 'Duration', 'session', 'duration', { autoCaptured: true }),
  prop('eventsCount', 'Events count', 'session', 'number'),
  prop('errorsCount', 'Errors count', 'session', 'number'),
  prop('pagesCount', 'Pages count', 'session', 'number'),
  prop('viewed', 'Viewed', 'session', 'boolean'),
  prop('favorite', 'Bookmarked', 'session', 'boolean'),
  prop('issueType', 'Issue type', 'session', 'array', {
    options: ['js_exception', 'bad_request', 'click_rage', 'crash', 'incident'],
  }),

  /* ── properties: technology ── */
  prop('userBrowser', 'Browser', 'technology', 'string', {
    options: ['Chrome', 'Safari', 'Firefox', 'Edge'],
  }),
  prop('userOs', 'OS', 'technology', 'string', {
    options: ['macOS', 'Windows', 'Linux', 'iOS', 'iPadOS', 'Android'],
  }),
  prop('userDeviceType', 'Device', 'technology', 'string', {
    options: ['desktop', 'mobile', 'tablet'],
  }),
  prop('platform', 'Platform', 'technology', 'string', { options: ['web', 'ios', 'android'] }),

  /* ── properties: the project's own custom fields ── */
  prop('meta.plan', 'plan', 'metadata', 'string', { options: ['paid', 'trial', 'free'] }),
  prop('meta.cohort', 'cohort', 'metadata', 'string', { options: ['ga', 'beta'] }),
  prop('meta.accountId', 'accountId', 'metadata'),
];

/** The event properties an event can be narrowed by. In production this is a
 *  per-event fetch (`filterStore.getEventFilters(id)`); here it is one set,
 *  because what matters to the design is that the row can hold sub-rows. */
export const EVENT_PROPERTIES: readonly CatalogueEntry[] = [
  prop('selector', 'Selector', 'auto_captured'),
  prop('label', 'Label', 'auto_captured'),
  prop('url', 'URL', 'auto_captured'),
  prop('value', 'Value', 'auto_captured'),
  /* A STRING, not a number, and deliberately: a status code is an enumeration
     you pick from - "is 404", "is not 500" - and the string operator set is the
     one that fits. `VALUE_FIXTURES.status` gives it its candidates and their
     shares. */
  prop('status', 'Status code', 'auto_captured', 'string', {
    options: ['200', '301', '400', '401', '404', '429', '500', '502', '503'],
  }),
  prop('method', 'Method', 'auto_captured', 'string', {
    options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
  prop('durationMs', 'Duration (ms)', 'auto_captured', 'number'),
];

/* ── CANDIDATE VALUES ─────────────────────────────────────────────────────────
   What the value picker offers, and the SHARE each one holds.

   Production's autocomplete draws a proportion bar under every candidate - how
   much of the traffic that value accounts for - which is the most useful thing
   on the whole control: it tells you whether a filter is worth applying before
   you apply it. Mehdi asked for the mock data to show it.

   TWO SOURCES, and the split is the honest one:

   1. WHERE THE FIELD IS REAL, the counts are COUNTED. `userCountry` reads the
      134 sessions and reports what is actually in them, so the bar in the menu
      and the rows in the table can never disagree. That is done in
      `sessions-logic.ts`, against whatever the current date range left.
   2. WHERE THE FIELD IS NOT ON A SESSION - a URL, a selector, an error string,
      an event's own properties - there is nothing to count, so the candidates
      are listed here with a weight. The weights are integers, so the shares
      are arithmetic rather than decoration.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ValueCandidate {
  value: string;
  /** Relative weight. The picker turns weights into a share of their own sum. */
  weight: number;
}

/** Every user id in the fixture with the number of sessions it holds, most
 *  first. Read off `SESSIONS`, which is defined above this point. */
const userIdCandidates = (): readonly ValueCandidate[] => {
  const counts = new Map<string, number>();
  for (const s of SESSIONS) if (s.userId) counts.set(s.userId, (counts.get(s.userId) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, weight]) => ({ value, weight }));
};

export const VALUE_FIXTURES: Record<string, readonly ValueCandidate[]> = {
  /* the autocapture page event's own URLs, which is the single most-filtered
     value in any session-replay product */
  url: [
    { value: '/checkout', weight: 412 },
    { value: '/cart', weight: 388 },
    { value: '/product/:id', weight: 297 },
    { value: '/search', weight: 213 },
    { value: '/account/billing', weight: 96 },
    { value: '/signup', weight: 74 },
    { value: '/checkout/confirm', weight: 61 },
    { value: '/account/settings', weight: 33 },
    { value: '/legal/terms', weight: 8 },
  ],
  selector: [
    { value: 'button.checkout-submit', weight: 264 },
    { value: '.cart-item__remove', weight: 181 },
    { value: '#promo-code-apply', weight: 143 },
    { value: 'a.nav-account', weight: 118 },
    { value: '.address-form input[name="zip"]', weight: 77 },
    { value: '.plan-card--pro button', weight: 41 },
  ],
  label: [
    { value: 'Place order', weight: 301 },
    { value: 'Apply promo code', weight: 172 },
    { value: 'Remove', weight: 158 },
    { value: 'Continue to payment', weight: 121 },
    { value: 'Save address', weight: 64 },
  ],
  /* An error string is the ugliest value in the product and it is what people
     actually paste in, so the fixture holds the real shapes: a bare message, a
     serialised response, and the classic cross-origin nothing. */
  value: [
    { value: 'Script error.', weight: 388 },
    { value: '{"message":"GET error on /managed-saas/billing"}', weight: 244 },
    { value: 'Failed to fetch', weight: 196 },
    { value: 'fromMillis requires a numerical input, but received a string', weight: 88 },
    { value: 'Cannot read properties of undefined (reading \'total\')', weight: 71 },
    { value: 'NetworkError when attempting to fetch resource.', weight: 42 },
    { value: 'Hydration failed because the initial UI does not match', weight: 17 },
  ],
  status: [
    { value: '200', weight: 731 },
    { value: '404', weight: 168 },
    { value: '500', weight: 94 },
    { value: '401', weight: 58 },
    { value: '429', weight: 21 },
    { value: '502', weight: 9 },
  ],
  method: [
    { value: 'GET', weight: 688 },
    { value: 'POST', weight: 241 },
    { value: 'PUT', weight: 52 },
    { value: 'PATCH', weight: 31 },
    { value: 'DELETE', weight: 12 },
  ],
  /* ⚠ DERIVED, NOT HAND-KEPT. This was five ids typed out beside the fixture,
     and all five came from the ten hand-written lead sessions - so filtering by
     a user returned exactly one row, and there was no way to see that a
     person's avatar holds across their sessions. The weights are the real
     counts now, which is also the only way the picker's proportion bars mean
     anything. */
  userId: userIdCandidates(),
  'meta.accountId': [
    { value: 'acc-1188', weight: 38 },
    { value: 'acc-0042', weight: 26 },
    { value: 'acc-3310', weight: 21 },
    { value: 'acc-7781', weight: 12 },
    { value: 'acc-2204', weight: 6 },
  ],
};
