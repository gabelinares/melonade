import { useMemo } from 'react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { formatClock, journeySteps, type JourneyStep } from '@shared/replay.ts';
import { KIND_ICON, KIND_NAME } from './kinds.tsx';
import type { ReplayClock } from './useReplayClock.ts';
import './journey-panel.css';

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
/**
 * ⚠ NO LONGER A PANEL WITH ITS OWN CHROME (2026-09-14). The aside, its tab
 * strip and its scroll moved into `ReplayScreen`, where every starting point
 * shares them - Gabriel: "a side bar that includes tabs multipurpose (you can
 * allocate activity there for example)". What stayed here is the two things
 * the issue's panel SAYS: what the person did (the journey, with paths and a
 * thread and the failure) and what the agent wrote (the three answers).
 */
export function JourneyList({ issue, session, clock }: { issue: Issue; session: IssueSession; clock: ReplayClock }) {
  const steps = useMemo(() => journeySteps(issue, session), [issue, session]);
  const current = useMemo(() => {
    let i = -1;
    steps.forEach((s, n) => { if (clock.at >= s.at) i = n; });
    return i;
  }, [steps, clock]);
  return (
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
  );
}

/** The write-up beside the recording: what happened, why, what to do. Three
 *  sections in the order the agent makes the case, one scroll. */
export function IssueAnswers({ issue }: { issue: Issue }) {
  return (
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
  );
}

export const journeyStepCount = (issue: Issue, session: IssueSession): number => journeySteps(issue, session).length;

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
