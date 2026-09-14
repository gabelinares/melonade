/* ══════════════════════════════════════════════════════════════════════════
   WHAT SITS BEHIND A PRODUCT ANALYTICS ROW (2026-09-14).

   Dashboards, Cards and Alerts shipped on 09-04 as shelves with a StubDrawer
   on every row. This is what the rows open onto, derived from the fixtures
   that exist rather than invented beside them: a dashboard's widgets are
   CARDS, a card's drilldown sessions are SESSIONS, an alert's vocabulary is
   the ALERTS fixture's own metric names. Everything is deterministic on a
   string hash, so the same row opens onto the same detail every time.

   Production's shapes, read out of the code (see DESIGN.md §43):
   `Dashboard/components/DashboardView`, `WidgetView` + `WidgetFormNew`,
   `Alerts/NewAlert` + `AlertForm/*`.
   ══════════════════════════════════════════════════════════════════════════ */

import { CARDS, type Card, type CardType } from './cards-data.ts';
import type { Dashboard } from './dashboards-data.ts';
import { ALERTS, type Alert, type DetectionMethod, type Operator } from './alerts-data.ts';
import { EVENTS } from './events-data.ts';
import { SESSIONS, type SessionRow } from './sessions-data.ts';

/* The same stable hash data-management-logic uses; copied rather than
   imported so the two fixture families do not depend on each other. */
const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const unit = (seed: string): number => (hashOf(seed) % 10_000) / 10_000;

/* ── WIDGETS ON A DASHBOARD ───────────────────────────────────────────────── */

/** How many of the grid's four columns a card takes. A funnel and a path are
 *  read left to right and need the row; the rest sit two to a row. */
export const COL_SPAN: Record<CardType, 1 | 2 | 3 | 4> = {
  timeseries: 2,
  table: 2,
  heatmap: 2,
  funnel: 4,
  pathAnalysis: 4,
};

export interface Widget {
  cardId: number;
  span: 1 | 2 | 3 | 4;
}

/** Three to six cards per dashboard, chosen on the dashboard's id, always in
 *  the same order. The card's own type decides its span. */
export function initialWidgets(d: Dashboard): Widget[] {
  const n = 3 + (hashOf(`dash:${d.id}`) % 4);
  const ranked = [...CARDS].sort((a, b) => hashOf(`${d.id}:${a.id}`) - hashOf(`${d.id}:${b.id}`));
  return ranked.slice(0, n).map((c) => ({ cardId: c.id, span: COL_SPAN[c.type] }));
}

/* ── A CARD'S DATA ────────────────────────────────────────────────────────── */

export interface Point {
  /** Epoch ms, the start of that day. */
  at: number;
  value: number;
}
export interface Row {
  label: string;
  value: number;
}
export interface Heat {
  /** Row labels (pages), column labels (hours), and values[row][col] 0..1. */
  rows: string[];
  cols: string[];
  values: number[][];
}
export interface Path {
  steps: string[];
  sessions: number;
}

const DAY = 24 * 60 * 60 * 1000;
const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Fourteen daily points, a base level with a gentle trend and a weekly
 *  dip - the shape a real metric has, not noise. Stable on the card. */
export function seriesOf(card: Pick<Card, 'id' | 'name'>, days = 14, now = Date.now()): Point[] {
  const seed = `series:${card.id}`;
  const base = 120 + (hashOf(seed) % 900);
  const trend = (unit(seed + 't') - 0.4) * base * 0.03;
  const today = dayStart(now);
  return Array.from({ length: days }, (_, i) => {
    const at = today - (days - 1 - i) * DAY;
    const dow = new Date(at).getDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const wobble = 0.85 + unit(`${seed}:${i}`) * 0.3;
    return { at, value: Math.max(0, Math.round((base + trend * i) * weekend * wobble)) };
  });
}

const FUNNEL_STEPS: Record<string, string[]> = {
  default: ['Visited pricing', 'Started checkout', 'Entered payment', 'Completed order'],
  mobile: ['Opened app', 'Signed in', 'Reached home', 'Completed task'],
};

/** Four steps, each a share of the one before it. */
export function funnelOf(card: Pick<Card, 'id' | 'name'>): Row[] {
  const names = /mobile/i.test(card.name) ? FUNNEL_STEPS.mobile! : FUNNEL_STEPS.default!;
  const seed = `funnel:${card.id}`;
  let n = 2400 + (hashOf(seed) % 6000);
  return names.map((label, i) => {
    if (i > 0) n = Math.round(n * (0.42 + unit(`${seed}:${i}`) * 0.4));
    return { label, value: n };
  });
}

