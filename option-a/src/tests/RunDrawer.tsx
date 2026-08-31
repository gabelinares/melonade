import { useMemo, useState, type CSSProperties } from 'react';
import { App, Button, Modal, Segmented, Tooltip } from 'antd';
import {
  ChevronRight,
  Clock3,
  Globe,
  Images,
  Monitor,
  Network,
  Maximize2,
  RotateCw,
  Server,
  Terminal,
} from 'lucide-react';
import {
  formatDuration,
  regionLabel,
  resolutionLabel,
  type ConsoleLine,
  type NetworkCall,
  type RunData,
  type RunStep,
} from '@shared/runs-data.ts';
import { consoleErrorCount, netErrorCount, runConsole, runNetwork, runSteps } from '@shared/runs-logic.ts';
import { TESTS, minutesSince } from '@shared/tests-data.ts';
import { lastSeenLabel } from '@shared/issues-data.ts';
import { DrawerFooter, EntityDrawer, Section } from '../components/EntityDrawer.tsx';
import { LiveDuration } from '../components/LiveDuration.tsx';
import { RunResultChip } from '../components/RunResultChip.tsx';
import './run-drawer.css';

type DevTab = 'shots' | 'network' | 'console';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE RUN.
 *
 * A run is one cell of the matrix a test describes - one environment, one
 * viewport, one region, one version of the steps - and it is over. So this
 * drawer is READ-ONLY by construction, and the one thing it offers is running
 * the same thing again.
 *
 * Three things it does that the list cannot:
 *
 * 1. IT SAYS WHERE IT STOPPED. Every step carries its own result, the failing
 *    one carries the error inline, and everything after it reads "skipped"
 *    rather than "failed" - a run does not fail eleven times, it fails once and
 *    stops.
 * 2. A RUN IN FLIGHT REPORTS PROGRESS AND NOTHING MORE. Its steps are known,
 *    because the test knows them; its results are not. `unknown` is drawn as
 *    its own mark rather than as pending, and there are no controls: a run
 *    cannot be paused or stopped once it has started. Pausing belongs to the
 *    TEST, where it stops the next one.
 * 3. ACTIVITY IS WHAT YOU WOULD CHECK ON A SESSION - screenshots, network,
 *    console - one at a time. A passed run captured none of it, so those tabs
 *    are DISABLED with the reason on hover rather than hidden: a panel that
 *    appears and disappears between runs is a panel nobody trusts.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function RunDrawer({ run, onClose }: { run: RunData | null; onClose: () => void }) {
  const { message } = App.useApp();
  const [tab, setTab] = useState<DevTab>('shots');
  /* The expanded view is the same three tabs with room to see them. It carries
     its OWN tab so blowing up the screenshots and then closing does not leave
     the drawer on a tab you never picked. */
  const [expanded, setExpanded] = useState<DevTab | null>(null);

  const test = useMemo(() => TESTS.find((t) => t.title === run?.testName), [run?.testName]);
  const steps = useMemo(() => (run ? runSteps(run, test?.steps ?? []) : []), [run, test]);
  const logs = useMemo(() => (run ? runConsole(run) : []), [run]);
  const calls = useMemo(() => (run ? runNetwork(run) : []), [run]);

  if (!run) return null;

  const running = run.status === 'running';
  const passed = run.status === 'passed';
  const failedIdx = steps.findIndex((s) => s.status === 'failed');

  const tabs = [
    { value: 'shots', label: <span className="m-rd__tab"><Images size={13} /> Screenshots</span> },
    {
      value: 'network',
      disabled: passed,
      label: (
        <span className="m-rd__tab">
          <Network size={13} /> Network
          {netErrorCount(calls) > 0 && <em>{netErrorCount(calls)}</em>}
        </span>
      ),
    },
    {
      value: 'console',
      disabled: passed,
      label: (
        <span className="m-rd__tab">
          <Terminal size={13} /> Console
          {consoleErrorCount(logs) > 0 && <em>{consoleErrorCount(logs)}</em>}
        </span>
      ),
    },
  ];

  return (
    <EntityDrawer
      open
      onClose={onClose}
      title={run.testName}
      eyebrow={`Run · ${running ? 'Running' : passed ? 'Passed' : 'Failed'}`}
      meta={
        <>
          <span>
            <Clock3 size={13} aria-hidden="true" />
            {lastSeenLabel(minutesSince(run.date))}
          </span>
          <span>{running ? <LiveDuration startedAt={run.date} /> : run.duration != null ? formatDuration(run.duration) : '—'}</span>
          {run.envName && (
            <span>
              <Server size={13} aria-hidden="true" />
              {run.envName}
            </span>
          )}
          <span>
            <Monitor size={13} aria-hidden="true" />
            {resolutionLabel(run.resolution)}
          </span>
          {run.region && (
            <span>
              <Globe size={13} aria-hidden="true" />
              {regionLabel(run.region)}
            </span>
          )}
          {run.version != null && <span>v{run.version}</span>}
        </>
      }
      headerActions={
        running ? undefined : (
          <Button
            size="small"
            icon={<RotateCw size={13} />}
            onClick={() => {
              message.success(`${run.testName} — rerun started`);
              onClose();
            }}
          >
            Rerun
          </Button>
        )
      }
      footer={
        <DrawerFooter
          left={
            <span className="m-rd__foot">
              {running
                ? 'A run cannot be paused or stopped once it has started.'
                : passed
                  ? `All ${steps.length} steps passed.`
                  : `Stopped at step ${failedIdx + 1} of ${steps.length}.`}
            </span>
          }
          right={<Button onClick={onClose}>Close</Button>}
        />
      }
    >
      <Section
        title={
          <>
            Steps <span className="m-dsec__count">{steps.length}</span>
          </>
        }
        action={<RunResultChip status={run.status} />}
      >
        {/* A RUN IN FLIGHT IS ONE OBJECT IN PROGRESS, NOT A LIST WITH A
            CURSOR IN IT.

            Two wrong versions got here first and both made the same claim: a
            spinning glyph on "the" running step, then a full-strength shimmer
            on it with the rest muted. Neither was ours to make - the runner
            reports nothing while it works, so any step drawn differently from
            its neighbours is the drawer guessing where the run has got to.
            Gabriel, twice: "the runs with status running can't have check or
            loading indicators in the steps, because we don't know which step
            we're at."

            So `runSteps` gives every step of a running run the same status, and
            this list draws them identically: same empty ring, same colour, and
            all of the text shimmering at once. The only thing with a direction
            is the pulse walking down the wires between them - see
            run-drawer.css - because "it is going that way" is the one thing
            about a running test that is true. */}
        <ol className={`m-rd__steps${running ? ' is-live' : ''}`}>
          {steps.map((s, i) => (
            <li
              key={i}
              className={`m-rd__step is-${s.status}`}
              style={{ '--i': i } as CSSProperties}
            >
              <StepMark status={s.status} />
              <div className="m-rd__step-body">
                <span className="m-rd__step-text">{s.text}</span>
                {/* The error belongs to the step that produced it. A run-level
                    banner makes you scroll back up to find out which line it is
                    about. */}
                {s.status === 'failed' && run.error && <p className="m-rd__error">{run.error}</p>}
              </div>
              {s.status !== 'unknown' && s.status !== 'skipped' && (
                <button type="button" className="m-rd__shots" onClick={() => setTab('shots')}>
                  {s.shots} <Images size={12} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Activity"
        hint={passed ? 'This run passed, so nothing was captured beyond its screenshots.' : undefined}
        action={
          <Tooltip title="Expand">
            <Button
              type="text"
              size="small"
              icon={<Maximize2 size={14} />}
              aria-label="Expand activity"
              onClick={() => setExpanded(tab)}
            />
          </Tooltip>
        }
      >
        <Segmented block size="small" value={tab} options={tabs} onChange={(v) => setTab(v as DevTab)} />
        <div className="m-rd__panel">
          {tab === 'shots' && <Screenshots steps={steps} onExpand={() => setExpanded('shots')} />}
          {tab === 'network' && <NetworkTable calls={calls} />}
          {tab === 'console' && <ConsoleView lines={logs} />}
        </div>
      </Section>

      {/* ── the expanded view ──────────────────────────────────────────────
          A 560px drawer is the right width for reading steps and the wrong one
          for looking at a screenshot of a page. Same three tabs, same
          components, one FIXED stage: every tab renders into the same height,
          so switching between them - or landing on an empty console - never
          resizes the window under the cursor. */}
      <Modal
        open={expanded != null}
        onCancel={() => setExpanded(null)}
        footer={null}
        width={920}
        centered
        rootClassName="m-rdmodal"
        title={
          <div className="m-drawer__lead">
            <p className="m-drawer__eyebrow">Run activity</p>
            <h2 className="m-drawer__title">{run.testName}</h2>
          </div>
        }
      >
        <Segmented
          block
          size="small"
          value={expanded ?? 'shots'}
          options={tabs}
          onChange={(v) => setExpanded(v as DevTab)}
        />
        <div className="m-rdmodal__stage">
          {expanded === 'shots' && <Screenshots steps={steps} fill />}
          {expanded === 'network' && <NetworkTable calls={calls} />}
          {expanded === 'console' && <ConsoleView lines={logs} />}
        </div>
      </Modal>
    </EntityDrawer>
  );
}

const MARK_LABEL: Record<RunStep['status'], string> = {
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  running: 'Running now',
  unknown: 'Not reached yet',
};

/**
 * ONE MARK, FIVE STATES - not five glyphs.
 *
 * It used to be a Check, an X, a SkipForward, a spinning Loader and a Circle:
 * five different shapes at three different sizes, so the column had no rhythm,
 * the running step was a shape nothing else on the list shared, and you could
 * not tell where the run had got to without reading every row. Gabriel: "the
 * loading state can't exist on specific icons, also not the check - it should
 * be somehow a loading state that all of them would have, but it doesn't seem
 * repetitive or cluttered."
 *
 * So every step wears the SAME 14px ring, and the outcome is what is drawn
 * inside it. RUNNING DRAWS NOTHING INSIDE IT - a run in flight has no outcome
 * to report, which is exactly what an empty ring says, and it is the same empty
 * ring every step of that run wears.
 *
 * The ring is also FILLED with the panel's own surface, which is what lets the
 * rail behind it run straight through the row: the node covers the wire instead
 * of the wire crossing the node.
 *
 * COLOUR MARKS THE EXCEPTION AND NOTHING ELSE. A passing step is neutral - the
 * chip in the section header already says the run passed, and eight green ticks
 * say it eight more times - and failure is the only red on the panel.
 */
function StepMark({ status }: { status: RunStep['status'] }) {
  return (
    <svg
      className={`m-rd__mark is-${status}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      role="img"
      aria-label={MARK_LABEL[status]}
    >
      {/* the ring every step has. While running it is the TRACK the arc turns
          in, which is why it is drawn first and never conditionally. */}
      <circle className="m-rd__ring" cx="7" cy="7" r="6" strokeWidth="1.5" />
      {status === 'passed' && (
        <path className="m-rd__in" d="M4.4 7.2 6.2 9 9.6 5.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {status === 'failed' && (
        <path className="m-rd__in" d="M5 5 9 9M9 5 5 9" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {status === 'skipped' && (
        <path className="m-rd__in" d="M4.6 7h4.8" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * The screenshots, as the placeholders they honestly are in a prototype. A grey
 * rectangle labelled with the step it belongs to says "an image goes here" and
 * cannot be mistaken for a captured screen; a stock photo would be a lie about
 * what this build does.
 */
function Screenshots({ steps, fill, onExpand }: { steps: RunStep[]; fill?: boolean; onExpand?: () => void }) {
  const shown = steps.filter((s) => s.status !== 'unknown' && s.status !== 'skipped');
  const [at, setAt] = useState(0);
  const step = shown[Math.min(at, shown.length - 1)];
  if (!step) return <p className="m-rd__none">Nothing was captured yet.</p>;
  /* The frame itself is the expand control when there is somewhere bigger to
     go: the thing you want larger is the picture, so clicking the picture is
     the gesture, and the icon in the section header is the discoverable twin. */
  const Frame = onExpand ? 'button' : 'div';
  return (
    <div className={`m-rd__shotview${fill ? ' is-fill' : ''}`}>
      <Frame
        type={onExpand ? 'button' : undefined}
        className={`m-rd__frame${step.status === 'failed' ? ' is-fail' : ''}${onExpand ? ' is-clickable' : ''}`}
        onClick={onExpand}
        aria-label={onExpand ? 'Expand the screenshots' : undefined}
      >
        <Images size={20} aria-hidden="true" />
        <span>
          Step {shown.indexOf(step) + 1} · {step.shots} {step.shots === 1 ? 'screenshot' : 'screenshots'}
        </span>
      </Frame>
      <div className="m-rd__filmstrip">
        {shown.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`m-rd__thumb${i === at ? ' is-on' : ''}${s.status === 'failed' ? ' is-fail' : ''}`}
            aria-label={`Step ${i + 1}`}
            aria-pressed={i === at}
            onClick={() => setAt(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="m-rd__caption">{step.text}</p>
    </div>
  );
}

/** The requests, and the one that failed is the reason this tab exists - so the
 *  failures are what the eye lands on and the rest is grey. */
function NetworkTable({ calls }: { calls: NetworkCall[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (calls.length === 0) return <p className="m-rd__none">No requests were recorded.</p>;
  return (
    <div className="m-rd__net">
      {calls.map((c, i) => {
        const bad = c.status >= 400;
        return (
          <div key={i} className={`m-rd__call${bad ? ' is-bad' : ''}`}>
            <button type="button" className="m-rd__call-row" onClick={() => setOpen(open === i ? null : i)}>
              <ChevronRight size={12} className={`m-rd__chev${open === i ? ' is-open' : ''}`} aria-hidden="true" />
              <span className="m-rd__method">{c.method}</span>
              <span className="m-rd__url">{c.url}</span>
              <span className="m-rd__status">{c.status}</span>
              <span className="m-rd__time">{c.time} ms</span>
            </button>
            {open === i && (
              /* The HAR phases, as the bar the viewer draws. A number per phase
                 would be six numbers nobody compares; the bar is the comparison. */
              <div className="m-rd__timing">
                {(['blocked', 'dns', 'connect', 'send', 'wait', 'receive'] as const).map((k) => (
                  <span key={k} className={`m-rd__phase is-${k}`} style={{ flexGrow: Math.max(c.timing[k], 0.5) }}>
                    <em>{k}</em>
                    <b>{c.timing[k]} ms</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The console, at the level it was logged. Same shape as the session console,
 *  because it is the same question asked one level down. */
function ConsoleView({ lines }: { lines: ConsoleLine[] }) {
  if (lines.length === 0) return <p className="m-rd__none">Nothing was logged.</p>;
  return (
    <div className="m-rd__console">
      {lines.map((l, i) => (
        <div key={i} className={`m-rd__line is-${l.level}`}>
          <span className="m-rd__at">{(l.at / 1000).toFixed(1)}s</span>
          <span className="m-rd__msg">{l.text}</span>
        </div>
      ))}
    </div>
  );
}
