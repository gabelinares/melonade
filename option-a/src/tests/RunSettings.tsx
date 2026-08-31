import { Select } from 'antd';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { DAY_SHORT, ordinal, type Environment, type Resolution, type Schedule, type ScheduleFreq, scheduleFreq } from '@shared/tests-data.ts';
import { REGIONS, RESOLUTIONS } from '@shared/runs-data.ts';
import { Field } from '../components/EntityDrawer.tsx';
import { noNativeTooltip } from '../components/selectOptions.ts';
import './run-settings.css';

export interface RunSettingsValue {
  envNames?: string[];
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
}

const VIEWPORT_ICON: Record<Resolution, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_DAYS = [1, 2, 3, 4, 5];

/** Every hour, on the hour. A test that has to run at 09:17 is a test with a
 *  cron expression, and a cron expression is a field this page does not want. */
const TIMES = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, '0')}:00`;
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:00 ${period}` };
});

/** 1-28 and "the last day". Nothing above 28, because a monthly test that
 *  silently skips February is worse than one that runs a day early. */
const DAYS_OF_MONTH = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `the ${ordinal(i + 1)}` })),
  { value: '0', label: 'the last day' },
];

const FREQS: { value: ScheduleFreq | 'never'; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom days' },
];

/**
 * ════════════════════════════════════════════════════════════════════════════
 * WHERE A TEST RUNS, AND WHEN.
 *
 * Environment, viewport and region are MULTI-SELECT, because a test describes a
 * matrix and a run is one cell of it. They share one row: three narrow cells
 * that summarise ("2 selected") rather than three stacks of chips, so picking a
 * second environment cannot change the height of the drawer.
 *
 * The schedule is FREQUENCY FIRST - pick Every day / Weekdays / Weekly /
 * Monthly / Custom, then a time - and the day picker only exists for the two
 * frequencies that need one. The alternative, a row of seven day toggles that
 * is always visible, asks everybody to answer a question that has one obvious
 * answer nine times out of ten.
 *
 * "Never" is a real option rather than a cleared field: a test with no schedule
 * runs when you ask it to, which is a decision and not an omission.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function RunSettings({
  value,
  environments,
  onChange,
}: {
  value: RunSettingsValue;
  environments: readonly Environment[];
  onChange: (patch: Partial<RunSettingsValue>) => void;
}) {
  const freq = scheduleFreq(value.schedule) ?? 'never';
  const time = value.schedule?.time ?? '09:00';
  const days = value.schedule?.days ?? [];

  /* Each frequency builds a whole schedule, carrying the time across, so
     switching from Weekly to Monthly never leaves a half-set object behind. */
  const setFreq = (f: ScheduleFreq | 'never') => {
    if (f === 'never') return onChange({ schedule: null });
    if (f === 'daily') return onChange({ schedule: { freq: f, days: ALL_DAYS, time } });
    if (f === 'weekdays') return onChange({ schedule: { freq: f, days: WEEKDAY_DAYS, time } });
    if (f === 'weekly') return onChange({ schedule: { freq: f, days: [days[0] ?? 1], time } });
    if (f === 'monthly')
      return onChange({ schedule: { freq: f, days: [], dayOfMonth: value.schedule?.dayOfMonth ?? 1, time } });
    return onChange({ schedule: { freq: f, days: days.length ? days : [1, 3, 5], time } });
  };

  const setTime = (t: string) =>
    onChange({ schedule: { ...(value.schedule ?? { days: ALL_DAYS, freq: 'daily' }), time: t } });

  const toggleDay = (d: number) => {
    if (!value.schedule) return;
    const on = days.includes(d);
    /* Weekly is one day by construction: clicking another day MOVES it rather
       than adding a second, which is what "weekly" means. */
    const next = freq === 'weekly' ? [d] : on ? days.filter((x) => x !== d) : [...days, d].sort();
    if (next.length === 0) return;
    onChange({ schedule: { ...value.schedule, days: next } });
  };

  /* A narrow cell cannot show chips, so the box collapses to a summary. One
     selection says its name; several say how many. */
  const summary = (label: (v: string) => string) => (omitted: { value?: unknown }[]) =>
    omitted.length === 1 ? label(String(omitted[0]?.value ?? '')) : `${omitted.length} selected`;

  return (
    <div className="m-runset">
      <div className="m-runset__row">
        <Field label="Environments">
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.envNames}
            placeholder="Not set"
            maxTagCount={0}
            maxTagPlaceholder={summary((v) => v)}
            onChange={(envNames) => onChange({ envNames })}
            options={noNativeTooltip(environments.map((e) => ({ value: e.name, label: e.name })))}
          />
        </Field>
        <Field label="Viewports">
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.resolutions}
            placeholder="Any"
            maxTagCount={0}
            maxTagPlaceholder={summary((v) => RESOLUTIONS.find((r) => r.value === v)?.label ?? v)}
            onChange={(v) => onChange({ resolutions: v as Resolution[] })}
            options={noNativeTooltip(
              RESOLUTIONS.map((r) => {
                const Icon = VIEWPORT_ICON[r.value];
                return {
                  value: r.value,
                  label: (
                    <span className="m-runset__opt">
                      <Icon size={13} aria-hidden="true" />
                      {r.label}
                    </span>
                  ),
                };
              }),
            )}
          />
        </Field>
        <Field label="Regions">
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.regions}
            placeholder="Any"
            maxTagCount={0}
            maxTagPlaceholder={summary((v) => REGIONS.find((r) => r.value === v)?.label ?? v)}
            onChange={(regions) => onChange({ regions })}
            options={noNativeTooltip(REGIONS.map((r) => ({ value: r.value, label: r.label })))}
          />
        </Field>
      </div>

      <Field label="Schedule">
        <div className="m-runset__sched">
          <Select
            size="small"
            value={freq}
            onChange={(f) => setFreq(f as ScheduleFreq | 'never')}
            options={noNativeTooltip(FREQS)}
            className="m-runset__freq"
          />
          {freq !== 'never' && (
            <Select
              size="small"
              value={time}
              onChange={setTime}
              options={noNativeTooltip(TIMES)}
              className="m-runset__time"
            />
          )}
          {freq === 'monthly' && (
            <Select
              size="small"
              value={String(value.schedule?.dayOfMonth ?? 1)}
              onChange={(d) =>
                onChange({ schedule: { ...(value.schedule as Schedule), dayOfMonth: Number(d) } })
              }
              options={noNativeTooltip(DAYS_OF_MONTH)}
              className="m-runset__dom"
            />
          )}
        </div>
        {(freq === 'weekly' || freq === 'custom') && (
          <div className="m-runset__days" role="group" aria-label="Days">
            {DAY_SHORT.map((label, d) => (
              <button
                key={d}
                type="button"
                className={`m-runset__day${days.includes(d) ? ' is-on' : ''}`}
                aria-pressed={days.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {label.slice(0, 1)}
              </button>
            ))}
          </div>
        )}
      </Field>
    </div>
  );
}