const TABLE_ROWS: Record<string, string[]> = {
  errors: ["TypeError: Cannot read properties of undefined", 'ChunkLoadError: Loading chunk 42 failed', 'NetworkError when attempting to fetch', 'ReferenceError: gtag is not defined', 'RangeError: Maximum call stack size exceeded', 'SyntaxError: Unexpected token <'],
  tickets: ['Billing question', 'Cannot sign in', 'Export failed', 'Missing invoice', 'Feature request', 'Other'],
  churn: ['Northwind', 'Vantage', 'Brightline', 'Meridian', 'Lattice', 'Harbourpoint'],
  default: ['/checkout', '/pricing', '/dashboard', '/settings/billing', '/onboarding/step-2', '/search'],
};

/** Six rows, largest first. */
export function tableOf(card: Pick<Card, 'id' | 'name'>): Row[] {
  const key = /error/i.test(card.name) ? 'errors' : /ticket|support/i.test(card.name) ? 'tickets' : /churn/i.test(card.name) ? 'churn' : 'default';
  const seed = `table:${card.id}`;
  return TABLE_ROWS[key]!
    .map((label, i) => ({ label, value: 40 + (hashOf(`${seed}:${i}`) % 1400) }))
    .sort((a, b) => b.value - a.value);
}

/** Five pages by seven hours, a value in 0..1 per cell. */
export function heatOf(card: Pick<Card, 'id' | 'name'>): Heat {
  const rows = TABLE_ROWS.default!.slice(0, 5);
  const cols = ['9am', '11am', '1pm', '3pm', '5pm', '7pm', '9pm'];
  const seed = `heat:${card.id}`;
  const values = rows.map((_, r) => cols.map((__, c) => Math.round(unit(`${seed}:${r}:${c}`) * 100) / 100));
  return { rows, cols, values };
}

/** Five paths through the product, most travelled first. */
export function pathsOf(card: Pick<Card, 'id' | 'name'>): Path[] {
  const seed = `path:${card.id}`;
  const shapes: string[][] = [
    ['/', '/pricing', '/signup', '/onboarding/step-1'],
    ['/', '/dashboard', '/sessions', '/session/:id'],
    ['/login', '/dashboard', '/settings/billing'],
    ['/', '/docs', '/pricing'],
    ['/dashboard', '/search', '/session/:id', '/issues'],
  ];
  return shapes
    .map((steps, i) => ({ steps, sessions: 80 + (hashOf(`${seed}:${i}`) % 1800) }))
    .sort((a, b) => b.sessions - a.sessions);
}

/** The recordings a card drills down into: a stable subset of SESSIONS. */
export function drilldownSessionsOf(card: Pick<Card, 'id'>): SessionRow[] {
  return SESSIONS.filter((s) => hashOf(`drill:${card.id}:${s.sessionId}`) % 3 !== 0).slice(0, 8);
}

/* ── THE CARD BUILDER'S OWN STATE ─────────────────────────────────────────── */

export interface Series {
  id: string;
  name: string;
  /** Event names from the EVENTS catalogue. */
  steps: string[];
}

export type MetricOf = 'sessions' | 'users' | 'events';
export type SortBy = 'latest' | 'sessions' | 'users';

export interface CardDefinition {
  series: Series[];
  metricOf: MetricOf;
  sortBy: SortBy;
}

export const MAX_SERIES = 3;

/** One series to start with, seeded on the card so it opens the same way
 *  each time - a card without any series is a chart of nothing. */
export function initialDefinition(card: Pick<Card, 'id' | 'type'>): CardDefinition {
  const names = EVENTS.map((e) => e.name);
  const pick = (i: number) => names[hashOf(`def:${card.id}:${i}`) % names.length]!;
  const steps = card.type === 'funnel' ? [pick(0), pick(1), pick(2)] : [pick(0)];
  return { series: [{ id: 's1', name: 'Series 1', steps }], metricOf: 'sessions', sortBy: 'latest' };
}

export const STEP_OPTIONS = EVENTS.map((e) => ({ value: e.name, label: e.displayName }));

/* ── THE ALERT FORM'S VOCABULARY ──────────────────────────────────────────── */

export interface MetricOption {
  value: string;
  label: string;
  unit: string;
}

/** The fixture's own metrics first, then the rest of what production offers. */
export const METRIC_OPTIONS: readonly MetricOption[] = (() => {
  const seen = new Map<string, string>();
  for (const a of ALERTS) if (!seen.has(a.metricName)) seen.set(a.metricName, a.unit);
  const extra: [string, string][] = [
    ['avg. cpu load', '%'],
    ['avg. memory used', 'MB'],
    ['dom build time', 'ms'],
    ['time to first byte', 'ms'],
    ['errors count', ''],
    ['sessions count', ''],
  ];
  for (const [m, u] of extra) if (!seen.has(m)) seen.set(m, u);
  return Array.from(seen, ([value, u]) => ({ value, label: value.replace(/^\w/, (c) => c.toUpperCase()), unit: u }));
})();

