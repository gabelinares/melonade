import { Menu } from '@mantine/core';
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Eye,
  EyeOff,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pencil,
} from 'lucide-react';
import type { Issue } from '@shared/issues-data.ts';
import type { CriticalState } from '@shared/issues-logic.ts';
import { CopyMarkdown } from '../components/CopyMarkdown.tsx';
import { CriticalFlag } from '../components/CriticalFlag.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { JiraIcon } from '../components/JiraIcon.tsx';
import { ImpactDot } from '../components/ImpactDot.tsx';
import type { SidePanel } from '../state/useIssues.ts';
import './issue-header.css';

export interface IssueHeaderProps {
  issue: Issue;
  title: string;
  /** the write-up under it is open, so the caret points up and the title is a
   *  collapse rather than an expand */
  open: boolean;
  /** triage: the article below leads with its own serif title, so the row
   *  carries an eyebrow instead of repeating it */
  showTitle: boolean;
  criticalState: CriticalState;
  matchedBy?: string;
  hidden: boolean;
  onToggle: () => void;
  /** leave the session and go back to choosing one. Absent at triage. */
  onBack?: () => void;
  /** the issue queue on the left. Absent once a recording is open, where the
   *  queue is not a thing you can have. */
  queueOpen?: boolean;
  onToggleQueue?: () => void;
  /** which side panel is open, and null once it is collapsed. Absent at triage,
   *  where there is no session for a panel to be about. */
  sidePanel?: SidePanel | null;
  onToggleSidePanel?: (panel: SidePanel) => void;
  /** the whole case as markdown, built on demand when the reader asks for it */
  markdown: () => string;
  /** the key of the task already filed for this issue, if there is one */
  taskKey?: string;
  onCreateTask?: () => void;
  onOpenCritical: () => void;
  onOpenRename: () => void;
  onOpenHide: () => void;
  onUnhide: () => void;
  onDropCritical: () => void;
  onRestoreCritical: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE HEADER, ACROSS THE WHOLE PANE.
 *
 * It used to be the lid on the write-up, which meant it stopped where the
 * write-up stopped and the journey panel started at the very top of the window
 * beside it: two pieces of chrome on two different top edges. It is now the
 * pane's own header and everything else in the pane hangs below it - the flow
 * on the left, the side panels on the right.
 *
 * That is not tidying. It is what makes the side panels a SET rather than one
 * special case: the right-hand column is now a region under a header, and the
 * control that opens each panel lives in the header the same way. Adding a
 * second panel is adding a second glyph to the group at the end of this row and
 * a second value to `SidePanel`, and nothing about the layout has to move.
 *
 * The row is one piece of markup at every depth. Same height, same back button
 * on the same pixel, same labelled critical flag, same overflow menu, whether
 * the write-up under it is open, peeked or closed. Only the caret turns over.
 *
 * TWO TARGETS THAT MUST NOT BLUR: the chevron on the left LEAVES the session,
 * the rest of the row expands the write-up. So the chevron is a real button with
 * its own label and the expander is the title itself, which is the thing you
 * would reach for anyway.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function IssueHeader({
  issue,
  title,
  open,
  showTitle,
  criticalState,
  matchedBy,
  hidden,
  onToggle,
  onBack,
  queueOpen,
  onToggleQueue,
  sidePanel,
  onToggleSidePanel,
  markdown,
  taskKey,
  onCreateTask,
  onOpenCritical,
  onOpenRename,
  onOpenHide,
  onUnhide,
  onDropCritical,
  onRestoreCritical,
}: IssueHeaderProps) {
  return (
    <header className="b-hdr">
      {/* THE QUEUE'S TOGGLE, mirroring the side panels' on the far right: left
          control for the left column, right controls for the right one. It is
          the first thing in the row rather than tucked in with the issue's own
          actions, because it is about the PANE, and it stays put whether the
          queue is open or shut so there is one place to look for it either way. */}
      {onToggleQueue && (
        <IconButton
          icon={<PanelLeft size={15} />}
          label={queueOpen ? 'Hide the issue list' : 'Show the issue list'}
          variant="ghost"
          pressed={queueOpen}
          onClick={onToggleQueue}
        />
      )}

      {onBack ? (
        <IconButton
          icon={<ChevronLeft size={15} />}
          label="Back to the sessions (Esc)"
          variant="ghost"
          onClick={onBack}
        />
      ) : (
        <span className="b-hdr__eyebrow">The issue</span>
      )}

      {showTitle && (
        <button
          type="button"
          className="b-hdr__grow"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse the write-up: ${title}` : `Expand the write-up: ${title}`}
        >
          <span className="b-hdr__line">
            <ImpactDot value={issue.impact} />
            <span className="b-hdr__title m-truncate">{title}</span>
            {open ? (
              <ChevronUp size={14} className="b-hdr__caret" aria-hidden="true" />
            ) : (
              <ChevronDown size={14} className="b-hdr__caret" aria-hidden="true" />
            )}
          </span>
        </button>
      )}

      <div className="b-hdr__actions">
        {/* ORDER: what this issue IS, then what to do about it, then the rest.
            The critical flag is a statement - somebody's description matched -
            and the Jira button is the action that statement argues for, so left
            to right is a reason and then its consequence. It ran the other way
            round, which put the answer before the question. */}
        <CriticalFlag
          variant="labelled"
          state={criticalState}
          matchedBy={matchedBy}
          onClick={onOpenCritical}
        />

        {/* THE ONE ACTION, at icon width. The labelled version of it lives in
            the suggested-fix band, which is the right place for it while you
            are reading - but the band is off screen the whole time a recording
            is playing, and "file this" is exactly what somebody does two
            minutes into watching it. Same fill, same glyph, same handler; the
            only difference is that up here there is no room for the words.
            Once it is filed it stops offering to file it again and reports the
            key instead, for the same reason the band's button does: a primary
            that stays primary after it has been used invites the second
            duplicate ticket. */}
        {onCreateTask &&
          (taskKey ? (
            <span className="b-hdr__filed" title={`${taskKey} already created`}>
              <JiraIcon size={13} />
              {taskKey}
            </span>
          ) : (
            <IconButton
              icon={<JiraIcon size={15} />}
              label="Create a Jira task"
              variant="primary"
              onClick={onCreateTask}
            />
          ))}
        {/* The case, on the clipboard, for the tool where the fix actually gets
            written. Ghost rather than filled: it is the second thing you might
            do with an issue you agree with, and only one control in this row
            gets to be the first. */}
        <CopyMarkdown markdown={markdown} label="Copy the issue as markdown" />

        <Menu position="bottom-end" width={210}>
          <Menu.Target>
            <IconButton icon={<MoreHorizontal size={15} />} label="Issue actions" variant="ghost" />
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<Pencil size={13} />} onClick={onOpenRename}>
              Rename
            </Menu.Item>
            {/* Dropping a critical only makes sense when MY OWN description
                flagged it: muting a teammate's signal changes nothing worth
                offering, so the item is absent rather than disabled. */}
            {criticalState === 'mine' && (
              <Menu.Item leftSection={<BellOff size={13} />} onClick={onDropCritical}>
                Not critical for me
              </Menu.Item>
            )}
            {criticalState === 'dismissed' && (
              <Menu.Item leftSection={<Bell size={13} />} onClick={onRestoreCritical}>
                Show as critical again
              </Menu.Item>
            )}
            <Menu.Divider />
            {hidden ? (
              <Menu.Item leftSection={<Eye size={13} />} onClick={onUnhide}>
                Unhide
              </Menu.Item>
            ) : (
              <Menu.Item leftSection={<EyeOff size={13} />} onClick={onOpenHide}>
                Hide
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* THE PANEL GROUP, behind its own hairline, because these controls are
          about the PANE and everything to their left is about the issue. One
          glyph today; the divider is what makes the second one look like it
          belongs rather than like it was appended to the issue actions. */}
      {onToggleSidePanel && (
        <div className="b-hdr__panels" role="group" aria-label="Side panels">
          <IconButton
            icon={<PanelRight size={15} />}
            label={sidePanel === 'journey' ? 'Hide the journey (F)' : 'Show the journey (F)'}
            variant="ghost"
            pressed={sidePanel === 'journey'}
            onClick={() => onToggleSidePanel('journey')}
          />
        </div>
      )}
    </header>
  );
}
