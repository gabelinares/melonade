import { App, Button, Dropdown, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Calendar,
  CalendarClock,
  CircleCheck,
  Globe,
  Merge,
  MonitorSmartphone,
  MoreHorizontal,
  Play,
  Plus,
  Server,
  ShieldAlert,
  Tag as TagIcon,
} from 'lucide-react';
import type { DataState } from '@shared/issues-logic.ts';
import { minutesSince, scheduleLabel, scheduleShort, type TestCase } from '@shared/tests-data.ts';
import {
  TEST_FIELD_CHOICES,
  TEST_GROUP_CHOICES,
  TEST_SORT_CHOICES,
  type TestFieldKey,
  type TestGroupKey,
  hasNoEnvironment,
  isScheduled,
  type StatusTab,
  type TestFilterKey,
  type TestSortKey,
} from '@shared/tests-logic.ts';
import type { TestsController } from '../state/useTests.ts';
import { useTestDialogs } from '../dialogs/useTestDialogs.tsx';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { DisplayShell, MenuSelect, SortControl } from '../components/DisplayMenu.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { MoreCount } from '../components/MoreCount.tsx';
import { PageToolbar } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { sortable } from '../components/SortIcon.tsx';
import { TestDrawer } from './TestDrawer.tsx';
import { TestStatusChip } from '../components/TestStatusChip.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import './tests-page.css';

/* The same glyph for the same dimension as the Runs panel uses: environment,
   tags, viewport and region are one vocabulary asked at two levels, and two
   icons for one word would say they were two different questions. */
const FILTER_ICONS: Partial<Record<TestFilterKey, typeof Server>> = {
  envs: Server,
  tags: TagIcon,
  viewports: MonitorSmartphone,
  regions: Globe,
  schedules: CalendarClock,
  results: CircleCheck,
};

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
  /** The drawer about to open is a new test: its footer commits rather than
   *  saves, and Discard removes the row again. */
  creating?: boolean;
  onCreated?: () => void;
  /** "View all runs" from inside a test: the Runs section, filtered to it. */
  onViewRuns?: (title: string) => void;
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
/** A table row is a test, or the header of a group of them. antd has no
 *  grouping, so the header rides in as a synthetic row that colSpans the table -
 *  the same mechanism the issue queue uses, so the two lists group identically. */
type Row = { kind: 'group'; key: string; label: string; n: number } | { kind: 'test'; key: string; tc: TestCase };

