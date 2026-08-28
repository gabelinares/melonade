import { Button, Dropdown, Pagination, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  AlertTriangle,
  BookOpen,
  CircleX,
  Eye,
  EyeOff,
  Gauge,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  Settings2,
} from 'lucide-react';
import { CAT_ORDER, SEGMENTS, type CategoryName, type Issue } from '@shared/issues-data.ts';
import type { FieldKey } from '@shared/issues-logic.ts';
import { useIssues } from '../state/useIssues.ts';
import { useIssueDialogs } from '../dialogs/useIssueDialogs.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { CapturePill } from '../components/CapturePill.tsx';
import { Chip } from '../components/Chip.tsx';
import { CriticalFlag } from '../components/CriticalFlag.tsx';
import { DisplayMenu } from '../components/DisplayMenu.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ImpactMeter } from '../components/ImpactMeter.tsx';
import { MoreCount } from '../components/MoreCount.tsx';
import { OriginBadge } from '../components/OriginBadge.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { WorkPane } from './WorkPane.tsx';
import './issues-page.css';

const CAT_ICON: Record<CategoryName, typeof CircleX> = {
  Errors: CircleX,
  'UI/UX': MousePointerClick,
  Slowness: Gauge,
};

/** A table row has no place to draw a session count without a column nobody
 *  asked for, so the pill is not offered rather than offered and ignored. */
const UNSUPPORTED_FIELDS: readonly FieldKey[] = ['sessions'];

/** A group header rendered as a full-width row inside the table body. antd has
 *  no grouping, so this rides in as a synthetic row keyed off the group. */
type Row = { kind: 'group'; key: string; label: string; count: number } | { kind: 'issue'; issue: Issue };

export interface IssuesPageProps {
  model: ReturnType<typeof useIssues>;
}

