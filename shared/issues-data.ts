/* =========================================================================
   issues-data.ts — the mock Issues dataset for the Melonade app.

   Extracted verbatim from the OpenReplay prototype's
   app/mstore/issuesStore.ts on 2026-08-21. Every string, id, number and
   session here is a byte-for-byte copy of the prototype's demo content; the
   only things dropped are the React/MobX/lucide wiring, the segment filter
   seeds, and the icon/color maps (presentation is the consuming app's job).

   This file is the SINGLE SOURCE OF TRUTH shared by option-a and option-b.
   It has ZERO imports on purpose — keep it that way.
   ========================================================================= */

export type CategoryName = 'Errors' | 'UI/UX' | 'Slowness';

/* Impact as three levels (no number). Thresholds match the sort order. */
export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface IssueSession {
  email: string;
  plan: 'paid' | 'trial' | 'free';
  browser: string;
  os: string;
  loc: string;
  dur: string;
  tags: string[];
  journey: string;
  /** short headline for how this session experienced the issue — a "variation" */
  variation: string;
  /** Set by `sessionPool` on the sessions it derives. Absent on the ones the
   *  agent has actually written up, which is what the shortlist ranks first:
   *  a session with a journey on it is better evidence than one it has only
   *  counted. */
  derived?: boolean;
}

export interface Issue {
  id: number;
  head: string;
  /** project-wide critical flag (decorated: agent/teammates OR my own mark) */
  critical: boolean;
  /** which segment surfaced this issue — absent = found in full traffic */
  segmentId?: number;
  cat: CategoryName;
  real: string;
  /** suggested fix / resolution — paired with `real` in the detail diagnosis */
  fix: string;
  journey: string;
  impact: number;
  /** minutes since this issue was last seen (drives "Last seen" + newest sort) */
  seenAgoMin: number;
  tags: string[];
  sessions: IssueSession[];
}

/* ONE entity across the whole app: a saved segment (the classic "saved search"
   in Data Management) with ONE capture flag — `active`: its capture switch is
   on, so the agent captures it while the project is in segments mode.
   Only team-visible (isPublic) segments are eligible for capture. */
export interface SavedSegment {
  id: number;
  name: string;
  /** display name of the creator; `mine` gates edit/delete (anyone toggles) */
  createdBy: string;
  mine: boolean;
  /** team-visible vs private-to-owner; capture eligibility requires team */
  isPublic: boolean;
  /** the capture switch — capturing while the project is in segments mode */
  active: boolean;
  /** human-readable one-liner of the query, shown in the popover */
  summary: string;
  /** share of daily traffic this query matches (computed at save/enable time) */
  trafficPct: number;
  /** ~sessions analysed per day for this segment */
  sessionsPerDay: number;
  instructions?: string;
  /** DM-table stats (mock values, the real ones come from the backend) */
  sessionsCount: number;
  usersCount: number;
}

/** One line of "what critical means to me": a plain-words description plus its
 *  author. No name field — the description IS the rule, and the author is what
 *  makes "critical to me" filterable. */
export interface CriticalRule {
  id: number;
  description: string;
  createdBy: string;
  mine: boolean;
}

export const CAT_ORDER: CategoryName[] = ['Errors', 'UI/UX', 'Slowness'];

/* Reason chips offered when hiding an issue (shared by the list + detail pages),
   so the agent learns why something was dismissed. */
export const HIDE_REASONS: string[] = [
  'Not a real issue',
  'Already fixed',
  'Expected behavior',
  'Duplicate',
  'Low priority',
];

export function impactLevel(v: number): ImpactLevel {
  if (v >= 45) return 'High';
  if (v >= 25) return 'Medium';
  return 'Low';
}

const MIN_PER_DAY = 1440;

