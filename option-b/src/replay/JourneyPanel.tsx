import { useMemo } from 'react';
import { ScrollArea } from '@mantine/core';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { formatClock, journeySteps, type JourneyStep } from '@shared/replay.ts';
import { KIND_ICON, KIND_NAME } from './kinds.tsx';
import type { ReplayClock } from './useReplayClock.ts';
import './journey-panel.css';

export interface JourneyPanelProps {
  issue: Issue;
  session: IssueSession;
  clock: ReplayClock;
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
export function JourneyPanel({ issue, session, clock }: JourneyPanelProps) {
  const steps = useMemo(() => journeySteps(issue, session), [issue, session]);

  /* The last step the head has passed. -1 during the lead-in, so nothing is lit
     before the session has actually started. */
  const current = useMemo(() => {
    let i = -1;
    steps.forEach((s, n) => { if (clock.at >= s.at) i = n; });
    return i;
  }, [steps, clock.at]);

  return (
    <aside className="b-jrn" aria-label="This session's journey">
      <header className="b-jrn__head">
        <h2 className="m-label">
          Journey
          <span className="m-label__count">{steps.length}</span>
        </h2>
      </header>

      <ScrollArea className="b-jrn__scroll" type="auto">
        <ol className="b-jrn__list">
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
      </ScrollArea>
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
    <li className="b-jrn__item">
      {/* The page heading sits INSIDE the item and shares its thread column, so
          the rail passes behind the heading rather than restarting under it. */}
      {step.pathChanged && (
        <p className="b-jrn__page">
          <span className="b-jrn__thread" aria-hidden="true">
            <span className={`b-jrn__wire${past ? ' is-past' : ''}`} />
          </span>
          <span className="b-jrn__path m-mono m-truncate" title={step.path}>
            {step.path}
          </span>
          {/* The rule is what makes this a section break rather than a line of
              grey text floating above a step. It runs from the path to the
              panel edge, so the eye reads "everything below here happened on
              this page" without the heading having to say it. */}
          <span className="b-jrn__rule" aria-hidden="true" />
        </p>
      )}

      <button
        type="button"
        className={`b-jrn__step${active ? ' is-active' : ''}${past ? ' is-past' : ''}${
          step.failure ? ' is-failure' : ''
        }`}
        onClick={onSeek}
        aria-current={active ? 'step' : undefined}
        title={`Jump to ${formatClock(step.at)}`}
      >
        <span className="b-jrn__thread" aria-hidden="true">
          <span className={`b-jrn__wire b-jrn__wire--lead${past ? ' is-past' : ''}`} />
          <span className={`b-jrn__node b-jrn__node--${step.kind}`}>
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
          </span>
          {!last && <span className={`b-jrn__wire b-jrn__wire--tail${past ? ' is-past' : ''}`} />}
        </span>

        <span className="b-jrn__body">
          <span className="b-jrn__row">
            <span className="b-jrn__label">
              <span className="m-sr-only">{KIND_NAME[step.kind]}: </span>
              {step.label}
            </span>
            <span className="b-jrn__at m-mono">{formatClock(step.at)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
