/* ═══════════════════════════════════════════════════════════════════════════
   THE TEST AGENT'S DOMAIN, ported from the production Tests page.

   Same rule as issues-data.ts: this file is data and arithmetic, no React and
   no styling, so both options can render it and any difference between them is
   a design difference rather than a data one.

   What a test IS, in one paragraph, because the lifecycle is the whole page:
   the agent watches real sessions, and once it has seen a journey often enough
   it drafts a test. A draft is a proposal - you review it and approve it, which
   makes it `approved`: ready, but not running. Attaching a schedule makes it
   `active`. An active test can be `paused`. Approve and schedule are two steps
   on purpose, so "I accept these steps" and "run it every morning" are separate
   decisions. Later, when the journey changes in real sessions, the agent
   proposes a new VERSION of the steps, which waits as a pending revision.
   ═══════════════════════════════════════════════════════════════════════════ */

export type TestLifecycle = 'draft' | 'approved' | 'active' | 'paused';

/** What the LIST shows, which is not quite the lifecycle: a pending revision
 *  outranks the stored status while the preference that pauses on revisions is
 *  on. Derived in tests-logic, never stored. */
export type DisplayStatus = TestLifecycle | 'needs_review';

export type RunResult = 'passed' | 'failed';

/** Viewport, as three device classes rather than pixel sizes. */
export type Resolution = 'mobile' | 'tablet' | 'desktop';

export type ScheduleFreq = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';

/** When a test runs. days: 0=Sun…6=Sat. dayOfMonth: 1-28, or 0 = "the last
 *  day". time is 24h "HH:mm". A null schedule means it only runs on demand. */
export interface Schedule {
  days: number[];
  time: string;
  freq?: ScheduleFreq;
  dayOfMonth?: number;
}

/** One proposed step change, authored against the CURRENT list, so indices are
 *  stable and applying is order-independent. There is no "changed" kind: a
 *  reworded step is a removal and an addition, the way a diff says it. */
export type StepChange =
  | { type: 'added'; afterIndex: number; text: string } // -1 = before the first
  | { type: 'removed'; index: number };

/** The steps as they were at `version`. Oldest first; the CURRENT steps are not
 *  in here, which is what lets the version switcher treat "now" as a place
 *  rather than as the last entry of a list. */
export interface TestVersion {
  version: number;
  savedAt: number;
  steps: string[];
}

/** The agent saw the journey change and proposes a new version of the steps.
 *  Until it is reviewed the test reads "Needs review". */
export interface PendingRevision {
  toVersion: number;
  detectedAt: number;
  /** The proposal itself. The list only prints how many there are; the drawer
   *  renders them as a diff you can accept or reject line by line. */
  changes: StepChange[];
}

/** Merging tests: the participants' steps are held as groups until someone
 *  arranges and accepts them, so nothing runs in the meantime and the absorbed
 *  tests are kept whole in `sources` - cancelling puts them back untouched. */
export interface MergeGroup {
  /** the absorbed test's title, kept as a label above its block */
  title: string;
  steps: string[];
}

export interface PendingMerge {
  /** Held as GROUPS until someone arranges and accepts them: a merge is a
   *  proposal about order, and flattening first would throw away the only
   *  thing there is to decide. */
  groups: MergeGroup[];
  sources: TestCase[];
  prevStatus: TestLifecycle;
}

export interface TestCase {
  key: string;
  title: string;
  status: TestLifecycle;
  /** What the test actually does, in the agent's words. One string per step:
   *  the drawer edits them in place, a revision proposes changes against these
   *  indices, and every older wording is in `history`. */
  steps: string[];
  createdAt: number;
  /** The agent proposes; people write their own. This gates the reject
   *  grammar: you DISMISS a suggestion and you DELETE your own work, never
   *  both on one row. Absent reads as the agent. */
  origin?: 'agent' | 'user';
  /** An unreviewed draft nobody has opened yet. Drives the "new" dot. */
  isNew?: boolean;
  envNames?: string[];
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
  tags?: string[];
  lastResult?: RunResult;
  lastRunAt?: number;
  /** Runner-owned and read-only: running this test changes real data - orders,
   *  accounts, payments. Marked wherever the test is named. */
  hasSideEffects?: boolean;
  version?: number;
  /** Saved snapshots of the steps at each earlier version. Powers the version
   *  switcher and the per-step history popover. */
  history?: TestVersion[];
  pendingRevision?: PendingRevision;
  pendingMerge?: PendingMerge;
}

