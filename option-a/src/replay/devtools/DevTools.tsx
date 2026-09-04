import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import { ChevronDown } from 'lucide-react';
import type { IssueSession } from '@shared/issues-data.ts';
import { sessionLogs, sessionPerformance, sessionRequests } from '@shared/replay.ts';
import type { ReplayClock } from '../useReplayClock.ts';
import { ConsolePanel } from './ConsolePanel.tsx';
import { NetworkPanel } from './NetworkPanel.tsx';
import { PerformancePanel } from './PerformancePanel.tsx';
import { XRayPanel } from './XRayPanel.tsx';
import { NoData, PanelBar } from './shared.tsx';
import './dev-tools.css';

/** Production's seven, in production's order. State, Events and Traces are
 *  conditional there (a detected store, a posted event, a connected log
 *  integration); here they are always in the strip and honest about being
 *  empty, because Mehdi still owes the list of which ones to keep. */
export type DevTab = 'xray' | 'console' | 'network' | 'performance' | 'state' | 'events' | 'traces';

const TABS: { key: DevTab; label: string; hint: string }[] = [
  { key: 'xray', label: 'X-Ray', hint: 'Get a quick overview on the issues in this session' },
  { key: 'console', label: 'Console', hint: 'What the page logged' },
  { key: 'network', label: 'Network', hint: 'Every request the page made' },
  { key: 'performance', label: 'Performance', hint: 'FPS, CPU, memory and DOM size over time' },
  { key: 'state', label: 'State', hint: 'The application store, if the tracker found one' },
  { key: 'events', label: 'Events', hint: 'Custom events and integration events' },
  { key: 'traces', label: 'Traces', hint: 'Backend logs from a connected integration' },
];

const MIN_HEIGHT = 160;

export interface DevToolsProps {
  session: IssueSession;
  clock: ReplayClock;
  tab: DevTab | null;
  onTab: (t: DevTab | null) => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE DEV TOOLS, docked under the recording.
 *
 * Mehdi asked for these three times (08-26, 08-27, 09-01) as the one thing to
 * ADD to the replay, and Gabriel set the shape on 09-04 with production's own
 * screenshots: "a bottom collapse/expand section, just like the inspecting tool
 * of Chrome", with exactly the tabs OpenReplay has and no data it does not.
 *
 * ── THE STRIP IS ALWAYS THERE, THE PANEL IS NOT ────────────────────────────
 * Production puts the tab buttons in the transport bar and grows a panel above
 * it. Here the strip is its own thin row between the stage and the transport -
 * Chrome's shape, the tabs on the top edge of the thing they open - so the
 * transport keeps its track at full width and the strip reads as the lid of
 * the panel rather than seven more buttons beside the speeds. Collapsed, it
 * costs one row and still says which tabs have errors: the red dot is
 * production's, and it is what makes the strip a readout and not a menu.
 *
 * ── ONE BODY, MANY TABS ────────────────────────────────────────────────────
 * The panel is one box with a resize handle on its top edge, and the tabs swap
 * what is inside it. Height persists while you switch tabs, so the recording
 * above does not jump between Console and Network. Clicking the open tab again
 * collapses it, as production's toggle does.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function DevTools({ session, clock, tab, onTab }: DevToolsProps) {
  const logs = useMemo(() => sessionLogs(session), [session]);
  const requests = useMemo(() => sessionRequests(session), [session]);
  const perf = useMemo(() => sessionPerformance(session), [session]);
  const [openErrors, setOpenErrors] = useState(false);

  const errors: Partial<Record<DevTab, boolean>> = {
    console: logs.some((l) => l.level === 'error'),
    network: requests.some((r) => r.status >= 400),
  };

  /* ── THE HEIGHT ── A number once the handle has been dragged, a fraction
     until then. `null` means "42% of the player", the same share the write-up
     peek takes, so the two panels that can sit over the recording sit at one
     height. Clamped on drag so it can neither vanish nor eat the stage. */
  const [height, setHeight] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const onHandleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    const player = box?.parentElement;
    if (!box || !player) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startH = box.getBoundingClientRect().height;
    const max = player.getBoundingClientRect().height * 0.75;
    const move = (ev: PointerEvent) => {
      setHeight(Math.min(max, Math.max(MIN_HEIGHT, startH + (startY - ev.clientY))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  let body: ReactNode = null;
  if (tab === 'xray') body = <XRayPanel session={session} logs={logs} requests={requests} perf={perf} clock={clock} />;
  if (tab === 'console') body = <ConsolePanel logs={logs} clock={clock} openErrors={openErrors} onOpenErrors={setOpenErrors} />;
  if (tab === 'network') body = <NetworkPanel requests={requests} clock={clock} />;
  if (tab === 'performance') body = <PerformancePanel perf={perf} clock={clock} />;
  if (tab === 'state') {
    body = (
      <>
        <PanelBar left={<span className="m-dt__title">State</span>} />
        <NoData
          title="Nothing to display yet"
          hint="Inspect your application state while you replay a session. OpenReplay supports Redux, Vuex, Pinia, Zustand, MobX and NgRx - none was detected on this page."
        />
      </>
    );
  }
  if (tab === 'events') {
    body = (
      <>
        <PanelBar left={<span className="m-dt__title">Stack events</span>} />
        <NoData hint="Nothing was posted with tracker.event() in this session, and no integration - Sentry, Datadog, Bugsnag and the rest - is connected to this project." />
      </>
    );
  }
  if (tab === 'traces') {
    body = (
      <>
        <PanelBar left={<span className="m-dt__title">Traces</span>} />
        <NoData
          title="No backend logs"
          hint="Traces appear once a backend logging integration is connected in Preferences. Logs are fetched for all tabs combined."
        />
      </>
    );
  }

  return (
    <div
      ref={boxRef}
      className={`m-dt${tab ? ' is-open' : ''}`}
      style={tab ? { height: height != null ? `${height}px` : '42%' } : undefined}
    >
      {/* THE HANDLE is the strip's top edge. Only there when there is a panel to
          resize: dragging a closed lid would be a control with no effect. */}
      {tab && <div className="m-dt__handle" onPointerDown={onHandleDown} role="separator" aria-orientation="horizontal" aria-label="Resize the panel" />}

      <div className="m-dt__strip" role="tablist" aria-label="Developer tools">
        {TABS.map((t) => (
          <Tooltip key={t.key} title={t.hint} mouseEnterDelay={0.5}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`m-dt__tab${tab === t.key ? ' is-on' : ''}`}
              onClick={() => onTab(tab === t.key ? null : t.key)}
            >
              {errors[t.key] && <i className="m-dt__err" aria-label="has errors" />}
              {t.label}
            </button>
          </Tooltip>
        ))}
        {tab && (
          <button type="button" className="m-dt__collapse" onClick={() => onTab(null)} aria-label="Collapse the panel">
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {tab && <div className="m-dt__body" role="tabpanel">{body}</div>}
    </div>
  );
}
