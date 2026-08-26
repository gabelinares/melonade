import { Dropdown } from 'antd';
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  PanelRight,
  Pencil,
} from 'lucide-react';
import type { Issue } from '@shared/issues-data.ts';
import type { CriticalState } from '@shared/issues-logic.ts';
import { CriticalFlag } from '../components/CriticalFlag.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ImpactMeter } from '../components/ImpactMeter.tsx';
import { JiraIcon } from '../components/JiraIcon.tsx';
import { CopyMarkdown } from '../components/CopyMarkdown.tsx';
import type { SidePanel } from '../state/useIssues.ts';
import './issue-header.css';

export interface IssueHeaderProps {
  issue: Issue;
  title: string;
  /** the write-up under it is open, so the caret points up */
  open: boolean;
  /** at the write-up depth the article below leads with its own title, so the
   *  row carries the breadcrumb instead of repeating it */
  showTitle: boolean;

  /** the title in the row also COLLAPSES the write-up, which only means
   *  something at the replay depth - there the write-up is a panel over the
   *  player. At the write-up depth the title is still here, it just is not a
   *  control. Named for what it does rather than for what is visible, because
   *  the title is visible either way. */
  criticalState: CriticalState;
  matchedBy?: string;
  hidden: boolean;
  onToggle: () => void;
  /** leave the recording. Absent at the write-up depth. */
  onBack?: () => void;
  /** leave the issue entirely and go back to the table. */
  onClose: () => void;
  sidePanel?: SidePanel | null;
  onToggleSidePanel?: (panel: SidePanel) => void;
  markdown: () => string;
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
 * THE PANE HEADER, across the whole width.
 *
 * Ported from option B, and the structure is deliberately identical: one row
 * above everything, the flow on the left of the body and the side panels on the
 * right, both beginning under the same top edge. That is what makes the panels
 * a SET rather than one special case - adding a second one is a second glyph in
 * the group at the end of this row.
 *
 * WHAT CHANGED IN THE TRANSLATION, and it is only two things:
 *
 * 1. The first control is a way OUT OF THE ISSUE, not out of the queue. B keeps
 *    a permanent queue column beside the pane, so its header toggles that
 *    column. Graphite's list is a paginated table and stays one, because the
 *    table is what this option is liked for - so the detail is a screen you
 *    enter, and the thing you need at its top left is the way back to the
 *    table. Same slot, same size, different destination.
 * 2. Impact is a METER, not a dot. B marks impact with a 7px dot because its
 *    rows are two lines of prose; Graphite has a component that draws the
 *    figure, and a system that owns a meter should not also grow a dot.
 *
 * The row is one piece of markup at every depth: same height, same back button
 * on the same pixel, same critical flag, same actions, whether the write-up
 * under it is open, peeked or closed. Only the caret turns over.
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
  onClose,
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
  const menu = [
    { key: 'rename', label: 'Rename', icon: <Pencil size={13} />, onClick: onOpenRename },
    /* Dropping a critical only makes sense when MY OWN description flagged it:
       muting a teammate's signal changes nothing worth offering, so the item is
       absent rather than disabled. */
    ...(criticalState === 'mine'
      ? [{ key: 'drop', label: 'Not critical for me', icon: <BellOff size={13} />, onClick: onDropCritical }]
      : []),
    ...(criticalState === 'dismissed'
      ? [{ key: 'restore', label: 'Show as critical again', icon: <Bell size={13} />, onClick: onRestoreCritical }]
      : []),
    { type: 'divider' as const, key: 'd1' },
    hidden
      ? { key: 'unhide', label: 'Unhide', icon: <Eye size={13} />, onClick: onUnhide }
      : { key: 'hide', label: 'Hide', icon: <EyeOff size={13} />, onClick: onOpenHide },
  ];

  return (
    <header className="m-ihdr">
      <IconButton
        icon={onBack ? <ChevronLeft size={15} /> : <ArrowLeft size={15} />}
        label={onBack ? 'Back to the sessions (Esc)' : 'Back to all issues (Esc)'}
        variant="ghost"
        onClick={onBack ?? onClose}
      />

      {showTitle ? (
        <button
          type="button"
          className="m-ihdr__grow"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse the write-up: ${title}` : `Expand the write-up: ${title}`}
        >
          <span className="m-ihdr__line">
            <ImpactMeter value={issue.impact} compact />
            <span className="m-ihdr__title m-truncate">{title}</span>
            {open ? (
              <ChevronUp size={14} className="m-ihdr__caret" aria-hidden="true" />
            ) : (
              <ChevronDown size={14} className="m-ihdr__caret" aria-hidden="true" />
            )}
          </span>
        </button>
      ) : (
        /* A breadcrumb, not a label. B says "The issue" here because its queue
           is still on screen saying where you are; Graphite left a table to get
           here, so the row has to say what it left. */
        <nav className="m-ihdr__crumb" aria-label="Breadcrumb">
          <button type="button" onClick={onClose}>Issues</button>
          <span aria-hidden="true">/</span>
          <span>This issue</span>
        </nav>
      )}

      <div className="m-ihdr__actions">
        {/* ORDER: what this issue IS, then what to do about it, then the rest.
            The flag is a statement - somebody's description matched - and the
            Jira button is the action that statement argues for. */}
        <CriticalFlag state={criticalState} matchedBy={matchedBy} onClick={onOpenCritical} />

        {taskKey ? (
          <span className="m-ihdr__filed" title={`${taskKey} already created`}>
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
        )}

        <CopyMarkdown markdown={markdown} label="Copy the issue as markdown" icon={<Copy size={15} />} />

        <Dropdown menu={{ items: menu }} placement="bottomRight" trigger={['click']}>
          <span>
            <IconButton icon={<MoreHorizontal size={15} />} label="Issue actions" variant="ghost" />
          </span>
        </Dropdown>
      </div>

      {/* THE PANEL GROUP, behind its own hairline, because these controls are
          about the PANE and everything to their left is about the issue. */}
      {onToggleSidePanel && (
        <div className="m-ihdr__panels" role="group" aria-label="Side panels">
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