/** How many steps it runs. Derived, never stored: a count beside a list is a
 *  second copy of the list's length, and the two drift the first time somebody
 *  edits one of them. */
export const stepCount = (tc: TestCase): number => tc.steps.length;

export interface Environment {
  id: string;
  name: string;
  url: string;
  /** Signed-in runs. The list only needs to know THAT there are credentials -
   *  the values live in the form, and never in a table. */
  hasCredentials?: boolean;
  /** Extra request headers the runner sends. */
  headerCount?: number;
  ignoresSslErrors?: boolean;
  /** Switched off keeps the setup but stops tests running against it. Absent
   *  reads as on. */
  active?: boolean;
}

export const ENVIRONMENTS: readonly Environment[] = [
  { id: 'env-prod', name: 'Production', url: 'https://app.example.com', hasCredentials: true },
  {
    id: 'env-staging',
    name: 'Staging',
    url: 'https://staging.example.com',
    hasCredentials: true,
    headerCount: 1,
    ignoresSslErrors: true,
  },
  { id: 'env-qa', name: 'QA', url: 'https://qa.example.com' },
  /* One switched off, because "kept but not running" is a state the row has to
     be able to say and an all-green list would never show it. */
  { id: 'env-preview', name: 'Preview', url: 'https://preview.example.com', active: false },
];

/* ── schedules, in words ──────────────────────────────────────────────────── */

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime(time: string): string {
  const h = Number(time.split(':')[0] ?? 0);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const WEEKDAY_DAYS = [1, 2, 3, 4, 5];

/** Classify a stored schedule, inferring the frequency when it is not written
 *  down. One definition, so the column, the tooltip and (later) the drawer
 *  cannot disagree about what "weekly" means. */
export function scheduleFreq(s?: Schedule | null): ScheduleFreq | null {
  if (!s) return null;
  if (s.freq) return s.freq;
  if (s.dayOfMonth != null) return 'monthly';
  if (!s.days || s.days.length === 0) return null;
  if (s.days.length === 7) return 'daily';
  if (s.days.length === 5 && WEEKDAY_DAYS.every((d) => s.days.includes(d))) return 'weekdays';
  if (s.days.length === 1) return 'weekly';
  return 'custom';
}

export const isScheduled = (s?: Schedule | null): boolean => scheduleFreq(s) !== null;

const domLabel = (dom?: number): string => (dom === 0 ? 'the last day' : `the ${ordinal(dom ?? 1)}`);

/** The full sentence, for the tooltip. */
export function scheduleLabel(schedule?: Schedule | null): string {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return 'Not scheduled';
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `Every day · ${at}`;
    case 'weekdays':
      return `Weekdays · ${at}`;
    case 'weekly':
      return `Every ${DAY_SHORT[schedule.days[0] ?? 1]} · ${at}`;
    case 'monthly':
      return `Monthly on ${domLabel(schedule.dayOfMonth)} · ${at}`;
    default:
      return `${[...schedule.days].sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(', ')} · ${at}`;
  }
}

/** The schedule inside a sentence: "Next run every day at 6:00 AM." The column's
 *  label is a fragment with a middot in it, and lowercasing that fragment to fit
 *  a sentence also lowercases the AM, which reads as a typo. One function per
 *  place a schedule is printed, rather than one string bent into three shapes. */
