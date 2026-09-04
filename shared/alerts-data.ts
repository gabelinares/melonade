/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT ANALYTICS — ALERTS.

   An alert watches one metric and fires when it crosses a line. Production
   prints each row as a sentence rather than a set of fields - "When the error
   rate is above 5% over the past hour, notify via Slack" - because that
   sentence IS the rule, the same way an audit's scope line under its name is
   what the name means. `ruleSentence` keeps that in one place so the list and
   any future edit screen cannot phrase it two ways.
   ═══════════════════════════════════════════════════════════════════════════ */

export type DetectionMethod = 'threshold' | 'change';
export type Operator = 'above' | 'below';

export interface Alert {
  id: number;
  name: string;
  detectionMethod: DetectionMethod;
  metricName: string;
  operator: Operator;
  thresholdValue: number;
  unit: string;
  periodMinutes: 15 | 30 | 60 | 120 | 240 | 1440;
  notifyVia: string;
  updatedAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(NOW - d * DAY);
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
};

export const ALERTS: readonly Alert[] = [
  {
    id: 1,
    name: 'Checkout error spike',
    detectionMethod: 'threshold',
    metricName: 'error rate',
    operator: 'above',
    thresholdValue: 5,
    unit: '%',
    periodMinutes: 60,
    notifyVia: 'Slack (#alerts)',
    updatedAt: daysAgo(0, 9),
  },
  {
    id: 2,
    name: 'Sign-up drop',
    detectionMethod: 'change',
    metricName: 'sign-ups',
    operator: 'below',
    thresholdValue: 20,
    unit: '%',
    periodMinutes: 1440,
    notifyVia: 'Email',
    updatedAt: daysAgo(2, 14),
  },
  {
    id: 3,
    name: 'Slow page loads',
    detectionMethod: 'threshold',
    metricName: 'page load time',
    operator: 'above',
    thresholdValue: 4000,
    unit: 'ms',
    periodMinutes: 30,
    notifyVia: 'Slack (#eng-alerts)',
    updatedAt: daysAgo(4, 11),
  },
  {
    id: 4,
    name: 'Support volume surge',
    detectionMethod: 'change',
    metricName: 'support tickets',
    operator: 'above',
    thresholdValue: 50,
    unit: '%',
    periodMinutes: 240,
    notifyVia: 'OpenReplay',
    updatedAt: daysAgo(8, 16),
  },
  {
    id: 5,
    name: 'Rage clicks — pricing',
    detectionMethod: 'threshold',
    metricName: 'rage clicks',
    operator: 'above',
    thresholdValue: 30,
    unit: 'sessions',
    periodMinutes: 120,
    notifyVia: 'Slack (#alerts)',
    updatedAt: daysAgo(13, 10),
  },
  {
    id: 6,
    name: 'Session duration collapse',
    detectionMethod: 'change',
    metricName: 'session duration',
    operator: 'below',
    thresholdValue: 15,
    unit: '%',
    periodMinutes: 1440,
    notifyVia: 'Email',
    updatedAt: daysAgo(20, 9),
  },
  {
    id: 7,
    name: 'API latency',
    detectionMethod: 'threshold',
    metricName: 'p95 latency',
    operator: 'above',
    thresholdValue: 800,
    unit: 'ms',
    periodMinutes: 15,
    notifyVia: 'Slack (#eng-alerts)',
    updatedAt: daysAgo(31, 13),
  },
  {
    id: 8,
    name: 'Churn week over week',
    detectionMethod: 'change',
    metricName: 'churned accounts',
    operator: 'above',
    thresholdValue: 10,
    unit: '%',
    periodMinutes: 1440,
    notifyVia: 'OpenReplay',
    updatedAt: daysAgo(45, 11),
  },
];

const PERIOD_LABELS: Record<Alert['periodMinutes'], string> = {
  15: '15 minutes',
  30: '30 minutes',
  60: '1 hour',
  120: '2 hours',
  240: '4 hours',
  1440: '1 day',
};

/** The rule, as a sentence: what production actually prints on the row. */
export function ruleSentence(a: Alert): string {
  const value = `${a.thresholdValue}${a.unit}`;
  const clause = a.detectionMethod === 'change' ? `changes by ${value}` : `is ${a.operator} ${value}`;
  return `When the ${a.metricName} ${clause} over the past ${PERIOD_LABELS[a.periodMinutes]}, notify via ${a.notifyVia}.`;
}

export interface AlertsState {
  query: string;
}

export const INITIAL_ALERTS_STATE: AlertsState = { query: '' };

export const matchesAlertQuery = (a: Alert, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || a.name.toLowerCase().includes(q) || a.metricName.toLowerCase().includes(q);
};

export function filterAlerts(alerts: readonly Alert[], state: AlertsState): Alert[] {
  return alerts.filter((a) => matchesAlertQuery(a, state.query));
}
