/* ═══════════════════════════════════════════════════════════════════════════
   RUNS: what actually happened when the agent executed a test.

   A run is one test, one version of its steps, against one concrete
   combination of environment, viewport and region. A test describes a MATRIX
   of those; a run is a single cell of it, which is why the two lists cannot be
   one list and why Runs is a tab rather than a column.

   The one rule worth knowing before designing anything here: a run cannot be
   paused or stopped once it has started. It is running, it passed, or it
   failed. Pausing lives on the TEST, where it stops further executions.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Resolution } from './tests-data.ts';

export type RunStatus = 'running' | 'passed' | 'failed';

export interface RunData {
  key: string;
  /** Runs are linked to tests by NAME, which is also why renaming a test keeps
   *  its history. */
  testName: string;
  /** Which version of the steps this run executed. A run older than a version
   *  bump ran the previous steps, and saying so is the point of the label. */
  version?: number;
  /** When the run started. */
  date: number;
  /** Absent while running - the elapsed time is counted live instead. */
  duration?: number;
  status: RunStatus;
  stepCount: number;
  /** 1-based index of the step that failed, and what it said. */
  failedStep?: number;
  error?: string;
  envName?: string;
  resolution?: Resolution;
  region?: string;
  tags?: string[];
}

/** What a step did when the run executed it. `unknown` is a real answer while a
 *  run is in flight: the runner reports as it goes, so "we have not heard yet"
 *  is not the same as "pending" and guessing between them is how a live drawer
 *  starts lying. */
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'running' | 'unknown';

export interface RunStep {
  text: string;
  status: StepStatus;
  /** How many screenshots this step captured. */
  shots: number;
}

export type ConsoleLevel = 'log' | 'warn' | 'error';
export interface ConsoleLine {
  level: ConsoleLevel;
  text: string;
  /** ms into the run */
  at: number;
}

export interface NetworkCall {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  status: number;
  /** ms */
  time: number;
  size: number;
  /** The phases the HAR viewer breaks a request into, in ms. */
  timing: { blocked: number; dns: number; connect: number; send: number; wait: number; receive: number };
}

export const REGIONS: readonly { value: string; label: string }[] = [
  { value: 'paris', label: 'Paris' },
  { value: 'ny', label: 'New York' },
  { value: 'sao-paulo', label: 'São Paulo' },
];

