import { useEffect, useRef } from 'react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import type { CriticalState, SessionFilterKey, SessionFilters } from '@shared/issues-logic.ts';
import { issueMarkdown } from '@shared/issue-markdown.ts';
import { durationSeconds } from '@shared/replay.ts';
import { JourneyPanel } from '../replay/JourneyPanel.tsx';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';
import type { SidePanel } from '../state/useIssues.ts';
import { IssueHeader } from './IssueHeader.tsx';
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

  return (
    <div className={`m-work m-work--${depth}`}>
      <IssueHeader
        issue={issue}
        title={title}
        open={writeUpOpen}
        /* Triage is the one place the row does not repeat the title: the
           article right under it is a document and leads with its own. */
        showTitle={watching}
        criticalState={props.criticalState}
        matchedBy={props.matchedBy}
        hidden={props.hidden}
        onToggle={props.onTogglePeek}
        onBack={watching ? props.onCloseSession : undefined}
        /* The window the reader is actually looking at, not the whole ranked
           list. `shortlist` is every session that survived the filter, which
           the strip slices before drawing; a paste that ignored the slice
           arrived with a hundred and thirty near-identical bullets under a
           heading that says "shortlist". */
        markdown={() =>
          issueMarkdown(issue, {
            title,
            shortlist: props.shortlist.slice(0, props.visibleSessions),
            total: props.sessions.length,
            session,
          })
        }
        onClose={props.onClose}
        sidePanel={watching ? sidePanel : undefined}
        onToggleSidePanel={watching ? props.onToggleSidePanel : undefined}
        taskKey={props.taskKey}
        onCreateTask={props.onCreateTask}
        onOpenCritical={props.onOpenCritical}
        onOpenRename={props.onOpenRename}
        onOpenHide={props.onOpenHide}
        onUnhide={props.onUnhide}
        onDropCritical={props.onDropCritical}
        onRestoreCritical={props.onRestoreCritical}
      />

      <div className="m-work__body">
        <div className="m-work__main">
          {/* ── TRIAGE IS ONE DOCUMENT ──────────────────────────────────────
              The write-up, the answer and the sessions are one scroll, not
              three boxes with heights of their own. Each section is exactly as
              tall as its contents, so the space between the prose and the fix
              belongs to the prose and the space under the cards belongs to the
              cards, rather than being whatever was left over after two fixed
              heights had taken their share.

              What this gives up is the old promise that the picker is never
              below the fold. That promise was being kept by capping the cards
              band at 25rem and the article at the pane, which is how a short
              write-up ended up with 200px of nothing in the middle of it and
              the reader ended up with two scrollbars and no way to tell which
              one they were in. One scroll, one scrollbar, no dead bands. */}
          {watching ? (
            <>
              {writeUpOpen && (
                <div className="m-work__peek">
                  <IssueWriteUp issue={issue} title={title} session={session} variant="peek" />
                </div>
              )}
              {strip}
              {session && <ReplayPlayer issue={issue} session={session} clock={clock} />}
            </>
          ) : (
            <div className="m-work__scroll">
              <IssueWriteUp issue={issue} title={title} session={session} />
              {strip}
            </div>
          )}
        </div>

        {/* SESSION REPLAY ONLY. This panel is about the recording that is
            playing - its journey, and the write-up read beside it - so it does
            not exist at the issue depth, where the document below is the
            write-up. */}
        {watching && session && sidePanel && (
          <JourneyPanel
            issue={issue}
            session={session}
            clock={clock}
            tab={sidePanel}
            onTab={props.onSelectPanel}
          />
        )}
      </div>
    </div>
  );
}
