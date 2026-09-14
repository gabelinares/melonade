import { Checkbox, Input, Segmented, Select } from 'antd';
import type { Alert } from '@shared/alerts-data.ts';
import {
  CHANNELS,
  DETECTION_HELP,
  METRIC_OPTIONS,
  OPERATOR_OPTIONS,
  PERIOD_OPTIONS,
  SLACK_CHANNELS,
  TEAMS_CHANNELS,
  WEBHOOKS,
  type AlertDraft,
  type Channel,
} from '@shared/analytics-logic.ts';
import './product-analytics.css';

export interface AlertFormProps {
  draft: AlertDraft;
  onChange: (d: AlertDraft) => void;
  /** Production's page has the name as an editable h1; the drawer needs it
   *  as a field. */
  withName?: boolean;
}

/**
 * THE ALERT FORM - production's `NewAlert` sections, one component whether it
 * is the page an Alerts row opens or the drawer a card's "Set alerts" opens.
 * Three numbered steps on a rail, in production's own words: what it is
 * based on, the condition, and where to be told.
 */
export function AlertForm({ draft, onChange, withName }: AlertFormProps) {
  const set = <K extends keyof AlertDraft>(k: K, v: AlertDraft[K]) => onChange({ ...draft, [k]: v });
  const metric = METRIC_OPTIONS.find((m) => m.value === draft.metricName);
  const unit = draft.detectionMethod === 'change' && draft.changeKind === 'percent' ? '%' : metric?.unit ?? '';
  const change = draft.detectionMethod === 'change';
  const toggleChannel = (c: Channel) =>
    set('channels', draft.channels.includes(c) ? draft.channels.filter((x) => x !== c) : [...draft.channels, c]);

  return (
    <div className="m-alertf">
      {withName && (
        <Step n={0} title="Name">
          <Input value={draft.name} placeholder="What this alert watches" onChange={(e) => set('name', e.target.value)} />
        </Step>
      )}
      <Step n={1} title="Alert based on">
        <Segmented
          size="small"
          value={draft.detectionMethod}
          onChange={(v) => set('detectionMethod', v as Alert['detectionMethod'])}
          options={[
            { value: 'threshold', label: 'Threshold' },
            { value: 'change', label: 'Change' },
          ]}
        />
        <p className="m-alertf__help">{DETECTION_HELP[draft.detectionMethod]}</p>
      </Step>

      <Step n={2} title="Condition">
        {change && (
          <div className="m-alertf__row">
            <span className="m-alertf__word">Trigger when</span>
            <Select
              size="small"
              value={draft.changeKind}
              onChange={(v) => set('changeKind', v)}
              options={[
                { value: 'change', label: 'change' },
                { value: 'percent', label: '% change' },
              ]}
              popupMatchSelectWidth={false}
            />
          </div>
        )}
        <div className="m-alertf__row">
          <span className="m-alertf__word">{change ? 'of' : 'Trigger when'}</span>
          <Select
            size="small"
            className="m-alertf__metric"
            placeholder="Select metric"
            value={draft.metricName || undefined}
            onChange={(v) => set('metricName', v)}
            options={METRIC_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
            showSearch
          />
          <span className="m-alertf__word">is</span>
          <Select
            size="small"
            placeholder="Select condition"
            value={draft.operator}
            onChange={(v) => set('operator', v)}
            options={[...OPERATOR_OPTIONS]}
            popupMatchSelectWidth={false}
          />
          <Input
            size="small"
            className="m-alertf__value"
            placeholder="Specify value"
            inputMode="decimal"
            value={draft.thresholdValue ?? ''}
            suffix={unit || undefined}
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value);
              set('thresholdValue', n);
            }}
          />
        </div>
        <div className="m-alertf__row">
          <span className="m-alertf__word">over the past</span>
          <Select
            size="small"
            placeholder="Select timeframe"
            value={draft.periodMinutes}
            onChange={(v) => set('periodMinutes', v)}
            options={[...PERIOD_OPTIONS]}
            popupMatchSelectWidth={false}
          />
          {change && (
            <>
              <span className="m-alertf__word">compared to previous</span>
              <Select
                size="small"
                value={draft.comparePeriodMinutes}
                onChange={(v) => set('comparePeriodMinutes', v)}
                options={[...PERIOD_OPTIONS]}
                popupMatchSelectWidth={false}
              />
            </>
          )}
        </div>
      </Step>

      <Step n={3} title="Notify through">
        <p className="m-alertf__help">You'll be notified in app. Additionally opt in to receive alerts on:</p>
        <div className="m-alertf__channels">
          {CHANNELS.map((c) => (
            <Checkbox key={c.key} checked={draft.channels.includes(c.key)} onChange={() => toggleChannel(c.key)}>
              {c.label}
            </Checkbox>
          ))}
        </div>
        {draft.channels.includes('slack') && (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">Slack</span>
            <Select
              size="small"
              mode="multiple"
              className="m-alertf__wide"
              placeholder="Select channel"
              value={draft.slack}
              onChange={(v) => set('slack', v)}
              options={SLACK_CHANNELS.map((s) => ({ value: s, label: s }))}
            />
          </div>
        )}
        {draft.channels.includes('teams') && (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">MS Teams</span>
            <Select
              size="small"
              mode="multiple"
              className="m-alertf__wide"
              placeholder="Select channel"
              value={draft.teams}
              onChange={(v) => set('teams', v)}
              options={TEAMS_CHANNELS.map((s) => ({ value: s, label: s }))}
            />
          </div>
        )}
        {draft.channels.includes('email') && (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">Email</span>
            <Select
              size="small"
              mode="tags"
              className="m-alertf__wide"
              placeholder="Type and press Enter"
              value={draft.emails}
              onChange={(v) => set('emails', v)}
              open={false}
              suffixIcon={null}
            />
          </div>
        )}
        {draft.channels.includes('webhook') && (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">Webhook</span>
            <Select
              size="small"
              className="m-alertf__wide"
              placeholder="Select webhook"
              value={draft.webhook ?? undefined}
              onChange={(v) => set('webhook', v)}
              options={WEBHOOKS.map((s) => ({ value: s, label: s }))}
            />
          </div>
        )}
      </Step>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="m-alertf__step">
      <span className="m-alertf__index" aria-hidden="true">{n || '·'}</span>
      <div className="m-alertf__body">
        <h3 className="m-alertf__title">{title}</h3>
        {children}
      </div>
    </section>
  );
}
