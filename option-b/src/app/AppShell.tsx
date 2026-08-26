import { useCallback, useEffect, useState } from 'react';
import { spotlight } from '@mantine/spotlight';
import { AgentRail } from '../nav/AgentRail.tsx';
import { SHIPPED_AGENT_COUNT } from '../nav/agents.ts';
import { IssueListColumn } from '../issues/IssueListColumn.tsx';
import { WorkPane } from '../issues/WorkPane.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { useIssueDialogs } from '../dialogs/useIssueDialogs.tsx';
import { useIssues } from '../state/useIssues.ts';
import { Commands } from './Commands.tsx';
import { PrototypePanel } from './PrototypePanel.tsx';
import { Placeholder } from './Placeholder.tsx';
import './app-shell.css';

export function AppShell() {
  const model = useIssues();
  const dialogs = useIssueDialogs(model);
  const [active, setActive] = useState('issues');
  const [agentCount, setAgentCount] = useState(SHIPPED_AGENT_COUNT);

  const onNavigate = useCallback((key: string) => setActive(key), []);

  /* ── the flow, on the keyboard ────────────────────────────────────────────
     J and K walk the queue and the pane follows, which is the payoff of keeping
     the queue on screen: triaging eleven issues is eleven keystrokes rather
     than eleven round trips through a list page.

     ONCE A REPLAY IS OPEN THEY WALK THE SESSIONS INSTEAD. The queue is not on
     screen at that depth, and a key that silently changes a selection nobody
     can see is worse than a key that does nothing. It is also the right verb:
     an issue and a session inside it are two different things, and while you
     are watching one, "next" means the next recording, which is the same move
     the tabs above the player make.

     The rest is the same flow the mouse does, in one direction each. ENTER goes
     one step DOWN - open the first session, and if one is already open, widen
     the player by collapsing the panel beside it. ESC goes one step UP,
     unwinding peek, then the collapsed panel, then the session itself. So the
     whole depth model is two keys, and neither of them is a mode switch: they
     move you along a path you can also click.

     Space is play/pause, but only while something is playing. Binding it at
     triage depth would swallow the space bar for no reason. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);

      /* A FOCUSED CONTROL OWNS ENTER, SPACE AND THE ARROWS, and the shell does
         not get to have them. Without this, clicking a tab leaves that tab
         focused, and the next Enter - which the reader means as "activate this
         tab", the way Enter works on every button they have ever used - reached
         the shell instead and collapsed the panel beside the player. A shortcut
         that fires when the reader is talking to something else is not a
         shortcut, it is a trap, and it is invisible with a mouse: the click
         works, and the key press two seconds later does something unrelated.

         Only these keys, and only on controls. Escape stays global because
         "back" means back everywhere, and the letter shortcuts stay global
         because no button does anything with `j`. */
      const focusedControl =
        el instanceof HTMLElement &&
        !!el.closest(
          'button, a[href], select, [role="tab"], [role="slider"], [role="menuitem"], [role="menuitemcheckbox"], [role="switch"]',
        );
      const theirs =
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight';

      if (typing || (focusedControl && theirs) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (model.openIndex != null) model.stepSession(1);
        else model.stepNext();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (model.openIndex != null) model.stepSession(-1);
        else model.stepPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        model.stepOut();
      } else if (e.key === 'Enter' && model.selected) {
        e.preventDefault();
        if (model.openSession) model.setSidePanel(null);
        else if (model.shortlist.length > 0) model.openSessionAt(model.sessions.indexOf(model.shortlist[0]!));
      } else if (e.key === 'f' && model.openSession) {
        e.preventDefault();
        model.toggleSidePanel('journey');
      } else if (e.key === 'e' && model.selected) {
        e.preventDefault();
        dialogs.openHide(model.selected.id);
      } else if (e.key === 'c' && model.selected) {
        e.preventDefault();
        dialogs.openCritical(model.selected.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, dialogs]);

  return (
    /* `has-bottom-bar` is not a style, it is a fact the shell publishes: the
       player's transport runs the full width of the bottom edge once a replay
       is open. The floating prototype panel reads it and lifts itself clear.
       See the note on that lift in prototype-panel.css. */
    <div className={`b-shell${model.depth !== 'triage' ? ' has-bottom-bar' : ''}`}>
      <AgentRail
        active={active}
        onNavigate={onNavigate}
        agentCount={agentCount}
        onOpenSearch={spotlight.open}
      />

      {active === 'issues' ? (
        <>
          {/* THE QUEUE IS A TRIAGE INSTRUMENT AND IT LEAVES WITH TRIAGE. It
              answers "which issue", and once a recording is playing that has
              been answered twice: once by picking the issue, once by picking
              the session. What replaces it is not another list of issues at a
              smaller size - it is the journey panel on the other side of the
              pane, which is about the session you are actually watching.
              Getting back is unchanged: Esc, the chevron on the issue header,
              or Issues in the rail. */}
          {model.depth === 'triage' && model.queueOpen && (
            <IssueListColumn
              model={model}
              onOpenCritical={dialogs.openCritical}
              onOpenSearch={spotlight.open}
            />
          )}
          {model.selected ? (
            <WorkPane
              issue={model.selected}
              title={model.titleOf(model.selected)}
              depth={model.depth}
              peek={model.peek}
              openIndex={model.openIndex}
              sessions={model.sessions}
              shortlist={model.shortlist}
              visibleSessions={model.visibleSessions}
              onShowMoreSessions={model.showMoreSessions}
              autoplay={model.autoplay}
              onToggleAutoplay={model.toggleAutoplay}
              queueOpen={model.queueOpen}
              onToggleQueue={model.toggleQueue}
              sessionFilters={model.sessionFilters}
              sessionQuery={model.sessionQuery}
              onSessionQuery={model.setSessionQuery}
              onToggleSessionFilter={model.toggleSessionFilter}
              onClearSessionFilters={model.clearSessionFilters}
              onStepSession={model.stepSession}
              sidePanel={model.sidePanel}
              onToggleSidePanel={model.toggleSidePanel}
              criticalState={model.criticalState(model.selected.id)}
              matchedBy={model.matchedRules(model.selected.id).find((r) => !r.mine)?.createdBy}
              hidden={model.isHidden(model.selected.id)}
              onOpenSession={model.openSessionAt}
              onCloseSession={model.closeSession}
              onTogglePeek={model.togglePeek}
              taskKey={model.taskKey(model.selected.id)}
              onCreateTask={() => dialogs.openTask(model.selected!.id)}
              onOpenCritical={() => dialogs.openCritical(model.selected!.id)}
              onOpenRename={() => dialogs.openRename(model.selected!.id)}
              onOpenHide={() => dialogs.openHide(model.selected!.id)}
              onUnhide={() => model.unhide(model.selected!.id)}
              onDropCritical={() => model.dropCritical(model.selected!.id)}
              onRestoreCritical={() => model.restoreCritical(model.selected!.id)}
            />
          ) : (
            /* The controller falls back to the first row whenever the queue has
               anything in it, so this is only reachable with an empty queue. */
            <section className="b-work" aria-label="Issue detail">
              <EmptyState
                title="Nothing selected"
                hint="Pick an issue from the queue, or press J and K to walk it."
              />
            </section>
          )}
        </>
      ) : (
        <Placeholder page={active} />
      )}

      <Commands model={model} agentCount={agentCount} onNavigate={onNavigate} />
      {dialogs.elements}
      <PrototypePanel
        agentCount={agentCount}
        onAgentCount={setAgentCount}
        dataState={model.dataState}
        onDataState={model.setDataState}
      />
    </div>
  );
}