export function scheduleSentence(schedule?: Schedule | null): string {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return 'only when you ask';
  const at = `at ${formatTime(schedule.time)}`;
  switch (freq) {
    case 'daily':
      return `every day ${at}`;
    case 'weekdays':
      return `on weekdays ${at}`;
    case 'weekly':
      return `every ${DAY_SHORT[schedule.days[0] ?? 1]} ${at}`;
    case 'monthly':
      return `monthly on ${domLabel(schedule.dayOfMonth)} ${at}`;
    default:
      return `on ${[...schedule.days].sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(', ')} ${at}`;
  }
}

/** The short form the column can hold. The sentence stays one hover away. */
export function scheduleShort(schedule?: Schedule | null): string {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return 'Not scheduled';
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `Daily · ${at}`;
    case 'weekdays':
      return `Weekdays · ${at}`;
    case 'weekly':
      return `Weekly · ${at}`;
    case 'monthly':
      return `Monthly · ${at}`;
    default:
      return `${schedule.days.length} days · ${at}`;
  }
}

/** Timestamps arrive as epoch ms and the shared RelativeTime component speaks
 *  minutes, so the conversion lives here rather than at four callsites. */
export const minutesSince = (ts: number): number => Math.max(0, Math.round((Date.now() - ts) / 60000));

/* ── the seed ─────────────────────────────────────────────────────────────── */

const HOUR = 3600000;
const NOW = Date.now();
const hoursAgo = (h: number) => NOW - h * HOUR;
/* Creation dates are spread over three months so sorting by Created visibly
   interleaves drafts, active and paused tests instead of sorting the groups. */
const daysAgo = (d: number) => NOW - d * 24 * HOUR;

const EVERY_DAY: Schedule = { days: [0, 1, 2, 3, 4, 5, 6], time: '06:00' };
const WEEKDAYS: Schedule = { days: [1, 2, 3, 4, 5], time: '09:00' };
const MWF: Schedule = { days: [1, 3, 5], time: '17:00' };

/* The steps, one array per test. They are real sentences rather than "step 1",
   because the drawer's whole job is reading and editing them - a list of
   placeholders would have proved nothing about the row height, the wrapping or
   the inline editor. */