/** Compact "last seen" label: relative for up to 7 days, an absolute date beyond. */
export function lastSeenLabel(minAgo: number): string {
  if (minAgo < 1) return 'just now';
  if (minAgo < 60) return `${Math.round(minAgo)}m ago`;
  if (minAgo < MIN_PER_DAY) return `${Math.round(minAgo / 60)}h ago`;
  if (minAgo < 7 * MIN_PER_DAY) return `${Math.round(minAgo / MIN_PER_DAY)}d ago`;
  return new Date(Date.now() - minAgo * 60000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function lastSeenExact(minAgo: number): string {
  return new Date(Date.now() - minAgo * 60000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RAW: Omit<Issue, 'tags' | 'fix'>[] = [
  {
    id: 1,
    head: 'Card declined with no error message at checkout',
    critical: true,
    segmentId: 1, // surfaced by the "Billing & checkout" segment
    cat: 'Errors',
    impact: 71,
    seenAgoMin: 3,
    real: 'When the payment processor returns a declined status, the checkout UI swallows the error entirely — no message, no toast, no inline validation. The "Place order" button simply resets to its default state, so the user has no idea whether the charge failed, succeeded, or is still pending. Most retry the exact same card two or three times before giving up, and a meaningful share of them never complete the purchase at all.',
    journey: 'User filled in card details, hit "Place order", saw the spinner end with nothing, retried the same card twice, then abandoned the cart.',
    sessions: [
      // demo pair for the shared title slot (07-28): the first variation runs
      // PAST three lines (truncated + tooltip), the second sits at ~three
      // lines untruncated — together they exercise both ends of the clamp
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Frankfurt am Main', dur: '12m1s', variation: 'Retried the same card twice, then left', tags: ['Payment', 'Checkout', 'Error encountered'], journey: 'Filled in card details, hit "Place order", watched the spinner end with nothing, re-entered the same card twice, then left the cart.' },
      { email: 'lucas@finhub.io', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Toronto', dur: '9m12s', variation: 'Bounced back to a full form, no error', tags: ['Checkout', 'Error encountered'], journey: 'Reached checkout, submitted payment, got silently bounced back to the form, grew visibly frustrated and abandoned.' },
      { email: 'amara@shopwave.co', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Lagos', dur: '6m03s', variation: 'Pay button reset on mobile', tags: ['Payment', 'Checkout'], journey: 'Tried to pay on her phone, saw the button reset with no message, and gave up after a single attempt.' },
    ],
  },
  {
    id: 2,
    head: '"Place order" button unresponsive on mobile',
    critical: true,
    cat: 'UI/UX',
    impact: 66,
    seenAgoMin: 24,
    real: 'On mobile viewports the primary "Place order" button receives the tap event but never fires its click handler, so the order is never submitted. An overlay element appears to be intercepting the touch, which is why the button looks active but does nothing. Users tap it repeatedly — classic rage-click behaviour — scroll around hunting for an error that never appears, and then abandon the session.',
    journey: 'User reached the checkout step on a phone, tapped "Place order" seven times in a row, scrolled up and back down looking for an error, then left.',
    sessions: [
      // ~two lines: this issue's grid slots titles at 2 (no three-line gap)
      { email: 'main@badmanners.gg', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Islamabad', dur: '8m7s', variation: 'Tapped "Place order" seven times', tags: ['Checkout', 'Frustration'], journey: 'Tapped "Place order" seven times in a row on a phone, nothing fired, scrolled up and down hunting for an error, then quit.' },
      { email: 'priya@meshcart.in', plan: 'free', browser: 'Chrome', os: 'Android', loc: 'Mumbai', dur: '5m44s', variation: 'Looped between cart and checkout', tags: ['Checkout', 'Back and forth'], journey: 'Tapped the order button, looped back to the cart and forward again twice, and never got a response.' },
    ],
  },
  {
    id: 3,
    head: 'Card form rejects a valid expiry date',
    critical: true,
    segmentId: 1, // surfaced by the "Billing & checkout" segment
    cat: 'Errors',
    impact: 58,
    seenAgoMin: 52,
    real: 'The expiry-date field rejects correctly formatted future dates (MM/YY) with an "invalid date" validation error, blocking payment submission. The check appears to run on every keystroke rather than on blur, so the field flags itself as invalid mid-entry and never clears. Users re-type the same valid date several different ways, grow frustrated, and abandon the payment step.',
    journey: 'User entered a valid expiry three different ways, each rejected with "invalid date", re-typed slowly, then gave up on the payment step.',
    sessions: [
      { email: 'dev@dosetech.co', plan: 'paid', browser: 'Firefox', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '9m1s', variation: 'Valid expiry rejected three times', tags: ['Payment', 'Form submission', 'Error encountered'], journey: 'Entered a valid expiry three different ways, each rejected as "invalid date", re-typed it slowly, then abandoned payment.' },
      { email: 'sofia@oakmont.eu', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Madrid', dur: '7m20s', variation: 'Fought a false validation error', tags: ['Form submission', 'Error encountered'], journey: 'Corrected the expiry field over and over against a false validation error before giving up on the order.' },
    ],
  },
  {
    id: 4,
    head: 'Checkout page takes 8s to load',
    critical: true,
    cat: 'Slowness',
    impact: 52,
    seenAgoMin: 180,
    real: 'The checkout page takes around eight seconds to become interactive. The order summary and payment fields render well after the rest of the page, so users stare at a half-loaded screen with no clear signal that anything is still loading. Many tab away while they wait, and a portion never return to finish the order — directly bleeding revenue at the most critical step of the funnel.',
    journey: 'User clicked through to checkout, stared at a half-loaded page for several seconds, switched tabs, came back, and a portion of users left before it finished.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Newark', dur: '15m20s', variation: 'Tab-switched while it loaded', tags: ['Checkout', 'Frustration'], journey: 'Clicked through to checkout, stared at a half-loaded page, switched tabs while it loaded, and came back several seconds later.' },
      { email: 'elena@brightbox.io', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Berlin', dur: '11m02s', variation: 'Left before fields rendered', tags: ['Checkout', 'Drop off'], journey: 'Waited on the slow checkout, lost patience before the payment fields rendered, and left without ordering.' },
    ],
  },
  {
    id: 5,
    head: 'Users abandon onboarding at the long step-4 form',
    critical: false,
    cat: 'UI/UX',
    impact: 47,
    seenAgoMin: 480,
    real: 'Step 4 of onboarding is a single overwhelming form with 14 required fields presented all at once. Completion drops sharply at this point — users who breezed through the first three steps stall here, hesitate over several inputs, and a large share close the tab without finishing. The sheer length of the form, with no progress indication or grouping, is the clearest driver of the drop-off.',
    journey: 'User progressed smoothly through steps 1–3, hit the long form at step 4, scrolled the whole thing, hesitated on several fields, then closed the tab.',
    sessions: [
      { email: 'muhammad.hadayat@swipbox.com', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Saidpur', dur: '11m31s', variation: 'Stalled on the 14-field form', tags: ['Onboarding', 'Form submission', 'Drop off'], journey: 'Breezed through steps 1–3, hit the 14-field form at step 4, hesitated on several inputs, then closed the tab.' },
      { email: 'tom@layerlabs.dev', plan: 'trial', browser: 'Firefox', os: 'Windows', loc: 'Austin', dur: '8m49s', variation: 'Never started the long form', tags: ['Onboarding', 'Drop off'], journey: 'Scrolled the long step-4 form top to bottom, never started filling it, and abandoned onboarding.' },
    ],
  },
  {
    id: 6,
    head: 'Product images slow to load on the listing grid',
    critical: false,
    cat: 'Slowness',
    impact: 39,
    seenAgoMin: 1320,
    real: 'Product thumbnails on the category listing take several seconds to appear, loading one at a time as the user scrolls instead of being reserved and lazy-loaded. On first paint the grid is a wall of empty placeholders, so it reads as broken rather than loading. Users pause, scroll past the gaps, and often scroll back up once the images finally trickle in — a janky first impression on a page meant to drive browsing.',
    journey: 'User opened a category, scrolled a grid of empty image placeholders, paused waiting for thumbnails, and scrolled back up once they finally loaded.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Poznan', dur: '7m55s', variation: 'Scrolled past empty placeholders', tags: ['Navigation', 'Frustration'], journey: 'Opened a category, scrolled a grid of empty placeholders, waited, then scrolled back up once the thumbnails finally loaded.' },
      { email: 'kenji@miraisoft.jp', plan: 'paid', browser: 'Safari', os: 'Mac OS X', loc: 'Osaka', dur: '6m10s', variation: 'Images trickled in one by one', tags: ['Navigation'], journey: 'Searched the listing, watched images trickle in one by one, and paused before interacting with the grid.' },
    ],
  },
  {
    id: 7,
    head: 'Search spinner never resolves',
    critical: false,
    cat: 'Errors',
    impact: 35,
    seenAgoMin: 2880,
    real: 'The search request fails silently at the network layer — there is no timeout and no error state, so the results spinner keeps spinning indefinitely. Users wait, clear the query and retry a couple of times, and eventually give up and try to navigate to the category by hand. Because nothing ever surfaces the failure, it looks to the user like the product simply does not work.',
    journey: 'User typed a query, waited on the spinner, cleared and retried twice, then tried navigating to the category manually instead.',
    sessions: [
      { email: 'mehdi+new@openreplay.cloud', plan: 'paid', browser: 'Firefox', os: 'Mac OS X', loc: 'Schieren', dur: '10m26s', variation: 'Spinner hung, browsed manually', tags: ['Navigation', 'Error encountered'], journey: 'Typed a query, watched the spinner hang, cleared and retried twice, then tried browsing to the category by hand instead.' },
      { email: 'hana@coralpay.io', plan: 'trial', browser: 'Chrome', os: 'Windows', loc: 'Seoul', dur: '6m38s', variation: 'Filter spinner never resolved', tags: ['Navigation', 'Frustration'], journey: 'Applied a filter, hit a spinner that never resolved, retried it a few times and grew frustrated before leaving.' },
    ],
  },
  {
    id: 8,
    head: 'Filters reset when moving to the next page',
    critical: false,
    cat: 'UI/UX',
    impact: 30,
    seenAgoMin: 5760,
    real: 'Active filter chips are silently dropped the moment the user paginates, so page 2 onward shows unfiltered results while the controls still imply the filters are applied. The filter state lives only in component memory and is not persisted to the URL or query, so any navigation resets it. Users re-apply the same filters repeatedly, page back and forth, and lose trust that the listing reflects what they asked for.',
    journey: 'User applied two filters, reviewed page 1, clicked to page 2, saw the filters gone and results changed, went back and re-applied them repeatedly.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Nong Sung', dur: '9m20s', variation: 'Filters cleared on page 2', tags: ['Navigation', 'Error encountered'], journey: 'Set two filters, reviewed page 1, clicked to page 2 and found them silently cleared, then re-applied them repeatedly.' },
      { email: 'omar@gridly.io', plan: 'paid', browser: 'Chrome', os: 'Linux', loc: 'Cairo', dur: '7m02s', variation: 'Lost filters paging back and forth', tags: ['Navigation', 'Back and forth'], journey: 'Filtered the results, paged forward and back, lost the filters each time, and eventually gave up.' },
    ],
  },
  {
    id: 9,
    head: 'Footer "Help Center" link 404s',
    critical: false,
    cat: 'UI/UX',
    impact: 22,
    seenAgoMin: 8640,
    real: 'The "Help Center" link in the footer points to a dead URL and returns a 404. Users who are already stuck and actively seeking help hit a wall at the exact moment they need support most. There is no redirect or monitoring in place, so the broken link has likely been failing silently for a while, quietly pushing frustrated users toward churn instead of resolution.',
    journey: 'User scrolled to the footer, clicked "Help Center", landed on a 404 page, hit back, and tried the contact link instead.',
    sessions: [
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Thung Khru', dur: '5m44s', variation: 'Help Center link 404’d', tags: ['Navigation', 'Error encountered'], journey: 'Scrolled to the footer, clicked "Help Center", landed on a 404, hit back, and tried the contact link instead.' },
      { email: 'greta@nordkit.se', plan: 'free', browser: 'Firefox', os: 'Windows', loc: 'Stockholm', dur: '4m12s', variation: 'Hit a dead support page', tags: ['Navigation', 'Error encountered', 'Drop off'], journey: 'Went looking for support, clicked the footer Help Center link, hit the dead 404 page, and abandoned the attempt.' },
    ],
  },
  {
    id: 10,
    head: 'Dashboard charts take 5s to render',
    critical: false,
    cat: 'Slowness',
    impact: 18,
    seenAgoMin: 12960,
    real: 'The account dashboard charts take around five seconds to fetch and draw after the page shell loads, leaving every panel blank in the meantime. With no skeletons or loading states, returning users land on what looks like an empty, broken dashboard. The data eventually appears, but the dead first impression makes the product feel slow and unreliable on the page users see most often.',
    journey: 'User opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and continued once the charts appeared.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'trial', browser: 'Chrome', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '6m32s', variation: 'Waited on blank chart panels', tags: ['Navigation'], journey: 'Opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and carried on once it drew.' },
      { email: 'bea@finchly.com', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Lisbon', dur: '5m18s', variation: 'Sat through an empty dashboard', tags: ['Navigation'], journey: 'Landed on the dashboard and sat through several seconds of empty panels before the charts finally appeared.' },
    ],
  },
  {
    id: 11,
    head: 'Quick bounce off the pricing page',
    critical: false,
    segmentId: 2, // surfaced by the "Pricing · France" segment
    cat: 'UI/UX',
    impact: 12,
    /* Fourteen days, and it stays inside the default thirty-day window on
       purpose. Aging it out was tried and reverted: eleven issues is one more
       than a page, so dropping one to prove the date control works took the
       PAGER off the default view - a filter demonstrating itself by deleting
       another control. The window still bites at 24 hours and 7 days, which is
       where anybody would actually use it. */
    seenAgoMin: 20160,
    real: 'A noticeable share of sessions land on the pricing page from ads and leave within a few seconds with no scroll and no click. The instant bounce suggests the above-the-fold content is not matching the intent the ad set up — the value proposition or the plan they expected is not immediately visible. These are paid arrivals leaving before they engage at all, so the wasted acquisition spend compounds the lost conversions.',
    journey: 'User landed on pricing from an ad, stayed under ten seconds without scrolling or interacting, and closed the tab.',
    sessions: [
      { email: 'visitor@gmail.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Manila', dur: '8s', variation: 'Bounced in under ten seconds', tags: ['Navigation', 'Drop off'], journey: 'Landed on pricing from an ad, stayed under ten seconds without scrolling or clicking, and closed the tab.' },
      { email: 'guest@yahoo.com', plan: 'free', browser: 'Safari', os: 'iOS', loc: 'Jakarta', dur: '6s', variation: 'Left pricing without scrolling', tags: ['Navigation', 'Drop off'], journey: 'Arrived on the pricing page from a link, did not scroll or interact at all, and bounced within seconds.' },
    ],
  },
];

/* Suggested fix / resolution per issue — paired with `real` in the detail-page
   diagnosis (The problem / Suggested fix). */
const ISSUE_FIX: Record<number, string> = {
  1: 'Surface the decline reason inline and keep the user on the payment step, instead of silently resetting the “Place order” button.',
  2: 'Bind the tap handler to the button on mobile (check the overlay/z-index intercepting taps) and show a pressed state so the action registers.',
  3: 'Fix the expiry validation to accept correctly formatted future MM/YY dates, and validate on blur rather than per keystroke.',
  4: 'Defer non-critical work and prioritize the order summary + payment fields so checkout is interactive in under ~2s.',
  5: 'Split step 4 into smaller grouped steps (or progressively disclose fields) and trim the required set to reduce drop-off.',
  6: 'Reserve image space and lazy-load thumbnails with low-res placeholders so the grid never looks broken on first paint.',
  7: 'Add a timeout + error state to the search request and let the user retry, instead of an indefinite spinner.',
  8: 'Persist active filters in the URL/query so they survive pagination instead of resetting on page change.',
  9: 'Point the footer “Help Center” link to the live support URL and add a redirect/monitor to catch future 404s.',
  10: 'Render the dashboard shell immediately with skeleton panels and stream chart data, or cache the last result.',
  11: 'Match the pricing page to ad intent above the fold and test a clearer value prop to reduce instant bounces.',
};

/* The 11 issues the prototype ships with, resolved exactly as issuesStore.ts
   does: `tags` is the de-duplicated union of the issue's session tags, `fix`
   comes from the ISSUE_FIX map above. */
export const ISSUES: Issue[] = RAW.map((r) => ({
  ...r,
  tags: [...new Set(r.sessions.flatMap((s) => s.tags))],
  fix: ISSUE_FIX[r.id] ?? '',
}));

/** every tag used by any session on any issue, sorted */
export const ALL_TAGS: string[] = [
  ...new Set(ISSUES.flatMap((i) => i.sessions.flatMap((s) => s.tags))),
].sort();

/** how many issues sit in a category (issuesStore.catCount) */
export function categoryCount(cat: CategoryName): number {
  return ISSUES.filter((i) => i.cat === cat).length;
}

/* Seeded segments — the SAME list Data Management shows (session segments) and
   the Issues popover draws its traffic set from. */
export const SEGMENTS: SavedSegment[] = [
  {
    id: 1,
    name: 'Billing & checkout',
    createdBy: 'You',
    mine: true,
    isPublic: true,
    active: true,
    summary: 'Path contains /checkout · Click "Place order"',
    trafficPct: 2,
    sessionsPerDay: 40,
    instructions:
      'Watch for silent payment failures and anything around coupons or card validation.',
    sessionsCount: 1240,
    usersCount: 830,
  },
  {
    id: 2,
    name: 'Pricing · France',
    createdBy: 'Mehdi O.',
    mine: false,
    isPublic: true,
    active: true,
    summary: 'Path contains /pricing · Country = FR',
    trafficPct: 6,
    sessionsPerDay: 120,
    sessionsCount: 3480,
    usersCount: 2100,
  },
  {
    id: 3,
    name: 'Mobile visitors',
    createdBy: 'Nikita M.',
    mine: false,
    isPublic: true,
    active: false,
    summary: 'Device = mobile',
    trafficPct: 38,
    sessionsPerDay: 760,
    sessionsCount: 21600,
    usersCount: 9400,
  },
  {
    id: 4,
    name: 'Checkout drop-off',
    createdBy: 'Sarah K.',
    mine: false,
    isPublic: true,
    active: false,
    summary: 'Path contains /cart',
    trafficPct: 4,
    sessionsPerDay: 80,
    sessionsCount: 2350,
    usersCount: 1400,
  },
  {
    id: 5,
    name: 'Power users',
    createdBy: 'You',
    mine: true,
    isPublic: true,
    active: false,
    summary: 'Click · Input',
    trafficPct: 12,
    sessionsPerDay: 240,
    sessionsCount: 6800,
    usersCount: 1900,
  },
  {
    id: 6,
    name: 'Signup funnel',
    createdBy: 'You',
    mine: true,
    isPublic: false,
    active: false,
    summary: 'Path contains /signup',
    trafficPct: 3,
    sessionsPerDay: 60,
    sessionsCount: 940,
    usersCount: 880,
  },
  {
    id: 7,
    name: 'German traffic',
    createdBy: 'Mehdi O.',
    mine: false,
    isPublic: true,
    active: false,
    summary: 'Country = DE',
    trafficPct: 9,
    sessionsPerDay: 180,
    sessionsCount: 5200,
    usersCount: 3100,
  },
  {
    id: 8,
    name: 'Safari sessions',
    createdBy: 'Nikita M.',
    mine: false,
    isPublic: true,
    active: false,
    summary: 'Browser = Safari',
    trafficPct: 17,
    sessionsPerDay: 340,
    sessionsCount: 9700,
    usersCount: 4300,
  },
];

/* "What critical means to me" — seeded verbatim from the prototype store. */
export const CRITICAL_RULES: CriticalRule[] = [
  {
    id: 1,
    description:
      'Anything that stops someone paying: declined cards, failed charges, or a payment form that rejects valid details.',
    createdBy: 'Gabriel L.',
    mine: true,
  },
  {
    id: 2,
    description:
      'Checkout and cart steps that break, hang, or lose what the user already entered.',
    createdBy: 'Gabriel L.',
    mine: true,
  },
  {
    id: 3,
    description:
      'Pages that take more than five seconds to become usable on mobile.',
    createdBy: 'Mehdi O.',
    mine: false,
  },
  {
    id: 4,
    description: 'Anything that blocks signup or login.',
    createdBy: 'Nikita M.',
    mine: false,
  },
];
