import { Dropdown } from 'antd';
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import type { Issue } from '@shared/issues-data.ts';
import type { CriticalState } from '@shared/issues-logic.ts';
import { CriticalFlag } from '../components/CriticalFlag.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ImpactMeter } from '../components/ImpactMeter.tsx';
import { JiraIcon } from '../components/JiraIcon.tsx';
import { CopyMarkdown } from '../components/CopyMarkdown.tsx';
import './issue-header.css';

/**
 * ⚠ TWO PIECES, NOT A HEADER (2026-09-14). The header itself - back link, lead,
 * actions, the panel toggle - is `ReplayScreen`'s, shared with every other
 * recording in the app. What is the ISSUE'S about that row is here in two
 * parts the screen composes: the lead (the write-up toggle while a recording
 * plays, a crumb at the issue depth) and the verbs (the critical flag, Jira,
 * copy, the menu).
 */
export interface IssueLeadProps {
  issue: Issue;
  title: string;
  open: boolean;
  showTitle: boolean;
  onToggle: () => void;
}

export function IssueLead({ issue, title, open, showTitle, onToggle }: IssueLeadProps) {
  if (!showTitle) {
    return (
      <nav className="m-ihdr__crumb" aria-label="Breadcrumb">
        <span>This issue</span>
      </nav>
    );
  }
  return (
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
  );
}

export interface IssueActionsProps {
  criticalState: CriticalState;
  matchedBy?: string;
  hidden: boolean;
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

export function IssueActions({
  criticalState,
  matchedBy,
  hidden,
  markdown,
  taskKey,
  onCreateTask,
  onOpenCritical,
  onOpenRename,
  onOpenHide,
  onUnhide,
  onDropCritical,
  onRestoreCritical,
}: IssueActionsProps) {
  const menu = [
    { key: 'rename', label: 'Rename', icon: <Pencil size={13} />, onClick: onOpenRename },
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
    <>
      <CriticalFlag state={criticalState} matchedBy={matchedBy} onClick={onOpenCritical} />
      {taskKey ? (
        <span className="m-ihdr__filed" title={`${taskKey} already created`}>
          <JiraIcon size={13} />
          {taskKey}
        </span>
      ) : (
        <IconButton icon={<JiraIcon size={15} />} label="Create a Jira task" variant="primary" onClick={onCreateTask} />
      )}
      <CopyMarkdown markdown={markdown} label="Copy the issue as markdown" icon={<Copy size={15} />} />
      <Dropdown menu={{ items: menu }} placement="bottomRight" trigger={['click']}>
        <span>
          <IconButton icon={<MoreHorizontal size={15} />} label="Issue actions" variant="ghost" />
        </span>
      </Dropdown>
    </>
  );
}