const STEPS = {
  'tc-signup': ["Open the sign-up page", "Fill in a work email address", "Set a password that meets the strength rules", "Accept the terms and submit", "Confirm the welcome screen loads"],
  'tc-byoc': ["Open Settings and choose Bring your own cloud", "Paste the bucket name and the region", "Save the credentials", "Run the connection test", "Confirm the green connected state"],
  'tc-reset': ["Open the sign-in page", "Follow the Forgot password link", "Enter the account email", "Submit the reset request", "Open the reset link from the email", "Set a new password and sign in"],
  'tc-coupon': ["Add a subscription to the cart", "Open the checkout page", "Enter the coupon code SAVE20", "Confirm the total drops by 20 percent"],
  'tc-invite': ["Open Settings and then Team", "Choose Invite a member", "Enter the email and pick the Editor role", "Send the invitation", "Confirm the member appears as pending"],
  'tc-export': ["Open Reports", "Pick the last 30 days", "Choose Export as CSV", "Wait for the download to finish", "Confirm the file has a header row and 30 rows"],
  'tc-2fa': ["Open Settings and then Security", "Turn on two-factor authentication", "Scan the QR code with an authenticator", "Enter the six-digit code", "Confirm the recovery codes are shown"],
  'tc-checkout': ["Open the product page", "Add the item to the cart", "Go to checkout", "Pay with the saved card", "Confirm the order number is shown"],
  'tc-login': ["Open the sign-in page", "Enter the email and password", "Submit the form", "Confirm the dashboard loads"],
  'tc-search': ["Open the search page", "Type a query into the search field", "Apply the Category filter", "Confirm the result count updates"],
  'tc-billing': ["Open Settings and then Billing", "Choose Update payment method", "Enter the new card details", "Confirm the card on file has changed"],
  'tc-create-project': ["Open the projects list", "Choose New project", "Name it and pick a template", "Confirm the project opens"],
  'tc-invite-active': ["Open Settings and then Team", "Invite a teammate by email", "Confirm the pending invitation is listed"],
  'tc-2fa-active': ["Open Settings and then Security", "Turn on two-factor authentication", "Enter the six-digit code", "Confirm two-factor reads as on"],
  'tc-invoice': ["Open Settings and then Billing", "Open the invoice history", "Download the most recent invoice"],
  'tc-profile': ["Open the account menu and choose Profile", "Upload a photo under 2 MB", "Crop it and save", "Confirm the avatar updates in the header"],
  'tc-onboarding-tour': ["Sign in as a brand-new account", "Step through the three onboarding cards", "Confirm the tour does not appear on the next visit"],
  'tc-bulk-export': ["Open Settings and then Data", "Request a full export", "Confirm the export lands in the email inbox", "Confirm the archive opens"],
  'tc-logout': ["Open the account menu", "Choose Sign out", "Confirm the sign-in page is shown"],
  'tc-add-payment': ["Open Settings and then Billing", "Add a second payment method", "Confirm it is listed as a backup card"],
  'tc-remove-item': ["Add two items to the cart", "Remove the first one", "Confirm the total drops by that item's price"],
  'tc-change-password': ["Open Settings and then Security", "Enter the current and the new password", "Sign in again with the new password"],
  'tc-export-csv': ["Open Reports", "Choose Export as CSV", "Confirm the download starts"],
  'tc-filter-dashboard': ["Open the dashboard", "Set the range to the last 7 days", "Confirm every card reloads with the new range"],
  'tc-share-report': ["Open a saved report", "Choose Share and copy the link", "Open the link in a signed-out window"],
  'tc-delete-account': ["Open Settings and then Account", "Choose Delete account and type the confirmation", "Confirm the account is gone and the session ends"],
  'tc-apply-theme': ["Open the account menu", "Switch the theme to dark", "Confirm the setting survives a reload"],
  'tc-resend-invite': ["Open Settings and then Team", "Find a pending invitation", "Choose Resend and confirm the toast"],
  'tc-upgrade-plan': ["Open Settings and then Plan", "Choose the Pro plan", "Confirm the new plan and the prorated total"],
  'tc-search-empty': ["Open the search page", "Search for a string that matches nothing", "Confirm the empty state names the query"],
};;

/* The worst case the steps list has to survive, generated for the reason the
   others are written: fifty hand-typed lines would be fifty chances to
   contradict each other, and what this one is FOR is the scroll. */
const SWEEP_STEPS: string[] = Array.from({ length: 50 }, (_, i) =>
  [
    `Open the ${['dashboard', 'billing page', 'search page', 'project list', 'settings page'][i % 5]}`,
    `Check that the ${['header', 'summary card', 'table', 'filter bar', 'footer'][i % 5]} renders`,
  ][i % 2] ?? `Step ${i + 1}`,
);