export const RESOLUTIONS: readonly { value: Resolution; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export const regionLabel = (r?: string): string => REGIONS.find((o) => o.value === r)?.label ?? '—';
export const resolutionLabel = (r?: Resolution): string =>
  RESOLUTIONS.find((o) => o.value === r)?.label ?? 'Desktop';

/** Seconds to one decimal over a second, milliseconds under it. Runs are tens
 *  of seconds long, so minutes never appear and neither does a padded zero. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** The elapsed time of a run still in flight, as the same string. */
export function elapsed(startedAt: number, now: number): string {
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── the seed ─────────────────────────────────────────────────────────────── */

const HOUR = 3600000;
const NOW = Date.now();
const ago = (h: number) => NOW - h * HOUR;

const NAMED: RunData[] = [
  {
    key: 'r-regression',
    testName: 'Full regression sweep',
    date: ago(26),
    duration: 184000,
    status: 'failed',
    stepCount: 50,
    failedStep: 33,
    error: 'Row not found — timed out after 10s waiting for the new billing entry.',
    envName: 'Staging',
    resolution: 'desktop',
    region: 'paris',
    tags: ['Regression'],
  },
  {
    key: 'r1',
    testName: 'Checkout flow',
    date: ago(0.1),
    status: 'running',
    stepCount: 5,
    envName: 'Production',
    resolution: 'desktop',
    region: 'paris',
    tags: ['Checkout'],
  },
  {
    key: 'r1b',
    testName: 'Log in to console',
    date: ago(0.02),
    status: 'running',
    stepCount: 4,
    envName: 'Production',
    resolution: 'desktop',
    region: 'paris',
    tags: ['Auth'],
  },
  {
    key: 'r2',
    testName: 'Login flow',
    date: ago(2),
    duration: 5430,
    status: 'failed',
    stepCount: 4,
    failedStep: 2,
    error: 'Submit button not found — timed out after 5s waiting for [type="submit"].',
    envName: 'QA',
    resolution: 'mobile',
    region: 'ny',
    tags: ['Auth'],
  },
  { key: 'r3', testName: 'Checkout flow', date: ago(4), duration: 2100, status: 'passed', stepCount: 5, envName: 'Production', tags: ['Checkout'] },
  { key: 'r4', testName: 'Search & filter', version: 2, date: ago(7), duration: 1800, status: 'passed', stepCount: 4, envName: 'Production', tags: ['Search'] },
  {
    key: 'r5',
    testName: 'Update billing card',
    version: 3,
    date: ago(28),
    duration: 4200,
    status: 'failed',
    stepCount: 4,
    failedStep: 2,
    error: 'Card field rejected input — Stripe iframe did not load in time.',
    envName: 'Staging',
    resolution: 'tablet',
    region: 'sao-paulo',
    tags: ['Billing'],
  },
  { key: 'r6', testName: 'Checkout flow', date: ago(288), duration: 2400, status: 'passed', stepCount: 5, envName: 'Production', tags: ['Checkout'] },
  { key: 'r7', testName: 'Login flow', date: ago(480), duration: 1900, status: 'passed', stepCount: 4, envName: 'QA', tags: ['Auth'] },
  { key: 'r8', testName: 'Create project', date: ago(50), duration: 2600, status: 'passed', stepCount: 4, envName: 'Production', tags: ['Projects'] },
  { key: 'r9', testName: 'Checkout flow', date: ago(54), duration: 2200, status: 'passed', stepCount: 5, envName: 'Production', tags: ['Checkout'] },
];

/* Volume, so pagination and the filters have something to bite on. Generated
   rather than written out: seventy hand-typed rows would be seventy chances to
   contradict the six tests they belong to. */
const CYCLE = [
  { testName: 'Login flow', env: 'QA', resolution: 'mobile' as Resolution, region: 'ny', tags: ['Auth'] },
  { testName: 'Search & filter', env: 'Production', resolution: 'desktop' as Resolution, region: 'paris', tags: ['Search'] },
  { testName: 'Create project', env: 'Production', resolution: 'desktop' as Resolution, region: 'paris', tags: ['Projects'] },
  { testName: 'Update billing card', env: 'Staging', resolution: 'tablet' as Resolution, region: 'sao-paulo', tags: ['Billing'] },
  { testName: 'Invite teammate', env: 'QA', resolution: 'desktop' as Resolution, region: 'ny', tags: ['Settings'] },
  { testName: 'Logout flow', env: 'QA', resolution: 'mobile' as Resolution, region: 'ny', tags: ['Auth'] },
  { testName: 'Checkout flow', env: 'Production', resolution: 'desktop' as Resolution, region: 'paris', tags: ['Checkout'] },
];

/** When each versioned test's steps last changed. A run before that date shows
 *  the previous version, which is what makes the label worth printing. */
const VERSIONED: Record<string, { current: number; since: number }> = {
  'Search & filter': { current: 2, since: ago(12 * 24) },
  'Update billing card': { current: 3, since: ago(10 * 24) },
};

const GENERATED: RunData[] = Array.from({ length: 70 }, (_, i) => {
  const d = CYCLE[i % CYCLE.length]!;
  const failed = i % 5 === 2;
  const date = ago(58 + i * 6);
  const rv = VERSIONED[d.testName];
  return {
    key: `r${10 + i}`,
    testName: d.testName,
    ...(rv ? { version: date >= rv.since ? rv.current : rv.current - 1 } : {}),
    date,
    duration: 1500 + ((i * 370) % 4200),
    status: (failed ? 'failed' : 'passed') as RunStatus,
    stepCount: 3,
    ...(failed ? { failedStep: 1, error: 'Assertion failed — element not found within 5s.' } : {}),
    envName: d.env,
    resolution: d.resolution,
    region: d.region,
    tags: [...d.tags],
  };
});

export const RUNS: readonly RunData[] = [...NAMED, ...GENERATED];
