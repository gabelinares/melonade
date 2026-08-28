import { App, Button, Dropdown, Pagination, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { Calendar, Merge, MoreHorizontal, Play, Plus, Server, ShieldAlert, Tag as TagIcon } from 'lucide-react';
import type { DataState } from '@shared/issues-logic.ts';
import { minutesSince, scheduleLabel, scheduleShort, type TestCase } from '@shared/tests-data.ts';
import { hasNoEnvironment, isScheduled, type StatusTab, type TestSortKey } from '@shared/tests-logic.ts';
import type { TestsController } from '../state/useTests.ts';
import { useTestDialogs } from '../dialogs/useTestDialogs.tsx';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { MoreCount } from '../components/MoreCount.tsx';
import { PageToolbar } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import { TestStatusChip } from '../components/TestStatusChip.tsx';
import './tests-page.css';

const FILTER_ICONS = { envs: Server, tags: TagIcon } as const;

/** An empty tab names ITS OWN emptiness. "No results" would be true on all six
 *  and useful on none. */
const EMPTY_TAB: Record<StatusTab, string> = {
  all: 'No tests yet',
  draft: 'No drafts waiting',
  needs_review: 'Nothing to review',
  approved: 'Nothing approved and idle',
  active: 'No tests are running',
  paused: 'Nothing is paused',
};

/** A cell with nothing in it says so in words. An empty cell reads as a bug;
 *  "Not set" reads as a decision nobody has made yet, which is what it is. */
function NotSet({ children = 'Not set' }: { children?: string }) {
  return <span className="m-tests__unset">{children}</span>;
}

export interface TestsListProps {
  model: TestsController;
  /** Driven by the prototype panel, like the issue queue's. Loading and empty
   *  are where list designs actually fail, so they are switchable rather than
   *  hidden. */
  dataState: DataState;
  /** Writing a test by hand. The button lives in the page header too, so the
   *  action belongs to the page and the empty state only asks for it. */
  onCreate: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE TESTS TAB: the tests themselves.
 *
 * Same page shell, same table rhythm and the same three toolbar questions as
 * the issue queue - a reader who has learnt one list has learnt this one. What
 * differs is what the toolbar's left half means: on Issues the strip is a set
 * of independent category toggles, here it is five views of one list, because a
 * test has exactly one status. Same control, different arithmetic behind it.
 *
 * Two things about this page are worth reading before changing it:
 *
 * 1. THE DEFAULT ORDER IS A QUEUE, NOT A SORT. Drafts first, then anything with
 *    a revision or a merge waiting, then the rest as they were. Clicking a
 *    column header replaces that with a flat sort, and clicking it a third time
 *    gives the queue back. A list that is half queue and half sort is a list
 *    nobody can predict.
 * 2. THE REJECT GRAMMAR IS NOT COSMETIC. You DISMISS a suggestion the agent
 *    made and you DELETE work a person did, and a row never offers both. The
 *    production build offered both and somebody's test went with the draft.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function TestsList({ model, dataState, onCreate }: TestsListProps) {
  const dialogs = useTestDialogs(model);
  const { message } = App.useApp();
  const { state, scope, selected } = model;

  const runNow = (tc: TestCase) => message.success(`${tc.title} — run started, see Runs`);

  const duplicate = (tc: TestCase) => {
    /* The copy lands with a confirmation rather than appearing silently: it
       goes to the top of the list, which is not where you were looking. */
    model.duplicate(tc);
    message.success('Duplicated as a draft');
  };

  const startMerge = (tc: TestCase) => {
    model.selectAlso(tc.key);
    message.info('Pick the tests to merge with, then hit Merge in the toolbar.');
  };

  /* ── the row menu ───────────────────────────────────────────────────────
     Four shapes, because a draft, a merge in review, a revision in review and a
     running test can each do a different set of things. Building one menu and
     disabling most of it would say the opposite: that these are all the same
     row with things switched off. */
  const rowMenu = (tc: TestCase) => {
    const review = model.needsReview(tc);
    const items: NonNullable<Parameters<typeof Dropdown>[0]['menu']>['items'] = [];

    if (tc.pendingMerge) {
      items.push(
        { key: 'open', label: 'Review merge' },
        { key: 'cancel-merge', label: 'Cancel merge' },
        { type: 'divider' },
        { key: 'delete', label: 'Delete', danger: true },
      );
    } else if (tc.status === 'draft') {
      items.push(
        { key: 'open', label: 'Review draft' },
        { key: 'merge', label: 'Merge with…' },
        { type: 'divider' },
        tc.origin === 'user'
          ? { key: 'delete', label: 'Delete', danger: true }
          : { key: 'dismiss', label: 'Dismiss', danger: true },
      );
    } else if (review && state.pauseOnRevision) {
      /* The test is suspended until the new version is read, so the menu leads
         with the only move that changes that. */
      items.push(
        { key: 'open', label: 'Review changes' },
        { key: 'duplicate', label: 'Duplicate' },
        { type: 'divider' },
        { key: 'delete', label: 'Delete', danger: true },
      );
    } else {
      if (tc.status === 'active') items.push({ key: 'pause', label: 'Pause' });
      if (tc.status === 'paused') {
        const blocked = hasNoEnvironment(tc);
        items.push({
          key: 'resume',
          disabled: blocked,
          label: blocked ? (
            <Tooltip title="Set an environment in this test's settings to resume." placement="left">
              <span>Resume</span>
            </Tooltip>
          ) : (
            'Resume'
          ),
        });
      }
      if (tc.status === 'approved') items.push({ key: 'schedule', label: 'Schedule' });
      if (tc.status === 'active' || tc.status === 'paused') items.push({ key: 'unschedule', label: 'Unschedule' });
      items.push(
        { key: 'open', label: review ? 'Review changes' : 'Settings' },
        { key: 'duplicate', label: 'Duplicate' },
        { key: 'merge', label: 'Merge with…' },
        { type: 'divider' },
        { key: 'delete', label: 'Delete', danger: true },
      );
    }

    return {
      items,
      onClick: ({ key, domEvent }: { key: string; domEvent: { stopPropagation: () => void } }) => {
        domEvent.stopPropagation();
        if (key === 'open' || key === 'schedule') model.openTest(tc);
        else if (key === 'cancel-merge') {
          model.cancelMerge(tc.key);
          message.info('Merge cancelled — the original tests are back.');
        } else if (key === 'unschedule') model.unschedule(tc.key);
        else if (key === 'duplicate') duplicate(tc);
        else if (key === 'merge') startMerge(tc);
        else if (key === 'pause') model.pause(tc.key);
        else if (key === 'resume') model.resume(tc.key);
        else if (key === 'dismiss') dialogs.openDismiss(tc);
        else if (key === 'delete') dialogs.openDelete([tc.key]);
      },
    };
  };

  const sortOrder = (key: TestSortKey) =>
    state.sort?.key === key ? (state.sort.desc ? ('descend' as const) : ('ascend' as const)) : null;

  const columns: TableColumnsType<TestCase> = [
    {
      title: 'Test',
      key: 'title',
      sorter: true,
      sortOrder: sortOrder('title'),
      showSorterTooltip: false,
      render: (_: unknown, tc) => {
        const review = model.needsReview(tc);
        const dot = tc.pendingMerge
          ? 'Merged — arrange and accept the combined steps'
          : review
            ? 'New version — not reviewed yet'
            : tc.status === 'draft' && tc.isNew
              ? 'New — not reviewed yet'
              : null;
        return (
          <div className="m-tests__title-cell">
            <span className="m-tests__title m-truncate">{tc.title}</span>
            {/* From v2 up only. "v1" on every row would be noise: a version is
                interesting once the steps have actually changed. */}
            {(tc.version ?? 1) > 1 && <Chip>v{tc.version}</Chip>}
            {/* Running this one changes real data, so it is marked wherever the
                test is named. The short form here, the sentence in the panel. */}
            {tc.hasSideEffects && (
              <Tooltip title="Has side effects. Running this test changes real data: orders, accounts, payments.">
                <span className="m-tests__fx" aria-label="Has side effects">
                  <ShieldAlert size={13} aria-hidden="true" />
                </span>
              </Tooltip>
            )}
            {/* One dot for "something here is new and nobody has read it",
                whether that is a draft, a revision or a merge. The row is NOT
                also tinted: the dot already says it, and saying it twice on one
                row still only says it once. */}
            {dot && (
              <Tooltip title={dot}>
                <span className="m-tests__dot" role="img" aria-label={dot} />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tags',
      key: 'tags',
      width: 184,
      render: (_: unknown, tc) => {
        const tags = tc.tags ?? [];
        if (tags.length === 0) return <NotSet />;
        return (
          <div className="m-tests__chips">
            <Chip>{tags[0]}</Chip>
            <MoreCount hidden={tags.slice(1)} />
          </div>
        );
      },
    },
    {
      title: 'Environment',
      key: 'env',
      width: 148,
      sorter: true,
      sortOrder: sortOrder('env'),
      showSorterTooltip: false,
      render: (_: unknown, tc) => {
        const envs = tc.envNames ?? [];
        if (envs.length === 0) return <NotSet />;
        return (
          <div className="m-tests__chips">
            <span className="m-tests__env m-truncate">{envs[0]}</span>
            <MoreCount hidden={envs.slice(1)} />
          </div>
        );
      },
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 168,
      sorter: true,
      sortOrder: sortOrder('schedule'),
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        !isScheduled(tc.schedule) ? (
          <NotSet>Not scheduled</NotSet>
        ) : (
          <Tooltip title={scheduleLabel(tc.schedule)} mouseEnterDelay={0.2}>
            <span className="m-tests__sched">
              <Calendar size={12} aria-hidden="true" />
              <span className="m-truncate">{scheduleShort(tc.schedule)}</span>
            </span>
          </Tooltip>
        ),
    },
    {
      title: 'Created',
      key: 'created',
      width: 96,
      sorter: true,
      sortOrder: sortOrder('created'),
      showSorterTooltip: false,
      render: (_: unknown, tc) => <RelativeTime minutesAgo={minutesSince(tc.createdAt)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 124,
      sorter: true,
      sortOrder: sortOrder('status'),
      showSorterTooltip: false,
      render: (_: unknown, tc) => <TestStatusChip status={model.statusOf(tc)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 76,
      align: 'right',
      render: (_: unknown, tc) => {
        const suspended = tc.pendingMerge != null || (state.pauseOnRevision && model.needsReview(tc));
        return (
          <div className="m-tests__actions">
            {/* A draft has nothing to run yet - it is a proposal - so the
                control is absent rather than disabled on those rows. */}
            {tc.status !== 'draft' && (
              <Tooltip
                title={
                  tc.pendingMerge
                    ? 'Paused until the merged steps are accepted'
                    : suspended
                      ? 'Paused until the new version is reviewed'
                      : 'Run now'
                }
              >
                {/* A plain text button, the same one the kebab beside it is, so
                    the two controls in this cell are one pair rather than two
                    systems. It is wrapped because a disabled antd button eats
                    its own pointer events, and the tooltip is doing the most
                    useful work exactly when the button is disabled. */}
                <span>
                  <Button
                    type="text"
                    size="small"
                    disabled={suspended}
                    aria-label="Run now"
                    icon={<Play size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      runNow(tc);
                    }}
                  />
                </span>
              </Tooltip>
            )}
            <Dropdown trigger={['click']} placement="bottomRight" menu={rowMenu(tc)}>
              <Button
                type="text"
                size="small"
                aria-label={`Actions for ${tc.title}`}
                icon={<MoreHorizontal size={15} />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const rangeStart = model.total === 0 ? 0 : (model.page - 1) * model.pageSize + 1;
  const rangeEnd = (model.page - 1) * model.pageSize + model.rows.length;

  /* ── the first run ────────────────────────────────────────────────────────
     Nothing to set up and nothing to import: the agent is already watching, and
     what this state has to teach is that drafts arrive on their own. The manual
     button is there because writing a test by hand is easy and somebody
     impatient should not have to wait for the agent to agree with them. */
  const firstRun = (
    <EmptyState
      title="Watching your sessions"
      hint="As real users move through your app the agent learns the journeys they take. Once it has seen a full journey across enough sessions, it drafts a test here for you to review."
      action={
        <Button icon={<Plus size={14} />} onClick={onCreate}>
          Add a test by hand
        </Button>
      }
    />
  );

  const empty = (() => {
    switch (model.emptyReason) {
      case 'none':
        return firstRun;
      case 'filters':
        return (
          <EmptyState
            title="No tests match these filters"
            hint="Clear them to see the whole list again."
            action={<Button onClick={model.clearFilters}>Clear filters</Button>}
          />
        );
      default:
        return (
          <EmptyState
            title={EMPTY_TAB[state.status]}
            hint="Pick another tab to see the rest of the list."
          />
        );
    }
  })();

  return (
    <>
      <PageToolbar>
        {/* Five views of one list. A test has exactly one status, so unlike the
            issue queue's categories these are exclusive - same strip, different
            arithmetic. */}
        <FilterStrip
          label="Filter by status"
          items={model.counts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[state.status]}
          onSelect={(key) => model.setStatus(key as StatusTab)}
        />
        {/* Selecting rows swaps the right-hand cluster for the actions that
            apply to them: same row, no banner sliding the table down, and every
            button carries the count it would affect so nobody has to hold "how
            many were active again" in their head. */}
        <div className="m-tests__controls">
          {selected.length > 0 ? (
            <>
              <span className="m-tests__selcount">{selected.length} selected</span>
              {scope.pausable > 0 && (
                <Button size="small" onClick={model.pauseSelected}>
                  Pause ({scope.pausable})
                </Button>
              )}
              {scope.resumable > 0 && (
                <Button size="small" onClick={model.resumeSelected}>
                  Resume ({scope.resumable})
                </Button>
              )}
              {selected.length >= 2 && (
                <Tooltip
                  title={
                    scope.mergeBlocked ? 'A selected test has a review pending — resolve it first.' : undefined
                  }
                >
                  <span>
                    <Button
                      size="small"
                      disabled={scope.mergeBlocked}
                      icon={<Merge size={13} />}
                      onClick={dialogs.openMerge}
                    >
                      Merge ({selected.length})
                    </Button>
                  </span>
                </Tooltip>
              )}
              <Button size="small" danger onClick={() => dialogs.openDelete(selected)}>
                Delete ({selected.length})
              </Button>
              <Button size="small" type="text" onClick={model.clearSelection}>
                Clear
              </Button>
            </>
          ) : (
            <FilterMenu
              dimensions={model.dimensions}
              isActive={model.isFilterActive}
              onToggle={model.toggleFilter}
              activeCount={model.filterCount}
              icons={FILTER_ICONS}
              label="Filter tests"
            />
          )}
        </div>
      </PageToolbar>

      <ActiveFilters
        chips={model.chips}
        onRemove={model.toggleFilter}
        onClearAll={model.clearFilters}
        resultCount={model.total}
        noun={['test', 'tests']}
      />

      {dataState === 'loading' ? (
        <SkeletonRows rows={7} columns={[34, 16, 12, 14, 8, 10]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.rows.length === 0 ? (
        empty
      ) : (
        <>
          <Table<TestCase>
            className="m-tests__table"
            rowKey="key"
            columns={columns}
            dataSource={model.rows}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => model.setSelected(keys as string[]),
              columnWidth: 40,
            }}
            rowClassName="m-tests__row"
            /* The header sorts the WHOLE filtered list, not the page in front of
               you: antd only ever sees twenty rows, so the ordering is done in
               the shared layer and the table is told what it decided. */
            onChange={(_p, _f, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              if (!s?.order) model.setSort(null);
              else model.setSort(s.columnKey as TestSortKey, s.order === 'descend');
            }}
            onRow={(tc) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (
                  el.closest('button') ||
                  el.closest('.ant-checkbox-wrapper') ||
                  el.closest('.ant-table-selection-column') ||
                  el.closest('.ant-dropdown')
                )
                  return;
                model.openTest(tc);
              },
            })}
          />
          <footer className="m-tests__foot">
            <span className="m-tests__range">
              {model.paginated
                ? `${rangeStart}–${rangeEnd} of ${model.total} tests`
                : `${model.total} ${model.total === 1 ? 'test' : 'tests'}`}
            </span>
            {model.paginated && (
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

      <StubDrawer
        open={model.open != null}
        onClose={model.closeTest}
        title={model.open?.title ?? ''}
        meta={
          model.open && (
            <>
              <TestStatusChip status={model.statusOf(model.open)} />
              <span>
                {model.open.stepCount} {model.open.stepCount === 1 ? 'step' : 'steps'}
              </span>
              {(model.open.version ?? 1) > 1 && <span>v{model.open.version}</span>}
            </>
          )
        }
        note="The test panel — the steps, the run settings, the schedule, the versions and the review of a proposed change — is the next piece. This round is the list: the queue order, the status tabs, the filters and every action that lives on a row."
      />
      {dialogs.elements}
    </>
  );
}