export const TESTS: readonly TestCase[] = [
  /* Drafts. A draft carries nothing anybody has set yet - no tags, no
     environment, no schedule - and those empty cells are part of how a draft
     reads in the table. */
  { key: 'tc-signup', title: 'New sign-up flow', status: 'draft', steps: STEPS['tc-signup'], createdAt: daysAgo(1), isNew: true },
  { key: 'tc-byoc', title: 'BYOC setup flow', status: 'draft', steps: STEPS['tc-byoc'], createdAt: daysAgo(2), isNew: true },
  { key: 'tc-reset', title: 'Password reset', status: 'draft', steps: STEPS['tc-reset'], createdAt: daysAgo(4) },
  { key: 'tc-coupon', title: 'Apply coupon at checkout', status: 'draft', steps: STEPS['tc-coupon'], createdAt: daysAgo(9), isNew: true, hasSideEffects: true },
  { key: 'tc-invite', title: 'Add a team member', status: 'draft', steps: STEPS['tc-invite'], createdAt: daysAgo(13), hasSideEffects: true },

  /* Approved: the steps are accepted, nothing is scheduled. Ready to run on
     demand, and the state that exists so approving is not also scheduling. */
  { key: 'tc-export', title: 'Export report to CSV', status: 'approved', steps: STEPS['tc-export'], createdAt: daysAgo(3), tags: ['Reporting'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['paris'], schedule: null },
  { key: 'tc-2fa', title: 'Enable two-factor auth', status: 'approved', steps: STEPS['tc-2fa'], createdAt: daysAgo(16), tags: ['Auth', 'Security'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: null },

  /* Running, with two revisions waiting to be read. */
  { key: 'tc-checkout', title: 'Checkout flow', status: 'active', steps: STEPS['tc-checkout'], createdAt: daysAgo(62), tags: ['Checkout'], envNames: ['Production', 'Staging'], resolutions: ['desktop', 'mobile'], regions: ['paris', 'ny'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(2), version: 1, pendingRevision: {
      toVersion: 2,
      detectedAt: hoursAgo(3),
      /* What the agent saw: the flow gained a shipping step and the saved-card
         shortcut replaced typing the card in. Four changes, two of them a
         reword said the way a diff says it - a removal and an addition. */
      changes: [
        { type: 'added', afterIndex: 1, text: 'Choose a shipping address' },
        { type: 'removed', index: 3 },
        { type: 'added', afterIndex: 3, text: 'Pay with the saved card and confirm the CVC prompt' },
        { type: 'added', afterIndex: 4, text: 'Confirm the confirmation email is queued' },
      ],
    } },
  { key: 'tc-login', title: 'Login flow', status: 'active', steps: STEPS['tc-login'], createdAt: daysAgo(88), tags: ['Auth'], envNames: ['QA'], resolutions: ['mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'failed', lastRunAt: hoursAgo(5) },
  { key: 'tc-search', title: 'Search & filter', status: 'active', steps: STEPS['tc-search'], createdAt: daysAgo(45), tags: ['Search'], envNames: ['Production'], resolutions: ['desktop', 'tablet'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(9), version: 2,
    history: [
      { version: 1, savedAt: daysAgo(12), steps: ['Open the search page', 'Type a query into the search field', 'Confirm the result count updates'] },
    ] },
  { key: 'tc-billing', title: 'Update billing card', status: 'active', steps: STEPS['tc-billing'], createdAt: daysAgo(30), tags: ['Billing'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['ny'], schedule: MWF, lastResult: 'failed', lastRunAt: hoursAgo(11), version: 3,
    history: [
      { version: 1, savedAt: daysAgo(24), steps: ['Open Billing', 'Update the card', 'Confirm the change'] },
      { version: 2, savedAt: daysAgo(10), steps: ['Open Settings and then Billing', 'Choose Update payment method', 'Enter the new card details', 'Confirm the card on file has changed'] },
    ] },
  { key: 'tc-create-project', title: 'Create project', status: 'active', steps: STEPS['tc-create-project'], createdAt: daysAgo(6), tags: ['Projects'], envNames: ['Production'], resolutions: ['desktop'], regions: ['paris'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(3) },
  { key: 'tc-invite-active', title: 'Invite teammate', status: 'active', steps: STEPS['tc-invite-active'], createdAt: daysAgo(52), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(14) },
  { key: 'tc-2fa-active', title: 'Enable two-factor auth', status: 'active', steps: STEPS['tc-2fa-active'], createdAt: daysAgo(24), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(20) },
  { key: 'tc-invoice', title: 'Download invoice', status: 'active', steps: STEPS['tc-invoice'], createdAt: daysAgo(71), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop'], regions: ['paris'], schedule: { days: [1], time: '08:00' }, lastResult: 'passed', lastRunAt: hoursAgo(26) },
  { key: 'tc-profile', title: 'Upload profile photo', status: 'active', steps: STEPS['tc-profile'], createdAt: daysAgo(11), tags: ['Profile'], envNames: ['Staging'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(30), version: 2,
    history: [
      { version: 1, savedAt: daysAgo(40), steps: ['Open the account menu and choose Profile', 'Upload a photo', 'Confirm the avatar updates in the header'] },
    ],
    pendingRevision: {
      toVersion: 3,
      detectedAt: hoursAgo(26),
      changes: [{ type: 'added', afterIndex: 1, text: 'Confirm the size limit warning for files over 2 MB' }],
    } },

  { key: 'tc-onboarding-tour', title: 'Onboarding tour', status: 'paused', steps: STEPS['tc-onboarding-tour'], createdAt: daysAgo(95), tags: ['Onboarding'], envNames: ['Staging'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(72) },
  { key: 'tc-bulk-export', title: 'Bulk data export', status: 'paused', steps: STEPS['tc-bulk-export'], createdAt: daysAgo(58), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: null, lastResult: 'failed', lastRunAt: hoursAgo(96) },
  { key: 'tc-logout', title: 'Logout flow', status: 'active', steps: STEPS['tc-logout'], createdAt: daysAgo(19), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(6) },
  { key: 'tc-add-payment', title: 'Add a payment method', status: 'active', steps: STEPS['tc-add-payment'], createdAt: daysAgo(27), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop', 'mobile'], regions: ['paris'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(8) },
  { key: 'tc-remove-item', title: 'Remove item from cart', status: 'active', steps: STEPS['tc-remove-item'], createdAt: daysAgo(34), tags: ['Checkout'], envNames: ['Production'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(10) },
  { key: 'tc-change-password', title: 'Change password', status: 'active', steps: STEPS['tc-change-password'], createdAt: daysAgo(41), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop'], regions: ['ny'], schedule: MWF, lastResult: 'failed', lastRunAt: hoursAgo(12) },
  { key: 'tc-export-csv', title: 'Export report as CSV', status: 'paused', steps: STEPS['tc-export-csv'], createdAt: daysAgo(76), tags: ['Settings'], envNames: ['Staging'], resolutions: ['desktop'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(40) },
  { key: 'tc-filter-dashboard', title: 'Filter the dashboard', status: 'active', steps: STEPS['tc-filter-dashboard'], createdAt: daysAgo(8), tags: ['Search'], envNames: ['Production'], resolutions: ['desktop', 'tablet'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(13) },
  { key: 'tc-share-report', title: 'Share a report', status: 'active', steps: STEPS['tc-share-report'], createdAt: daysAgo(22), tags: ['Settings'], envNames: ['Production'], resolutions: ['desktop'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(15) },
  { key: 'tc-delete-account', title: 'Delete account', status: 'paused', steps: STEPS['tc-delete-account'], createdAt: daysAgo(66), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['ny'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(120) },
  { key: 'tc-apply-theme', title: 'Switch to dark mode', status: 'active', steps: STEPS['tc-apply-theme'], createdAt: daysAgo(37), tags: ['Profile'], envNames: ['Staging'], resolutions: ['desktop', 'mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(18) },
  { key: 'tc-resend-invite', title: 'Resend a team invite', status: 'active', steps: STEPS['tc-resend-invite'], createdAt: daysAgo(49), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'failed', lastRunAt: hoursAgo(22) },
  { key: 'tc-upgrade-plan', title: 'Upgrade plan', status: 'active', steps: STEPS['tc-upgrade-plan'], createdAt: daysAgo(83), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop'], regions: ['ny'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(24) },
  { key: 'tc-search-empty', title: 'Search with no results', status: 'active', steps: STEPS['tc-search-empty'], createdAt: daysAgo(15), tags: ['Search'], envNames: ['Production'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(27) },
  /* The worst case the layout has to survive: 50 steps, one environment, and a
     name long enough to want the column to itself. */
  { key: 'tc-regression', title: 'Full regression sweep', status: 'active', steps: SWEEP_STEPS, createdAt: daysAgo(5), tags: ['Regression'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['paris'], schedule: { days: [1], time: '05:00' }, lastResult: 'failed', lastRunAt: hoursAgo(26) },
];
