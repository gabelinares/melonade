import { useMemo, useState } from 'react';
import { Switch, Tooltip } from 'antd';
import { formatBytes, formatClock, type RequestType, type SessionRequest } from '@shared/replay.ts';
import { FilterStrip } from '../../components/FilterStrip.tsx';
import type { ReplayClock } from '../useReplayClock.ts';
import { DevRow, Keyword, NoData, PanelBar, pctOf, timeTicks, useNowIndex } from './shared.tsx';

const TYPE_LABEL: Record<RequestType, string> = {
  fetch: 'Fetch/XHR',
  xhr: 'Fetch/XHR',
  js: 'js',
  css: 'css',
  img: 'img',
  other: 'other',
};

/** Production groups fetch and xhr under one sub-tab. */
const typeKey = (t: RequestType) => (t === 'xhr' ? 'fetch' : t);

export interface NetworkPanelProps {
  requests: readonly SessionRequest[];
  clock: ReplayClock;
}

/**
 * THE NETWORK TAB, production's TimeTable redrawn: the type sub-tabs (only the
 * types this session has), the "4xx-5xx only" switch, the three figures
 * production prints above the list, then Status / Type / Method / Name / Size /
 * Duration and the waterfall - one bar per request, the first segment waiting
 * for the server and the second downloading, on a time axis shared with the
 * track below. Rows past the playhead fade, the failed ones are red, and a slow
 * one is marked in the duration column the way production marks it.
 *
 * A row opens INLINE rather than into production's 500px drawer: the panel is
 * already the drawer. What opens is what this project actually captured - the
 * facts and the timings. Headers and bodies are not, and production says so in
 * the same place ("Body is empty or not captured"), so that line is kept.
 */
