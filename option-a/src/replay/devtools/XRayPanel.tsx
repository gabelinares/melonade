import { useMemo, useState } from 'react';
import { Popover, Tooltip } from 'antd';
import { Info } from 'lucide-react';
import type { IssueSession } from '@shared/issues-data.ts';
import {
  formatClock,
  replayMarkers,
  type SessionLog,
  type SessionPerformance,
  type SessionRequest,
} from '@shared/replay.ts';
import { FilterStrip } from '../../components/FilterStrip.tsx';
import type { ReplayClock } from '../useReplayClock.ts';
import { PanelBar, pctOf, timeTicks } from './shared.tsx';

type Lane = 'performance' | 'frustrations' | 'errors' | 'network' | 'events';

interface Mark {
  at: number;
  label: string;
}

/* Production's lane titles and their ⓘ tooltips, verbatim from OverviewPanel. */
const LANES: { key: Lane; title: string; info: string }[] = [
  { key: 'performance', title: 'Performance', info: "Summary of this session's memory and CPU consumption on the timeline" },
  { key: 'frustrations', title: 'Frustrations', info: 'Indicates user frustrations in the session' },
  { key: 'errors', title: 'Errors', info: 'Visualizes native errors like Type, URI, Syntax etc.' },
  { key: 'network', title: 'Network', info: 'Network requests with issues in this session' },
  { key: 'events', title: 'Events', info: 'Visualizes the events that take place in the DOM' },
];

/** Production's default: everything but custom events. */
const DEFAULT_LANES: Lane[] = ['performance', 'frustrations', 'errors', 'network'];

export interface XRayPanelProps {
  session: IssueSession;
  logs: readonly SessionLog[];
  requests: readonly SessionRequest[];
  perf: SessionPerformance;
  clock: ReplayClock;
}

/**
 * X-RAY: one lane per kind of trouble, on the session's own time axis, so the
 * question "where do I look" is answered before any list is opened. Production
 * gives it a Hide/Show menu; here the lanes are a strip, on because a strip
 * shows what is hidden as well as what is shown. Markers closer than 2% of the
 * width fold into one numbered disc, the way production groups them, and the
 * disc lists what it holds.
 */
export function XRayPanel({ session, logs, requests, perf, clock }: XRayPanelProps) {
  const [lanes, setLanes] = useState<Lane[]>(DEFAULT_LANES);
  const markers = useMemo(() => replayMarkers(session), [session]);
  const ticks = timeTicks(clock.duration);
  const head = pctOf(clock.at, clock.duration);

  const marks: Record<Lane, Mark[]> = useMemo(
    () => ({
      performance: [],
      frustrations: markers.filter((m) => m.kind === 'rage').map((m) => ({ at: m.at, label: m.label })),
      errors: logs.filter((l) => l.level === 'error').map((l) => ({ at: l.at, label: l.message ?? l.text })),
      network: requests
        .filter((r) => r.status >= 400 || r.duration > 2000)
        .map((r) => ({ at: r.at, label: `${r.status >= 400 ? `${r.status} error` : 'Slow resource'} · ${r.url}` })),
      /* No custom events on this session: nothing was posted with tracker.event()
         and no integration is connected. The lane is honest about that. */
      events: [],
    }),
    [markers, logs, requests],
  );

  const toggle = (k: string) =>
    setLanes((cur) => (cur.includes(k as Lane) ? cur.filter((l) => l !== k) : [...LANES.map((l) => l.key).filter((l) => l === k || cur.includes(l))]));

  return (
    <>
      <PanelBar
        left={
          <FilterStrip
            label="Lanes"
            selected={lanes}
            onSelect={toggle}
            items={LANES.map((l) => ({ key: l.key, label: l.title, count: marks[l.key].length || undefined }))}
          />
        }
      />
      <div className="m-dt__xray">
        <div className="m-dt__axis" aria-hidden="true">
          {ticks.map((t) => (
            <i key={t.at} style={{ left: `${t.pct}%` }}>{formatClock(t.at)}</i>
          ))}
        </div>
        {lanes.length === 0 && (
          <p className="m-dt__nodata-hint m-dt__xray-empty">Select a lane to visualize on the timeline.</p>
        )}
        {LANES.filter((l) => lanes.includes(l.key)).map((l) => (
          <div key={l.key} className={`m-dt__lane is-${l.key}`}>
            <span className="m-dt__lane-title">
              {l.title}
              <Tooltip title={l.info}><Info size={11} aria-hidden="true" /></Tooltip>
            </span>
            <div
              className="m-dt__lane-track"
              onClick={(e) => {
                const box = e.currentTarget.getBoundingClientRect();
                clock.seek(((e.clientX - box.left) / box.width) * clock.duration);
              }}
              role="presentation"
            >
              {l.key === 'performance' ? (
                <HeapSpark perf={perf} />
              ) : marks[l.key].length === 0 ? (
                <span className="m-dt__lane-none">{l.key === 'events' ? 'No custom events' : 'None'}</span>
              ) : (
                group(marks[l.key], clock.duration).map((g, i) => (
                  <Popover
                    key={i}
                    placement="top"
                    content={
                      <ul className="m-dt__group">
                        {g.map((m, n) => (
                          <li key={n}>
                            <button type="button" className="m-dt__jump m-mono" onClick={() => clock.seek(m.at)}>{formatClock(m.at)}</button>
                            <span>{m.label}</span>
                          </li>
                        ))}
                      </ul>
                    }
                  >
                    <button
                      type="button"
                      className={`m-dt__mark${g.length > 1 ? ' is-group' : ''}${g[0]!.at <= clock.at ? ' is-past' : ''}`}
                      style={{ left: `${pctOf(g[0]!.at, clock.duration)}%` }}
                      aria-label={g.length > 1 ? `${g.length} ${l.title.toLowerCase()} at ${formatClock(g[0]!.at)}` : `${g[0]!.label} at ${formatClock(g[0]!.at)}`}
                      onClick={(e) => { e.stopPropagation(); clock.seek(g[0]!.at); }}
                    >
                      {g.length > 1 ? g.length : ''}
                    </button>
                  </Popover>
                ))
              )}
            </div>
          </div>
        ))}
        <i className="m-dt__wf-head m-dt__xray-head" style={{ left: `${head}%` }} aria-hidden="true" />
      </div>
    </>
  );
}

/** Markers within 2% of the width become one. */
function group(marks: Mark[], duration: number): Mark[][] {
  const sorted = [...marks].sort((a, b) => a.at - b.at);
  const out: Mark[][] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && (m.at - last[0]!.at) / duration < 0.02) last.push(m);
    else out.push([m]);
  }
  return out;
}

/** Production's Performance lane is a mini PerformanceGraph; the heap is the
 *  series with a shape, so it is the one the lane carries. */
function HeapSpark({ perf }: { perf: SessionPerformance }) {
  const W = 1000;
  const H = 40;
  const max = Math.max(...perf.samples.map((s) => s.heap)) * 1.1;
  const last = perf.samples[perf.samples.length - 1]?.at ?? 1;
  const d = perf.samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${(s.at / last) * W},${H - (s.heap / max) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="m-dt__spark" aria-hidden="true">
      <path d={`${d} V${H} H0 Z`} className="m-dt__area" />
      <path d={d} className="m-dt__line" />
    </svg>
  );
}