export function TestsList({ model, dataState, onCreate, onViewRuns, creating, onCreated }: TestsListProps) {
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

  const allColumns: TableColumnsType<TestCase> = [
    {
      title: 'Test',
      key: 'title',
      ...sortable,
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
            {/* THE SAME MARK THE ISSUES LIST WEARS, IN THE SAME PLACE. It used
                to be a 6px dot of its own trailing the row; it is the app's 5px
                dot leading it now, because "something here is new and nobody
                has read it" is one fact and this is the second list that has to
                say it. What is different is the tooltip: an issue is only ever
                unopened, a test can be a draft, a revision or a merge, and the
                dot is worth hovering to find out which.

                ⚠ The slot is on every row - see `.m-dot.is-slot` in base.css
                for why an empty one still takes its space. */}
            {dot ? (
              <Tooltip title={dot}>
                <span className="m-dot is-slot" role="img" aria-label={dot} />
              </Tooltip>
            ) : (
              <span className="m-dot is-slot is-off" aria-hidden="true" />
            )}
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
      ...sortable,
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
      ...sortable,
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
      ...sortable,
      sortOrder: sortOrder('created'),
      showSorterTooltip: false,
      render: (_: unknown, tc) => <RelativeTime minutesAgo={minutesSince(tc.createdAt)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 124,
      ...sortable,
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

  /* The rows, grouped. One group means no header at all: a header that says
     "all" is a row of chrome saying nothing. */
  const rows: Row[] = model.groups.flatMap((g) => [
    ...(g.label ? [{ kind: 'group' as const, key: `g:${g.key}`, label: g.label, n: g.tests.length }] : []),
    /* The key is GROUP-SCOPED. A test that runs on Production and Staging is a
       row under both - that is the point of grouping by environment - and two
       rows carrying one key is a duplicate-key warning and a table that drops
       one of them. Selection maps back to the test underneath. */
    ...g.tests.map((tc) => ({ kind: 'test' as const, key: `${g.key}::${tc.key}`, tc })),
  ]);

  /* The chosen columns, wrapped for the two row kinds: the first cell spans the
     table on a group header and every other cell collapses to nothing. Wrapping
     is done here rather than in each column so a new column cannot forget. */
  const visible = allColumns.filter((c) => {
    const key = String(c.key ?? '');
    return key === 'title' || key === 'actions' || model.display.fields.includes(key as never);
  });
  const columns: TableColumnsType<Row> = visible.map((c, i) => ({
    ...(c as object),
    onCell: (r: Row) => (r.kind === 'group' ? { colSpan: i === 0 ? visible.length + 1 : 0 } : {}),
    render: (_: unknown, r: Row, idx: number) => {
      if (r.kind === 'group') {
        return i === 0 ? (
          <span className="m-tests__group">
            {r.label}
            <span className="m-tests__group-n">{r.n}</span>
          </span>
        ) : null;
      }
      const render = (c as { render?: (v: unknown, t: TestCase, i: number) => unknown }).render;
      const value = (r.tc as unknown as Record<string, unknown>)[String((c as { dataIndex?: string }).dataIndex ?? '')];
      return render ? (render(value, r.tc, idx) as never) : (value as never);
    },
  }));

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
        <div className="m-page__controls">
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
            <>
            <DisplayShell
              label="Display tests"
              changeCount={model.displayCount}
              onReset={model.resetDisplay}
              fields={TEST_FIELD_CHOICES.map((f) => ({
                value: f.value,
                label: f.label,
                on: model.display.fields.includes(f.value),
              }))}
              onToggleField={(v) => model.toggleField(v as TestFieldKey)}
              rows={[
                {
                  id: 'td-group',
                  label: 'Grouping',
                  control: (
                    <MenuSelect
                      id="td-group"
                      value={model.display.group}
                      choices={TEST_GROUP_CHOICES}
                      onChange={(v) => model.setGroup(v as TestGroupKey)}
                    />
                  ),
                },
                {
                  id: 'td-sort',
                  label: 'Ordering',
                  control: (
                    <SortControl
                      id="td-sort"
                      value={model.state.sort?.key ?? 'queue'}
                      desc={model.state.sort?.desc ?? false}
                      choices={TEST_SORT_CHOICES}
                      onValue={(v) => model.setSort(v === 'queue' ? null : (v as TestSortKey), model.state.sort?.desc)}
                      onDesc={(d) => model.state.sort && model.setSort(model.state.sort.key, d)}
                    />
                  ),
                },
              ]}
            />
            <FilterMenu
              dimensions={model.dimensions}
              isActive={model.isFilterActive}
              onToggle={model.toggleFilter}
              activeCount={model.filterCount}
              icons={FILTER_ICONS}
              label="Filter tests"
            />
            </>
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
          <Table<Row>
            className="m-tests__table"
            /* Fixed, like every table here since 2026-09-02: antd's default
               `auto` treats a column's width as a suggestion and re-measures
               from the CONTENT, so a longer name on page 2 moved every column
               beside it. See SessionsPage for the full note. */
            tableLayout="fixed"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            pagination={false}
            rowSelection={{
              /* Selection is by TEST, so every row of a test that appears in
                 two groups ticks together. */
              selectedRowKeys: rows.filter((r) => r.kind === 'test' && selected.includes(r.tc.key)).map((r) => r.key),
              onChange: (keys) =>
                model.setSelected([
                  ...new Set(
                    (keys as string[]).filter((k) => k.includes('::')).map((k) => k.split('::')[1] as string),
                  ),
                ]),
              columnWidth: 40,
              /* A group header is not selectable: it is a label, and a checkbox
                 on it would promise a "select this group" that does not exist. */
              getCheckboxProps: (r) => ({ style: r.kind === 'group' ? { display: 'none' } : undefined }),
            }}
            rowClassName={(r) => (r.kind === 'group' ? 'is-group-row' : 'm-tests__row')}
            /* The header sorts the WHOLE filtered list, not the page in front of
               you: antd only ever sees twenty rows, so the ordering is done in
               the shared layer and the table is told what it decided. */
            onChange={(_p, _f, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              if (!s?.order) model.setSort(null);
              else model.setSort(s.columnKey as TestSortKey, s.order === 'descend');
            }}
            onRow={(r) => ({
              onClick: (e) => {
                if (r.kind !== 'test') return;
                const el = e.target as HTMLElement;
                if (
                  el.closest('button') ||
                  el.closest('.ant-checkbox-wrapper') ||
                  el.closest('.ant-table-selection-column') ||
                  el.closest('.ant-dropdown')
                )
                  return;
                model.openTest(r.tc);
              },
            })}
          />
          <ListFooter
            page={model.page}
            pageSize={model.pageSize}
            total={model.total}
            noun={['test', 'tests']}
            onPage={model.paginated ? model.setPage : undefined}
          />
        </>
      )}

      {/* The real thing now. It was a stub for four days, which was the honest
          state of it: a drawer that says what is missing beats a drawer that
          pretends the steps are there. */}
      <TestDrawer
        model={model}
        creating={creating}
        onCreated={onCreated}
        onViewRuns={onViewRuns ? (tc) => onViewRuns(tc.title) : undefined}
        onDismiss={(tc) => dialogs.openDismiss(tc)}
        onDelete={(tc) => dialogs.openDelete([tc.key])}
      />
      {dialogs.elements}
    </>
  );
}
