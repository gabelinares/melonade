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

/** The agent saw the journey change and proposes a new version of the steps.
 *  Until it is reviewed the test reads "Needs review". */
export interface PendingRevision {
  toVersion: number;
  detectedAt: number;
  /** How many step changes are in the proposal. The review itself is the
   *  drawer's job; the list only ever says how much there is to read. */
  changes: number;
}

/** Merging tests: the participants' steps are held as groups until someone
 *  arranges and accepts them, so nothing runs in the meantime and the absorbed
 *  tests are kept whole in `sources` - cancelling puts them back untouched. */
export interface PendingMerge {
  sources: TestCase[];
  prevStatus: TestLifecycle;
}

export interface TestCase {
  key: string;
  title: string;
  status: TestLifecycle;
  /** How many steps the test runs. The steps themselves belong to the drawer. */
  stepCount: number;
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
  pendingRevision?: PendingRevision;
  pendingMerge?: PendingMerge;
}

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

export const TESTS: readonly TestCase[] = [
  /* Drafts. A draft carries nothing anybody has set yet - no tags, no
     environment, no schedule - and those empty cells are part of how a draft
     reads in the table. */
  { key: 'tc-signup', title: 'New sign-up flow', status: 'draft', stepCount: 5, createdAt: daysAgo(1), isNew: true },
  { key: 'tc-byoc', title: 'BYOC setup flow', status: 'draft', stepCount: 5, createdAt: daysAgo(2), isNew: true },
  { key: 'tc-reset', title: 'Password reset', status: 'draft', stepCount: 6, createdAt: daysAgo(4) },
  { key: 'tc-coupon', title: 'Apply coupon at checkout', status: 'draft', stepCount: 4, createdAt: daysAgo(9), isNew: true, hasSideEffects: true },
  { key: 'tc-invite', title: 'Add a team member', status: 'draft', stepCount: 5, createdAt: daysAgo(13), hasSideEffects: true },

  /* Approved: the steps are accepted, nothing is scheduled. Ready to run on
     demand, and the state that exists so approving is not also scheduling. */
  { key: 'tc-export', title: 'Export report to CSV', status: 'approved', stepCount: 5, createdAt: daysAgo(3), tags: ['Reporting'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['paris'], schedule: null },
  { key: 'tc-2fa', title: 'Enable two-factor auth', status: 'approved', stepCount: 5, createdAt: daysAgo(16), tags: ['Auth', 'Security'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: null },

  /* Running, with two revisions waiting to be read. */
  { key: 'tc-checkout', title: 'Checkout flow', status: 'active', stepCount: 5, createdAt: daysAgo(62), tags: ['Checkout'], envNames: ['Production', 'Staging'], resolutions: ['desktop', 'mobile'], regions: ['paris', 'ny'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(2), version: 1, pendingRevision: { toVersion: 2, detectedAt: hoursAgo(3), changes: 4 } },
  { key: 'tc-login', title: 'Login flow', status: 'active', stepCount: 4, createdAt: daysAgo(88), tags: ['Auth'], envNames: ['QA'], resolutions: ['mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'failed', lastRunAt: hoursAgo(5) },
  { key: 'tc-search', title: 'Search & filter', status: 'active', stepCount: 4, createdAt: daysAgo(45), tags: ['Search'], envNames: ['Production'], resolutions: ['desktop', 'tablet'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(9), version: 2 },
  { key: 'tc-billing', title: 'Update billing card', status: 'active', stepCount: 4, createdAt: daysAgo(30), tags: ['Billing'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['ny'], schedule: MWF, lastResult: 'failed', lastRunAt: hoursAgo(11), version: 3 },
  { key: 'tc-create-project', title: 'Create project', status: 'active', stepCount: 4, createdAt: daysAgo(6), tags: ['Projects'], envNames: ['Production'], resolutions: ['desktop'], regions: ['paris'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(3) },
  { key: 'tc-invite-active', title: 'Invite teammate', status: 'active', stepCount: 3, createdAt: daysAgo(52), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(14) },
  { key: 'tc-2fa-active', title: 'Enable two-factor auth', status: 'active', stepCount: 4, createdAt: daysAgo(24), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(20) },
  { key: 'tc-invoice', title: 'Download invoice', status: 'active', stepCount: 3, createdAt: daysAgo(71), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop'], regions: ['paris'], schedule: { days: [1], time: '08:00' }, lastResult: 'passed', lastRunAt: hoursAgo(26) },
  { key: 'tc-profile', title: 'Upload profile photo', status: 'active', stepCount: 4, createdAt: daysAgo(11), tags: ['Profile'], envNames: ['Staging'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(30), version: 2, pendingRevision: { toVersion: 3, detectedAt: hoursAgo(26), changes: 1 } },

  { key: 'tc-onboarding-tour', title: 'Onboarding tour', status: 'paused', stepCount: 3, createdAt: daysAgo(95), tags: ['Onboarding'], envNames: ['Staging'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(72) },
  { key: 'tc-bulk-export', title: 'Bulk data export', status: 'paused', stepCount: 4, createdAt: daysAgo(58), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: null, lastResult: 'failed', lastRunAt: hoursAgo(96) },
  { key: 'tc-logout', title: 'Logout flow', status: 'active', stepCount: 3, createdAt: daysAgo(19), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop', 'mobile'], regions: ['ny'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(6) },
  { key: 'tc-add-payment', title: 'Add a payment method', status: 'active', stepCount: 3, createdAt: daysAgo(27), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop', 'mobile'], regions: ['paris'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(8) },
  { key: 'tc-remove-item', title: 'Remove item from cart', status: 'active', stepCount: 3, createdAt: daysAgo(34), tags: ['Checkout'], envNames: ['Production'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(10) },
  { key: 'tc-change-password', title: 'Change password', status: 'active', stepCount: 3, createdAt: daysAgo(41), tags: ['Auth'], envNames: ['QA'], resolutions: ['desktop'], regions: ['ny'], schedule: MWF, lastResult: 'failed', lastRunAt: hoursAgo(12) },
  { key: 'tc-export-csv', title: 'Export report as CSV', status: 'paused', stepCount: 3, createdAt: daysAgo(76), tags: ['Settings'], envNames: ['Staging'], resolutions: ['desktop'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(40) },
  { key: 'tc-filter-dashboard', title: 'Filter the dashboard', status: 'active', stepCount: 3, createdAt: daysAgo(8), tags: ['Search'], envNames: ['Production'], resolutions: ['desktop', 'tablet'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(13) },
  { key: 'tc-share-report', title: 'Share a report', status: 'active', stepCount: 3, createdAt: daysAgo(22), tags: ['Settings'], envNames: ['Production'], resolutions: ['desktop'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(15) },
  { key: 'tc-delete-account', title: 'Delete account', status: 'paused', stepCount: 3, createdAt: daysAgo(66), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['ny'], schedule: null, lastResult: 'passed', lastRunAt: hoursAgo(120) },
  { key: 'tc-apply-theme', title: 'Switch to dark mode', status: 'active', stepCount: 3, createdAt: daysAgo(37), tags: ['Profile'], envNames: ['Staging'], resolutions: ['desktop', 'mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(18) },
  { key: 'tc-resend-invite', title: 'Resend a team invite', status: 'active', stepCount: 3, createdAt: daysAgo(49), tags: ['Settings'], envNames: ['QA'], resolutions: ['desktop'], regions: ['paris'], schedule: WEEKDAYS, lastResult: 'failed', lastRunAt: hoursAgo(22) },
  { key: 'tc-upgrade-plan', title: 'Upgrade plan', status: 'active', stepCount: 3, createdAt: daysAgo(83), tags: ['Billing'], envNames: ['Production'], resolutions: ['desktop'], regions: ['ny'], schedule: EVERY_DAY, lastResult: 'passed', lastRunAt: hoursAgo(24) },
  { key: 'tc-search-empty', title: 'Search with no results', status: 'active', stepCount: 3, createdAt: daysAgo(15), tags: ['Search'], envNames: ['Production'], resolutions: ['mobile'], regions: ['sao-paulo'], schedule: WEEKDAYS, lastResult: 'passed', lastRunAt: hoursAgo(27) },
  /* The worst case the layout has to survive: 50 steps, one environment, and a
     name long enough to want the column to itself. */
  { key: 'tc-regression', title: 'Full regression sweep', status: 'active', stepCount: 50, createdAt: daysAgo(5), tags: ['Regression'], envNames: ['Staging'], resolutions: ['desktop'], regions: ['paris'], schedule: { days: [1], time: '05:00' }, lastResult: 'failed', lastRunAt: hoursAgo(26) },
];