export function IssuesPage({ model }: IssuesPageProps) {
  const dialogs = useIssueDialogs(model);


  const { filters, display, counts } = model;


  /* Flatten the groups into rows the table can take. With no grouping this is
     just the issues, and the group column collapses to nothing. */
  const rows: Row[] = model.groups.flatMap((g) =>
    g.label
      ? [
          { kind: 'group' as const, key: g.key, label: g.label, count: g.issues.length },
          ...g.issues.map((issue) => ({ kind: 'issue' as const, issue })),
        ]
      : g.issues.map((issue) => ({ kind: 'issue' as const, issue })),
  );

  const columns: TableColumnsType<Row> = [
    ...(model.hasField('impact')
      ? [
          {
            title: 'Impact',
            key: 'impact',
            width: 116,
            render: (_: unknown, r: Row) =>
              r.kind === 'issue' ? <ImpactMeter value={r.issue.impact} /> : null,
          },
        ]
      : []),
    {
      title: 'Issue',
      key: 'head',
      render: (_: unknown, r: Row) => {
        /* the group header takes the whole width via colSpan below */
        if (r.kind === 'group') {
          return (
            <span className="m-issues__group">
              {r.label}
              <span className="m-issues__group-n">{r.count}</span>
            </span>
          );
        }
        const { issue } = r;
        const state = model.criticalState(issue.id);
        const matched = model.matchedRules(issue.id);
        const hidden = model.isHidden(issue.id);
        return (
          <div className="m-issues__title-cell">
            <CriticalFlag
              state={state}
              matchedBy={matched.find((x) => !x.mine)?.createdBy}
              onClick={() => dialogs.openCritical(issue)}
            />
            <span className="m-issues__title m-truncate">{model.titleOf(issue)}</span>
            {model.hasField('category') && (
              <span className="m-issues__cat">{issue.cat}</span>
            )}
            {hidden && (
              <Tooltip title={model.hiddenReason(issue.id) || 'Hidden'}>
                <span>
                  <Chip kind="status" tone="neutral">
                    Hidden
                  </Chip>
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
      onCell: (r: Row) => (r.kind === 'group' ? { colSpan: 9 } : {}),
    },
    ...(model.hasField('tags') || model.hasField('origin')
      ? [
          {
            title: model.hasField('tags') ? 'Tags' : 'Found in',
            key: 'tags',
            width: 208,
            onCell: (r: Row) => (r.kind === 'group' ? { colSpan: 0 } : {}),
            render: (_: unknown, r: Row) => {
              if (r.kind === 'group') return null;
              const segment = SEGMENTS.find((s) => s.id === r.issue.segmentId);
              return (
                <div className="m-issues__tags">
                  {model.hasField('origin') && <OriginBadge segmentName={segment?.name} />}
                  {model.hasField('tags') && (
                    <>
                      {r.issue.tags.slice(0, 1).map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                      <MoreCount hidden={r.issue.tags.slice(1)} />
                    </>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    ...(model.hasField('lastSeen')
      ? [
          {
            title: 'Last seen',
            key: 'seen',
            width: 104,
            onCell: (r: Row) => (r.kind === 'group' ? { colSpan: 0 } : {}),
            render: (_: unknown, r: Row) =>
              r.kind === 'issue' ? <RelativeTime minutesAgo={r.issue.seenAgoMin} /> : null,
          },
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: 44,
      align: 'center',
      onCell: (r: Row) => (r.kind === 'group' ? { colSpan: 0 } : {}),
      render: (_: unknown, r: Row) => {
        if (r.kind === 'group') return null;
        const { issue } = r;
        const hidden = model.isHidden(issue.id);
        const state = model.criticalState(issue.id);
        return (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === 'rename') dialogs.openRename(issue);
                else if (key === 'hide') dialogs.openHide(issue);
                else if (key === 'unhide') model.unhide(issue.id);
                else if (key === 'drop') model.dropCritical(issue.id);
                else if (key === 'restore') model.restoreCritical(issue.id);
              },
              items: [
                { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
                ...(state === 'mine'
                  ? [{ key: 'drop', icon: <AlertTriangle size={13} />, label: 'Not critical for me' }]
                  : state === 'dismissed'
                    ? [{ key: 'restore', icon: <AlertTriangle size={13} />, label: 'Show as critical again' }]
                    : []),
                { type: 'divider' as const },
                hidden
                  ? { key: 'unhide', icon: <Eye size={13} />, label: 'Unhide' }
                  : { key: 'hide', icon: <EyeOff size={13} />, label: 'Hide' },
              ],
            }}
          >
            <Button
              type="text"
              size="small"
              aria-label={`Actions for ${model.titleOf(issue)}`}
              icon={<MoreHorizontal size={15} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  const rangeStart = model.total === 0 ? 0 : (model.page - 1) * model.pageSize + 1;
  const rangeEnd = (model.page - 1) * model.pageSize + model.visible.length;

  const empty = (() => {
    switch (model.emptyReason) {
      case 'filters':
        return (
          <EmptyState
            title="No issues match these filters"
            hint="Clear them to see the whole list again."
            action={<Button onClick={model.clearFilters}>Clear filters</Button>}
          />
        );
      case 'mine':
        return (
          <EmptyState
            title="Nothing is critical to you yet"
            hint="Describe what matters to you on any issue, and everything like it lands here from then on."
          />
        );
      default:
        return (
          <EmptyState
            title="No issues found yet"
            hint="The agent is watching this project's sessions. The first finding usually lands within a day."
          />
        );
    }
  })();

  /* ── THE DETAIL IS A SCREEN ────────────────────────────────────────────────
     Option B keeps its queue on screen and opens the write-up in the pane
     beside it. Graphite's list is a paginated TABLE, and a table is the one
     shape that cannot give up half its width and stay a table - so the detail
     replaces it, and the way back is the first control in the pane header.

     Everything below that top-level choice is B's information architecture
     unchanged: one header across the pane, the flow on the left, the side
     panels on the right, and the same three depths inside it. */
  if (model.opened) {
    return (
      <WorkPane
        issue={model.opened}
        title={model.titleOf(model.opened)}
        depth={model.depth}
        peek={model.peek}
        openIndex={model.openIndex}
        sessions={model.sessions}
        shortlist={model.shortlist}
        visibleSessions={model.visibleSessions}
        onShowMoreSessions={model.showMoreSessions}
        autoplay={model.autoplay}
        onToggleAutoplay={model.toggleAutoplay}
        sidePanel={model.sidePanel}
        onToggleSidePanel={model.toggleSidePanel}
        onSelectPanel={model.setSidePanel}
        sessionFilters={model.sessionFilters}
        sessionQuery={model.sessionQuery}
        onSessionQuery={model.setSessionQuery}
        onToggleSessionFilter={model.toggleSessionFilter}
        onClearSessionFilters={model.clearSessionFilters}
        onStepSession={model.stepSession}
        criticalState={model.criticalState(model.opened.id)}
        matchedBy={model.matchedRules(model.opened.id).find((r) => !r.mine)?.createdBy}
        hidden={model.isHidden(model.opened.id)}
        onOpenSession={model.openSessionAt}
        onCloseSession={model.closeSession}
        onTogglePeek={model.togglePeek}
        onClose={() => model.openIssue(null)}
        taskKey={model.taskKey(model.opened.id)}
        onCreateTask={() => model.createTask(model.opened!.id)}
        onOpenCritical={() => dialogs.openCritical(model.opened!)}
        onOpenRename={() => dialogs.openRename(model.opened!)}
        onOpenHide={() => dialogs.openHide(model.opened!)}
        onUnhide={() => model.unhide(model.opened!.id)}
        onDropCritical={() => model.dropCritical(model.opened!.id)}
        onRestoreCritical={() => model.restoreCritical(model.opened!.id)}
      />
    );
  }

  return (
    <PageCard
      title="Issues"
      subtitle="What the agent found while reading this project's sessions, ranked by how many people each one reaches."
      actions={
        <>
          <SearchField
            placeholder="Search issues"
            value={filters.q}
            onChange={(v) => model.setFilter('q', v)}
          />
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Issues settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
      toolbar={
        <>
          {/* THE TABS OF THIS LIST, not a filter over it. Category is exclusive:
              picking one releases the others, and "All" is the empty selection
              rather than a fourth option. It was multi-select for a while, on
              the argument that it should compose like impact and tags - but the
              other dimensions narrow one list, and this one answers "which list
              am I reading". Same reasoning as the Tests strip, and the filter
              menu draws Category as radios so the two cannot disagree.

              It is `FilterStrip` and not antd's Segmented because the strip
              draws pressed state and reports clicks, and the page owns the
              arithmetic; a lookalike beside the real one is how two neighbouring
              controls drift by a pixel and then by four. */}
          <FilterStrip
            label="Filter by category"
            items={[
              { key: 'all', label: 'All', count: counts.all },
              ...CAT_ORDER.map((c) => {
                const Icon = CAT_ICON[c];
                return {
                  key: c,
                  label: c,
                  count: model.categoryCount(c),
                  icon: <Icon size={13} aria-hidden="true" />,
                };
              }),
            ]}
            selected={filters.cats.length === 0 ? ['all'] : filters.cats}
            onSelect={(key) =>
              key === 'all'
                ? model.setFilter('cats', [])
                : model.setFilter('cats', filters.cats[0] === key ? [] : [key as CategoryName])
            }
          />
          {/* Three controls, not five, and each answers a different question:
              what gets COLLECTED, what is shown of it, and how that is drawn.
              Collapsing them into one menu would put "show hidden" behind a
              badge that counts filters.
              Capture sits first because it is the outermost of the three - it
              decides what there is to filter at all - and it is an icon rather
              than the wide pill it used to be under the title: that pill spent a
              line saying "2 segments" about a setting somebody touches once a
              month, and being shaped like a chip it read as a filter while being
              the opposite of one. */}
          <div className="m-issues__controls">
            <CapturePill
              variant="icon"
              mode={model.captureMode}
              onModeChange={model.setCaptureMode}
              activeSegmentIds={model.activeSegmentIds}
              onToggleSegment={model.toggleSegment}
            />
            <FilterMenu
              dimensions={model.dimensions}
              isActive={model.isFilterActive}
              onToggle={model.toggleValue}
              activeCount={model.activeFilterCount}
            />
            <DisplayMenu
              display={display}
              onSet={model.setDisplay}
              onToggleField={model.toggleField}
              onReset={model.resetDisplay}
              changeCount={model.displayChangeCount}
              unsupportedFields={UNSUPPORTED_FIELDS}
            />
          </div>
        </>
      }
    >
      <ActiveFilters
        chips={model.activeFilters}
        onRemove={model.toggleValue}
        onClearAll={model.clearFilters}
        resultCount={model.total}
      />

      {model.dataState === 'loading' ? (
        <SkeletonRows rows={7} />
      ) : rows.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Row>
            className="m-issues__table"
            rowKey={(r) => (r.kind === 'group' ? `g:${r.key}` : r.issue.id)}
            columns={columns}
            dataSource={rows}
            pagination={false}
            /* NO EXPAND COLUMN. The caret was a 30px cell in front of every
               row whose only job was to say "this opens" - which the row says
               by being a row, and by moving under the cursor. Dropping it also
               puts the first thing on the row at the same distance from the
               plane's edge as the page title above it, which is the alignment
               the three tables now share. */
            onRow={(r) => ({
              onClick: (e) => {
                if (r.kind !== 'issue') return;
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                model.openIssue(r.issue.id);
              },
            })}
            rowClassName={(r) =>
              r.kind === 'group'
                ? 'is-group-row'
                : `m-issues__row${model.isHidden(r.issue.id) ? ' is-hidden-row' : ''}`
            }
          />
          <footer className="m-issues__foot">
            <span className="m-issues__range">
              {model.paginated
                ? `${rangeStart}–${rangeEnd} of ${model.total}`
                : `${model.total} ${model.total === 1 ? 'issue' : 'issues'} in ${model.groups.length} ${
                    model.groups.length === 1 ? 'group' : 'groups'
                  }`}
            </span>
            {model.paginated && model.total > model.pageSize && (
              <Pagination
                size="small"
                current={model.page}
                total={model.total}
                pageSize={model.pageSize}
                onChange={model.setPage}
                showSizeChanger={false}
              />
            )}
          </footer>
        </>
      )}
      {dialogs.elements}
    </PageCard>
  );
}