export const OPERATOR_OPTIONS: readonly { value: Operator; label: string }[] = [
  { value: 'above', label: 'above' },
  { value: 'below', label: 'below' },
];

export const PERIOD_OPTIONS: readonly { value: Alert['periodMinutes']; label: string }[] = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '1 day' },
];

export type Channel = 'slack' | 'teams' | 'email' | 'webhook';
export const CHANNELS: readonly { key: Channel; label: string }[] = [
  { key: 'slack', label: 'Slack' },
  { key: 'teams', label: 'MS Teams' },
  { key: 'email', label: 'Email' },
  { key: 'webhook', label: 'Webhook' },
];
export const SLACK_CHANNELS = ['#alerts', '#eng-alerts', '#product', '#on-call'];
export const TEAMS_CHANNELS = ['Engineering', 'Product', 'Support'];
export const WEBHOOKS = ['PagerDuty', 'Opsgenie', 'Zapier'];

export const DETECTION_HELP: Record<DetectionMethod, string> = {
  threshold: 'Eg. When Threshold is above 1ms over the past 15mins, notify me through Slack #foss-notifications.',
  change: 'Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.',
};

/** What the form edits: an Alert, plus the channel detail production keeps
 *  per hook. `notifyVia` is rebuilt from the channels on save so the list's
 *  sentence stays truthful. */
export interface AlertDraft {
  name: string;
  detectionMethod: DetectionMethod;
  changeKind: 'change' | 'percent';
  metricName: string;
  operator: Operator;
  thresholdValue: number | null;
  periodMinutes: Alert['periodMinutes'];
  comparePeriodMinutes: Alert['periodMinutes'];
  channels: Channel[];
  slack: string[];
  teams: string[];
  emails: string[];
  webhook: string | null;
}

export function draftOf(a: Alert | null): AlertDraft {
  const via = a?.notifyVia ?? '';
  const slackMatch = via.match(/Slack \(([^)]+)\)/);
  return {
    name: a?.name ?? '',
    detectionMethod: a?.detectionMethod ?? 'threshold',
    changeKind: 'change',
    metricName: a?.metricName ?? '',
    operator: a?.operator ?? 'above',
    thresholdValue: a?.thresholdValue ?? null,
    periodMinutes: a?.periodMinutes ?? 15,
    comparePeriodMinutes: a?.periodMinutes ?? 15,
    channels: [
      ...(slackMatch ? (['slack'] as Channel[]) : []),
      ...(/Email/.test(via) ? (['email'] as Channel[]) : []),
      ...(/Teams/.test(via) ? (['teams'] as Channel[]) : []),
      ...(/Webhook/.test(via) ? (['webhook'] as Channel[]) : []),
    ],
    slack: slackMatch ? [slackMatch[1]!] : [],
    teams: [],
    emails: /Email/.test(via) ? ['you@openreplay.com'] : [],
    webhook: null,
  };
}

export function draftIsValid(d: AlertDraft): boolean {
  if (!d.name.trim() || !d.metricName || d.thresholdValue == null || Number.isNaN(d.thresholdValue)) return false;
  if (d.channels.includes('slack') && d.slack.length === 0) return false;
  if (d.channels.includes('teams') && d.teams.length === 0) return false;
  if (d.channels.includes('email') && d.emails.length === 0) return false;
  if (d.channels.includes('webhook') && !d.webhook) return false;
  return true;
}

/** "Slack (#alerts), Email" - or "OpenReplay" when only the in-app bell. */
export function notifyViaOf(d: AlertDraft): string {
  const parts: string[] = [];
  if (d.channels.includes('slack') && d.slack.length) parts.push(`Slack (${d.slack.join(', ')})`);
  if (d.channels.includes('teams') && d.teams.length) parts.push(`MS Teams (${d.teams.join(', ')})`);
  if (d.channels.includes('email') && d.emails.length) parts.push('Email');
  if (d.channels.includes('webhook') && d.webhook) parts.push(`Webhook (${d.webhook})`);
  return parts.length ? parts.join(', ') : 'OpenReplay';
}

export function alertFromDraft(d: AlertDraft, base: Pick<Alert, 'id'> & Partial<Alert>): Alert {
  const metric = METRIC_OPTIONS.find((m) => m.value === d.metricName);
  return {
    id: base.id,
    name: d.name.trim(),
    detectionMethod: d.detectionMethod,
    metricName: d.metricName,
    operator: d.operator,
    thresholdValue: d.thresholdValue ?? 0,
    unit: d.detectionMethod === 'change' && d.changeKind === 'percent' ? '%' : (metric?.unit ?? base.unit ?? ''),
    periodMinutes: d.periodMinutes,
    notifyVia: notifyViaOf(d),
    updatedAt: Date.now(),
  };
}

export const sameDraft = (a: AlertDraft, b: AlertDraft): boolean => JSON.stringify(a) === JSON.stringify(b);
