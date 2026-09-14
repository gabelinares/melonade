import { useEffect, useRef } from 'react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import type { CriticalState, SessionFilterKey, SessionFilters } from '@shared/issues-logic.ts';
import { issueMarkdown } from '@shared/issue-markdown.ts';
import { durationSeconds } from '@shared/replay.ts';
import { IssueAnswers, JourneyList, journeyStepCount } from '../replay/JourneyPanel.tsx';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';
import type { SidePanel } from '../state/useIssues.ts';
import { IssueActions, IssueLead } from './IssueHeader.tsx';
import { ReplayScreen } from '../replay/ReplayScreen.tsx';
import { IssueWriteUp } from './IssueWriteUp.tsx';
import { SessionStrip } from './SessionStrip.tsx';
import './work-pane.css';

export type Depth = 'triage' | 'watch';

export interface WorkPaneProps {
  issue: Issue;
  title: string;
  depth: Depth;
  /** the write-up pulled back over the top half while a replay runs */
  peek: boolean;
  openIndex: number | null;
  /** every session on the issue, the hand-written ones first. See sessionPool. */
  sessions: readonly IssueSession[];
  /** the ranked, filtered list the band offers, derived by the controller so
   *  the cards, the chips, the pager and J/K cannot disagree about it */
  shortlist: readonly IssueSession[];
  /** how many of it the strip draws */
  visibleSessions: number;
  onShowMoreSessions: () => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  sessionFilters: SessionFilters;
  sessionQuery: string;
  onSessionQuery: (value: string) => void;
  onToggleSessionFilter: (key: SessionFilterKey, value: string) => void;
  onClearSessionFilters: () => void;
  onStepSession: (delta: number) => void;
  /** leave the issue entirely and go back to the table */
  onClose: () => void;
  /** which panel is open in the right-hand column, null once collapsed */
  sidePanel: SidePanel | null;
  onToggleSidePanel: (panel: SidePanel) => void;
  /* Selecting a tab is not toggling it: `onToggleSidePanel` closes the panel when
     the open tab is clicked again, which is right for the show/hide button in the
     header and wrong for a tab strip. */
  onSelectPanel: (panel: SidePanel) => void;
  criticalState: CriticalState;
  matchedBy?: string;
  hidden: boolean;
  onOpenSession: (index: number) => void;
  onCloseSession: () => void;
  onTogglePeek: () => void;
  /** set once a task exists, so the CTA can report itself instead of
   *  offering to do the same thing again */
  taskKey?: string;
  onCreateTask: () => void;
  onOpenCritical: () => void;
  onOpenRename: () => void;
  onOpenHide: () => void;
  onUnhide: () => void;
  onDropCritical: () => void;
  onRestoreCritical: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE WORK PANE: a header, and a body under it split into two columns.
 *
 *     ┌──────────────────────────────────────────────┬────────────┐
 *     │  header: back, title, actions, panel toggles │            │
 *     ├──────────────────────────────────────────────┤            │
 *     │  the write-up      full  ->  half  ->  gone  │  a side    │
 *     │  the sessions      cards ->  strip           │  panel     │
 *     │  the replay        gone  ->  flex: 1         │            │
 *     └──────────────────────────────────────────────┴────────────┘
 *
 * THE HEADER SPANS EVERYTHING, and that is what makes the right-hand column a
 * region rather than one special case. Both columns begin under the same top
 * edge, so the control that opens each panel can sit in the header and a second
 * panel is a second glyph rather than a second layout.
 *
 * THE LEFT COLUMN IS THE FLOW, and its whole "collapsing panels" behaviour is
 * the fact that exactly one of its children carries `flex: 1` at any moment.
 * Nothing animates height by hand, nothing is measured, nothing is absolutely
 * positioned. The rows are always in the same order:
 *
 * At triage the write-up is the one that grows and the session cards sit under
 * it as a fixed band. Open a session and the write-up goes, the cards shrink to
 * a strip, and the replay takes everything they gave up. The strip does not
 * travel: it rides up because the thing above it got shorter. That is why
 * nothing on this screen appears to jump between depths.
 *
 * Going back is the same read in reverse, and every step of it is one click on
 * the thing you want back: the title in the header to re-read the write-up over
 * the player, the chevron beside it to return to the session cards, the queue on
 * the left to start over.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function WorkPane(props: WorkPaneProps) {
  const { issue, title, depth, peek, openIndex, sidePanel, autoplay } = props;
  const watching = depth !== 'triage' && openIndex != null;
  const writeUpOpen = !watching || peek;
  const session: IssueSession | undefined = openIndex != null ? props.sessions[openIndex] : undefined;

  /* The write-up is open at triage, where it IS the screen, and while peeked,
     where it is pulled back over a running replay. Closed is not a size: the
     component simply does not render. */

  /* ONE PLAYHEAD, owned here, because two things read it: the track under the
     player and the journey beside it. Held at this level rather than inside the
     player so that neither of them can be the source of truth for the other.
     Called unconditionally with a placeholder length while nothing is open -
     the hook resets itself on every duration change, so an unused clock costs a
     number nobody reads. */
  /* AUTOPLAY IS ONE LINE, and it is here rather than in the strip because this
     is where the clock and the stepper are both in scope. A recording ending is
     the only event in the flow that can move you without you asking, so it is
     also the only one that has to be opted into. */
  const strip = (
    <SessionStrip
      sessions={props.sessions}
      shortlist={props.shortlist}
      visible={props.visibleSessions}
      onShowMore={props.onShowMoreSessions}
      autoplay={props.autoplay}
      onToggleAutoplay={props.onToggleAutoplay}
      activeIndex={openIndex}
      onOpen={props.onOpenSession}
      onStep={props.onStepSession}
      density={watching ? 'strip' : 'cards'}
      filters={props.sessionFilters}
      query={props.sessionQuery}
      onQuery={props.onSessionQuery}
      onToggleFilter={props.onToggleSessionFilter}
      onClearFilters={props.onClearSessionFilters}
    />
  );

  const clock = useReplayClock(session ? durationSeconds(session.dur) : 300, {
    onEnded: () => { if (autoplay) props.onStepSession(1); },
  });

  /* Rolling into the next recording means playing it, not landing on a paused
     first frame. It fires on any session change while the mode is on, which is
     the right reading of "play me through these": clicking a chip mid-run keeps
     running rather than stopping to ask. */
  const startedFor = useRef<IssueSession | undefined>(undefined);
  useEffect(() => {
    if (!autoplay || !session) { startedFor.current = undefined; return; }
    if (startedFor.current === session) return;
    startedFor.current = session;
    clock.play();
  }, [autoplay, session, clock]);

  /* ⚠ THE FRAME IS ReplayScreen's NOW (2026-09-14) - the same header, body,
     peek, strip and side panel every recording in the app renders. What this
     pane still owns is what is the issue's: the write-up toggle as the lead,
     the critical flag / Jira / copy / menu as the verbs, the sessions strip
     as the band, the write-up as the peek, and the two tabs the panel holds -
     the journey and the answers. */
  const steps = session ? journeyStepCount(issue, session) : 0;
  return (
    <ReplayScreen
      className={`m-work--${depth}`}
      back={watching ? { label: 'Sessions', onClick: props.onCloseSession } : { label: 'Issues', onClick: props.onClose }}
      lead={<IssueLead issue={issue} title={title} open={writeUpOpen} showTitle={watching} onToggle={props.onTogglePeek} />}
      actions={
        <IssueActions
          criticalState={props.criticalState}
          matchedBy={props.matchedBy}
          hidden={props.hidden}
          markdown={() =>
            issueMarkdown(issue, {
              title,
              shortlist: props.shortlist.slice(0, props.visibleSessions),
              total: props.sessions.length,
              session,
            })
          }
          taskKey={props.taskKey}
          onCreateTask={props.onCreateTask}
          onOpenCritical={props.onOpenCritical}
          onOpenRename={props.onOpenRename}
          onOpenHide={props.onOpenHide}
          onUnhide={props.onUnhide}
          onDropCritical={props.onDropCritical}
          onRestoreCritical={props.onRestoreCritical}
        />
      }
      panels={
        watching && session
          ? [
              { key: 'journey', label: 'Journey', count: steps, hint: 'What the person did, step by step' },
              { key: 'details', label: 'Details', hint: 'What the agent wrote about it' },
            ]
          : undefined
      }
      panel={watching ? sidePanel : null}
      onPanel={(key) => {
        if (key == null) {
          if (sidePanel) props.onToggleSidePanel(sidePanel);
        } else props.onSelectPanel(key as SidePanel);
      }}
      renderPanel={(key) =>
        session ? (key === 'details' ? <IssueAnswers issue={issue} /> : <JourneyList issue={issue} session={session} clock={clock} />) : null
      }
      peek={watching && writeUpOpen ? <IssueWriteUp issue={issue} title={title} session={session} variant="peek" /> : undefined}
      strip={watching ? strip : undefined}
    >
      {watching ? (
        session && <ReplayPlayer issue={issue} session={session} clock={clock} />
      ) : (
        <div className="m-work__scroll">
          <IssueWriteUp issue={issue} title={title} session={session} />
          {strip}
        </div>
      )}
    </ReplayScreen>
  );
}
