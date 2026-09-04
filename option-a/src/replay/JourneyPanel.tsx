import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import {
  formatClock,
  journeySteps,
  sessionConsole,
  sessionNetwork,
  type JourneyStep,
} from '@shared/replay.ts';
import type { ConsoleLine, NetworkCall } from '@shared/runs-data.ts';
import { consoleErrorCount, netErrorCount } from '@shared/runs-logic.ts';
import { CountSuffix } from '../components/CountSuffix.tsx';
import { KIND_ICON, KIND_NAME } from './kinds.tsx';
import type { ReplayClock } from './useReplayClock.ts';
import type { SidePanel } from '../state/useIssues.ts';
import './journey-panel.css';

export interface JourneyPanelProps {
  issue: Issue;
  session: IssueSession;
  clock: ReplayClock;
  tab: SidePanel;
  onTab: (t: SidePanel) => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE JOURNEY, BESIDE THE REPLAY.
 *
 * It stands where the issue queue used to. That swap is the argument: the queue
 * answers "which issue", and by the time a recording is playing you have
 * answered that twice. What is unanswered is what this person did, in what
 * order, and which second to look at. So the rail beside the player stops being
 * about the eleven issues you are not watching and becomes about the one
 * session you are.
 *
 * IT IS A SCRUBBER, NOT A SUMMARY. Every row seeks. The step the playhead is
 * inside is lit, and the thread above it is drawn in the accent, so the panel
 * reports position as well as content and you can drive the replay from either
 * axis: the track along the bottom for time, this column for meaning.
 *
 * THREE THINGS EARN A ROW, and nothing else does:
 *
 *   the glyph      what kind of event it was, from the same table the track
 *                  colours its markers from
 *   the page       printed ONCE, on the step that arrives on it, on a rule that
 *                  runs to the panel edge. A path repeated down every row is a
 *                  column of identical text that teaches nothing; printed on
 *                  change, with a divider under the eye, it becomes the chapter
 *                  heading of the session. The thread runs on THROUGH the
 *                  heading, so changing page breaks the page and not the
 *                  journey.
 *   the failure    marked in the danger colour, and marked ONLY THERE. The ring
 *                  and the glyph say it; there is no caption under the row. A
 *                  label spelling out what a red warning triangle already means
 *                  is the one thing on this panel that would be there twice. The
 *                  temptation is to grey out everything after it as aftermath,
 *                  and that is wrong: what the person did after it broke is
 *                  frequently the most useful part of the recording - the
 *                  retries, the hunt for an error message, the abandonment.
 *                  The steps that follow are ordinary steps.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function JourneyPanel({ issue, session, clock, tab, onTab }: JourneyPanelProps) {
  const steps = useMemo(() => journeySteps(issue, session), [issue, session]);
  /* ⚠ THE DEV TOOLS, DESIGNED ONCE HERE (Mehdi, 08-26/08-27/09-01: "the one
     addition anywhere" to this week's scope). Same seed as the track and the
     journey above - `sessionConsole`/`sessionNetwork` both read
     `replayMarkers(session)`, so a request failing here is the same event as
     the danger ring on the journey step and the marker on the track below,
     never a second opinion about what happened. */
  const consoleLines = useMemo(() => sessionConsole(session), [session]);
  const networkCalls = useMemo(() => sessionNetwork(session), [session]);

  /* The last step the head has passed. -1 during the lead-in, so nothing is lit
     before the session has actually started. */
  const current = useMemo(() => {
    let i = -1;
    steps.forEach((s, n) => { if (clock.at >= s.at) i = n; });
    return i;
  }, [steps, clock]);

  const shown: SidePanel = tab;

  return (
    <aside className="m-jrn" aria-label="About this issue">
      {/* ── TABS, NOT A LABEL ────────────────────────────────────────────────
          The panel used to be the journey and say so. It now holds two things
          and the strip is how you pick: what the agent WROTE, and what the
          person DID. Those are the two questions at this depth and they belong
          side by side rather than one of them being three tabs inside the
          document below and the other being a whole panel.
          This panel belongs to the recording: it does not exist on the issue
          page, where the write-up is the document on the page itself. */}
      <header className="m-jrn__head" role="tablist" aria-label="Panel">
        {/* Journey first, and it is the default: it is what the panel is for and
            what Mehdi singled out as the most important thing beside the player.
            Details is the write-up, here so the case can be read without leaving
            the recording. */}
        <button
          type="button"
          role="tab"
          className={`m-jrn__tab${shown === 'journey' ? ' is-on' : ''}`}
          aria-selected={shown === 'journey'}
          onClick={() => onTab('journey')}
        >
          Journey
          <CountSuffix n={steps.length} />
        </button>
        <button
          type="button"
          role="tab"
          className={`m-jrn__tab${shown === 'details' ? ' is-on' : ''}`}
          aria-selected={shown === 'details'}
          onClick={() => onTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          className={`m-jrn__tab${shown === 'console' ? ' is-on' : ''}`}
          aria-selected={shown === 'console'}
          onClick={() => onTab('console')}
        >
          Console
          {consoleErrorCount(consoleLines) > 0 && <em className="m-jrn__tab-err">{consoleErrorCount(consoleLines)}</em>}
        </button>
        <button
          type="button"
          role="tab"
          className={`m-jrn__tab${shown === 'network' ? ' is-on' : ''}`}
          aria-selected={shown === 'network'}
          onClick={() => onTab('network')}
        >
          Network
          {netErrorCount(networkCalls) > 0 && <em className="m-jrn__tab-err">{netErrorCount(networkCalls)}</em>}
        </button>
      </header>

      <div className="m-jrn__scroll">
        {shown === 'console' ? (
          <ConsoleLines lines={consoleLines} />
        ) : shown === 'network' ? (
          <NetworkCalls calls={networkCalls} />
        ) : shown === 'details' ? (
          /* ── THE THREE ANSWERS, STACKED ────────────────────────────────────
             What happened, why it happens, what to do about it. They were three
             TABS inside the write-up, which made the reader click twice to read
             an argument that is three sentences long and hid two thirds of it at
             any moment. Stacked, the whole case is one scroll in the order the
             agent makes it, beside the recording it is about. */
          <div className="m-jrn__answers">
            <section className="m-jrn__answer">
              <h3>What happened</h3>
              <p>{issue.journey}</p>
            </section>
            <section className="m-jrn__answer">
              <h3>Why it happens</h3>
              <p>{issue.real}</p>
            </section>
            <section className="m-jrn__answer">
              <h3>Suggested fix</h3>
              <p>{issue.fix}</p>
            </section>
          </div>
        ) : (
          <ol className="m-jrn__list">
            {steps.map((step) => (
              <Step
                key={step.index}
                step={step}
                last={step.index === steps.length - 1}
                past={step.index <= current}
                active={step.index === current}
                onSeek={() => clock.seek(step.at)}
              />
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

interface StepProps {
  step: JourneyStep;
  last: boolean;
  past: boolean;
  active: boolean;
  onSeek: () => void;
}

function Step({ step, last, past, active, onSeek }: StepProps) {
  const Icon = KIND_ICON[step.kind];

  return (
    <li className="m-jrn__item">
      {/* The page heading sits INSIDE the item and shares its thread column, so
          the rail passes behind the heading rather than restarting under it. */}
      {step.pathChanged && (
        <p className="m-jrn__page">
          <span className="m-jrn__thread" aria-hidden="true">
            <span className={`m-jrn__wire${past ? ' is-past' : ''}`} />
          </span>
          <span className="m-jrn__path m-mono m-truncate" title={step.path}>
            {step.path}
          </span>
          {/* The rule is what makes this a section break rather than a line of
              grey text floating above a step. It runs from the path to the
              panel edge, so the eye reads "everything below here happened on
              this page" without the heading having to say it. */}
          <span className="m-jrn__rule" aria-hidden="true" />
        </p>
      )}

      <button
        type="button"
        className={`m-jrn__step${active ? ' is-active' : ''}${past ? ' is-past' : ''}${
          step.failure ? ' is-failure' : ''
        }`}
        onClick={onSeek}
        aria-current={active ? 'step' : undefined}
        title={`Jump to ${formatClock(step.at)}`}
      >
        <span className="m-jrn__thread" aria-hidden="true">
          <span className={`m-jrn__wire m-jrn__wire--lead${past ? ' is-past' : ''}`} />
          <span className={`m-jrn__node m-jrn__node--${step.kind}`}>
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
          </span>
          {!last && <span className={`m-jrn__wire m-jrn__wire--tail${past ? ' is-past' : ''}`} />}
        </span>

        <span className="m-jrn__body">
          <span className="m-jrn__row">
            <span className="m-jrn__label">
              <span className="m-sr-only">{KIND_NAME[step.kind]}: </span>
              {step.label}
            </span>
            <span className="m-jrn__at m-mono">{formatClock(step.at)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

/** The console, at the level it was logged. Same shape and the same reading
 *  order as the Synthetics run drawer's own (`tests/RunDrawer.tsx`) - the
 *  design travelled, not just the type. */
function ConsoleLines({ lines }: { lines: ConsoleLine[] }) {
  if (lines.length === 0) return <p className="m-jrn__none">Nothing was logged.</p>;
  return (
    <div className="m-jrn__console">
      {lines.map((l, i) => (
        <div key={i} className={`m-jrn__cline is-${l.level}`}>
          <span className="m-jrn__at m-mono">{(l.at / 1000).toFixed(1)}s</span>
          <span className="m-jrn__cmsg">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/** The requests, and the one that failed is the reason this tab exists - so
 *  the failure is what the eye lands on and the rest stays grey. Narrower
 *  than the drawer's own table, so a call is two lines (method + status on
 *  one, the url on the next) rather than a row of columns with nowhere to
 *  put them at 18.5rem. */
function NetworkCalls({ calls }: { calls: NetworkCall[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (calls.length === 0) return <p className="m-jrn__none">No requests were recorded.</p>;
  return (
    <div className="m-jrn__net">
      {calls.map((c, i) => {
        const bad = c.status >= 400;
        return (
          <div key={i} className={`m-jrn__call${bad ? ' is-bad' : ''}`}>
            <button
              type="button"
              className="m-jrn__call-row"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <ChevronRight size={12} className={`m-jrn__chev${open === i ? ' is-open' : ''}`} aria-hidden="true" />
              <span className="m-jrn__call-head">
                <span className="m-jrn__method">{c.method}</span>
                <span className="m-jrn__status">{c.status}</span>
                <span className="m-jrn__time m-mono">{c.time} ms</span>
              </span>
              <span className="m-jrn__url m-mono m-truncate" title={c.url}>{c.url}</span>
            </button>
            {open === i && (
              /* The HAR phases, as the bar the viewer draws - same reading as
                 the drawer's own timing bar, one phase per segment rather than
                 six numbers nobody compares. */
              <div className="m-jrn__timing">
                {(['blocked', 'dns', 'connect', 'send', 'wait', 'receive'] as const).map((k) => (
                  <span key={k} className={`m-jrn__phase is-${k}`} style={{ flexGrow: Math.max(c.timing[k], 0.5) }}>
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
