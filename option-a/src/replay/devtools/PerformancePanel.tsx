import { Tooltip } from 'antd';
import { Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { formatBytes, formatClock, type ConnectionQuality, type PerfSample, type SessionPerformance } from '@shared/replay.ts';
import type { ReplayClock } from '../useReplayClock.ts';
import { PanelBar, pctOf, timeTicks } from './shared.tsx';

const SIGNAL: Record<ConnectionQuality, typeof Signal> = {
  Excellent: Signal,
  Good: SignalHigh,
  Average: SignalMedium,
  Poor: SignalLow,
};

interface SeriesSpec {
  key: keyof Omit<PerfSample, 'at'>;
  label: string;
  /** the y-axis ceiling; FPS and CPU have natural ones, heap and nodes take
   *  their own maximum */
  max?: number;
  step?: boolean;
  format: (v: number) => string;
}

const SERIES: SeriesSpec[] = [
  { key: 'fps', label: 'FPS', max: 60, step: true, format: (v) => `${v} fps` },
  { key: 'cpu', label: 'CPU', max: 100, format: (v) => `${v}%` },
  { key: 'heap', label: 'Heap', format: (v) => formatBytes(v) },
  { key: 'nodes', label: 'Nodes', format: (v) => `${v} nodes` },
];

export interface PerformancePanelProps {
  perf: SessionPerformance;
  clock: ReplayClock;
}

/**
 * PERFORMANCE: the four series the tracker samples, stacked at equal height
 * on one time axis with the playhead through all of them - production's own
 * layout, minus the charting library. Clicking anywhere on a chart seeks,
 * because a graph of a recording is a scrubber whether or not it says so.
 *
 * The bar states what production states and nothing more: the device's heap
 * limit and the connection quality it inferred. Production also draws a
 * disabled "All tabs" here with the tooltip "Performance overview isn't
 * supported across tabs" - omitted, because this session has one tab and a
 * disabled control explaining a case that cannot arise is noise.
 */
export function PerformancePanel({ perf, clock }: PerformancePanelProps) {
  const ticks = timeTicks(clock.duration);
  const head = pctOf(clock.at, clock.duration);
  const Sig = SIGNAL[perf.connection];
  const current = perf.samples.reduce((best, s) => (s.at <= clock.at ? s : best), perf.samples[0]);

  const seekFrom = (e: React.MouseEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    clock.seek(((e.clientX - box.left) / box.width) * clock.duration);
  };

  return (
    <>
      <PanelBar
        left={
          <p className="m-dt__figures m-dt__figures--inline">
            <span>Device heap size <b>{formatBytes(perf.deviceHeap)}</b></span>
            <span>
              Connection quality <Sig size={13} aria-hidden="true" className="m-dt__signal" /> <b>{perf.connection}</b>
            </span>
          </p>
        }
      />
      <div className="m-dt__charts">
        <div className="m-dt__axis" aria-hidden="true">
          {ticks.map((t) => (
            <i key={t.at} style={{ left: `${t.pct}%` }}>{formatClock(t.at)}</i>
          ))}
        </div>
        {SERIES.map((s) => (
          <Chart key={s.key} spec={s} samples={perf.samples} head={head} value={current?.[s.key]} onSeek={seekFrom} />
        ))}
      </div>
    </>
  );
}

function Chart({
  spec,
  samples,
  head,
  value,
  onSeek,
}: {
  spec: SeriesSpec;
  samples: readonly PerfSample[];
  head: number;
  value?: number;
  onSeek: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const W = 1000;
  const H = 100;
  const max = spec.max ?? Math.max(...samples.map((s) => s[spec.key])) * 1.1;
  const last = samples[samples.length - 1]?.at ?? 1;
  const x = (at: number) => (at / last) * W;
  const y = (v: number) => H - (v / max) * H;

  let d = '';
  samples.forEach((s, i) => {
    const px = x(s.at);
    const py = y(s[spec.key]);
    if (i === 0) d += `M${px},${py}`;
    else if (spec.step) d += ` H${px} V${py}`;
    else d += ` L${px},${py}`;
  });
  const area = `${d} V${H} H0 Z`;

  return (
    <Tooltip title={value != null ? spec.format(value) : undefined} placement="left" mouseEnterDelay={0.4}>
      <div className={`m-dt__chart is-${spec.key}`} onClick={onSeek} role="presentation">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {/* FPS carries production's two bands: under 30 is a warning, under 20 is
              the frame rate a person can feel. */}
          {spec.key === 'fps' && (
            <>
              <rect x={0} y={y(30)} width={W} height={y(20) - y(30)} className="m-dt__band is-warn" />
              <rect x={0} y={y(20)} width={W} height={H - y(20)} className="m-dt__band is-bad" />
            </>
          )}
          <path d={area} className="m-dt__area" />
          <path d={d} className="m-dt__line" />
        </svg>
        <i className="m-dt__wf-head" style={{ left: `${head}%` }} aria-hidden="true" />
        <span className="m-dt__chart-label">{spec.label}</span>
        <span className="m-dt__chart-max m-mono">{spec.format(Math.round(max))}</span>
      </div>
    </Tooltip>
  );
}