export function NetworkPanel({ requests, clock }: NetworkPanelProps) {
  const [sub, setSub] = useState('all');
  const [badOnly, setBadOnly] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const types = useMemo(() => {
    const seen = new Set<string>();
    return requests.map((r) => typeKey(r.type)).filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  }, [requests]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return requests.filter(
      (r) =>
        (sub === 'all' || typeKey(r.type) === sub) &&
        (!badOnly || r.status >= 400) &&
        (!needle || `${r.url} ${r.type} ${r.method} ${r.status}`.toLowerCase().includes(needle)),
    );
  }, [requests, sub, badOnly, q]);
  const now = useNowIndex(shown, clock);

  const transferred = requests.reduce((n, r) => n + (r.cached ? 0 : r.size), 0);
  const resources = requests.filter((r) => r.type !== 'fetch' && r.type !== 'xhr').reduce((n, r) => n + r.size, 0);
  const avg = requests.reduce((n, r) => n + r.duration, 0) / Math.max(1, requests.length);
  const ticks = timeTicks(clock.duration);
  const head = pctOf(clock.at, clock.duration);

  return (
    <>
      <PanelBar
        left={
          <FilterStrip
            label="Request type"
            selected={[sub]}
            onSelect={setSub}
            items={[
              { key: 'all', label: 'All', count: requests.length },
              ...types.map((t) => ({
                key: t,
                label: TYPE_LABEL[t as RequestType],
                count: requests.filter((r) => typeKey(r.type) === t).length,
              })),
            ]}
          />
        }
        right={
          <>
            <label className="m-dt__switch">
              <Switch size="small" checked={badOnly} onChange={setBadOnly} />
              4xx–5xx only
            </label>
            <Keyword value={q} onChange={setQ} placeholder="Filter by name, type or method" />
          </>
        }
      />

      {/* Production's InfoLine, the three figures a network tab is judged by. */}
      <p className="m-dt__figures">
        <span><b>{requests.length}</b> requests</span>
        <span><b>{formatBytes(transferred)}</b> transferred</span>
        <span><b>{formatBytes(resources)}</b> resources</span>
      </p>

      <div className="m-dt__table" role="table" aria-label="Requests">
        <div className="m-dt__thead" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Method</span>
          <span role="columnheader">Name</span>
          <span role="columnheader" className="is-num">Size</span>
          <span role="columnheader" className="is-num">Duration</span>
          <span role="columnheader" className="m-dt__wf m-dt__wf--head" aria-label="Timeline">
            {ticks.map((t) => (
              <i key={t.at} style={{ left: `${t.pct}%` }}>{formatClock(t.at)}</i>
            ))}
          </span>
        </div>

        {shown.length === 0 ? (
          <NoData hint={badOnly ? 'No request failed in this session.' : 'No request matches that.'} />
        ) : (
          shown.map((r, i) => {
            const bad = r.status >= 400;
            const slow = r.duration > avg * 4 ? 'much' : r.duration > avg * 2 ? 'some' : null;
            const isOpen = open === i;
            return (
              <div key={`${r.at}-${i}`} className="m-dt__req">
                <DevRow
                  at={r.at}
                  clock={clock}
                  now={i === now}
                  tone={bad ? 'error' : undefined}
                  expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="m-dt__netrow"
                >
                  <span className="m-dt__status m-mono">{r.status}</span>
                  <span className="m-mono">{r.type}</span>
                  <span className="m-mono">{r.method}</span>
                  <span className="m-dt__name m-mono m-truncate" title={r.url}>{r.url.replace(/^[^/]+\.com/, '')}</span>
                  <span className="m-dt__num m-mono">
                    {r.cached ? <Tooltip title="Served from cache"><i>cache</i></Tooltip> : formatBytes(r.size)}
                  </span>
                  <span className={`m-dt__num m-mono${slow ? ` is-slow-${slow}` : ''}`}>
                    <Tooltip title={slow === 'much' ? 'Much slower than average' : slow === 'some' ? 'Slower than average' : undefined}>
                      <span>{r.duration} ms</span>
                    </Tooltip>
                  </span>
                  <span className="m-dt__wf" aria-hidden="true">
                    <i className="m-dt__wf-head" style={{ left: `${head}%` }} />
                    <span
                      className="m-dt__wf-bar"
                      style={{
                        left: `${pctOf(r.at, clock.duration)}%`,
                        width: `max(4px, ${(r.duration / 1000 / clock.duration) * 100}%)`,
                      }}
                    >
                      <b style={{ width: `${Math.min(100, (r.ttfb / r.duration) * 100)}%` }} />
                    </span>
                  </span>
                </DevRow>
                {isOpen && <RequestDetail r={r} onJump={() => clock.seek(r.at)} />}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/** What production's FetchDetails drawer shows for a request whose headers and
 *  bodies were not captured: the facts, and the timing phases as one bar. */
function RequestDetail({ r, onJump }: { r: SessionRequest; onJump: () => void }) {
  const download = Math.max(0, r.duration - r.ttfb);
  return (
    <div className="m-dt__detail">
      <dl className="m-dt__facts">
        <dt>Name</dt><dd className="m-mono">{r.url}</dd>
        <dt>Method</dt><dd className="m-mono">{r.method}</dd>
        <dt>Status</dt><dd className="m-mono">{r.status}</dd>
        <dt>Type</dt><dd className="m-mono">{r.type}</dd>
        <dt>Size</dt><dd className="m-mono">{formatBytes(r.size)}</dd>
        <dt>Duration</dt><dd className="m-mono">{r.duration} ms</dd>
        <dt>Time</dt>
        <dd>
          <button type="button" className="m-dt__jump m-mono" onClick={onJump}>{formatClock(r.at)} · jump</button>
        </dd>
      </dl>
      <div className="m-dt__timings">
        <span className="m-dt__phase is-wait" style={{ flexGrow: Math.max(r.ttfb, 1) }}>
          <em>Waiting (TTFB)</em><b>{r.ttfb} ms</b>
        </span>
        <span className="m-dt__phase is-receive" style={{ flexGrow: Math.max(download, 1) }}>
          <em>Content download</em><b>{download} ms</b>
        </span>
      </div>
      <p className="m-dt__note">Headers and bodies are not captured on this project.</p>
    </div>
  );
}
