import { Button, Pagination, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { App } from 'antd';
import { CalendarClock, Globe, MonitorSmartphone, RotateCw, Server, Tag as TagIcon } from 'lucide-react';
import type { DataState } from '@shared/issues-logic.ts';
import { formatDuration, regionLabel, resolutionLabel, type RunData } from '@shared/runs-data.ts';
import type { RunFilterKey, RunSortKey, RunTab } from '@shared/runs-logic.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { RunsController } from '../state/useRuns.ts';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { LiveDuration } from '../components/LiveDuration.tsx';
import { MoreCount } from '../components/MoreCount.tsx';
import { PageToolbar } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { RunResultChip } from '../components/RunResultChip.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './runs-panel.css';

const FILTER_ICONS: Partial<Record<RunFilterKey, typeof Server>> = {
  envs: Server,
  tags: TagIcon,
  viewports: MonitorSmartphone,
  regions: Globe,
  period: CalendarClock,
};

const EMPTY_TAB: Record<RunTab, string> = {
  all: 'No runs in this period',
  running: 'Nothing is running right now',
  failed: 'No failures in this period',
  passed: 'No passes in this period',
};

export interface RunsPanelProps {
  model: RunsController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE RUNS TAB: what happened when the agent executed those tests.
 *
 * A log, not a queue, and the difference decides almost everything on this
 * screen. There is nothing here waiting on a person - a run is over, or it is
 * still going and cannot be stopped - so this is the one list in the app that
 * arrives SORTED, newest first, rather than ordered by what needs attention.
 * There is no selection and no bulk anything: you cannot act on eighty finished
 * runs, and the only per-row action is rerunning one that failed.
 *
 * The other consequence is the period. A log without a window on it is an
 * archive, so this list is the last seven days by default - and unlike
 * production, that default arrives as a REMOVABLE CHIP in the filter bar, next
 * to whatever else is applied. A list silently showing a fraction of itself is
 * a list that lies about how much there is.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function RunsPanel({ model, dataState }: RunsPanelProps) {
  const { message } = App.useApp();
  const { state } = model;

  const rerun = (run: RunData) => message.success(`${run.testName} — rerun started`);

  const sortOrder = (key: RunSortKey) =>
    state.sort?.key === key ? (state.sort.desc ? ('descend' as const) : ('ascend' as const)) : null;

  const columns: TableColumnsType<RunData> = [
    {
      title: 'Result',
      key: 'result',
      width: 116,
      sorter: true,
      sortOrder: sortOrder('result'),
      showSorterTooltip: false,
      render: (_: unknown, run) => <RunResultChip status={run.status} />,
    },
    {
      title: 'Test',
      key: 'test',
      sorter: true,
      sortOrder: sortOrder('test'),
      showSorterTooltip: false,
      render: (_: unknown, run) => (
        <div className="m-runs__title-cell">
          <span className="m-runs__title m-truncate">{run.testName}</span>
          {/* Which steps this run actually executed. On a log this is worth
              printing from v1 up on a versioned test: "it passed" means nothing
              without "on which version". */}
          {run.version != null && <Chip>v{run.version}</Chip>}
          {/* The failure, in the row, because scrolling a log for red and then
              opening each one to find out why is the whole cost of not saying
              it here. */}
          {run.error && (
            <span className="m-runs__error m-truncate" title={run.error}>
              {run.error}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      width: 160,
      render: (_: unknown, run) => {
        const tags = run.tags ?? [];
        if (tags.length === 0) return <span className="m-runs__none">—</span>;
        return (
          <div className="m-runs__chips">
            <Chip>{tags[0]}</Chip>
            <MoreCount hidden={tags.slice(1)} />
          </div>
        );
      },
    },
    {
      title: 'Environment',
      key: 'env',
      width: 140,
      sorter: true,
      sortOrder: sortOrder('env'),
      showSorterTooltip: false,
      /* The environment on the row, the viewport and region on the hover and in
         the run's own panel. They were a second line here for an hour and the
         cost was 12px on every row of an eighty-row log - a log is read by
         scanning down it, and twelve pixels a row is four fewer rows on screen.
         They are filters, which is how you ask that question of a log anyway. */
      render: (_: unknown, run) => (
        <Tooltip
          title={`${resolutionLabel(run.resolution)} · ${regionLabel(run.region)}`}
          mouseEnterDelay={0.2}
        >
          <span className="m-runs__where m-truncate">{run.envName ?? '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      sorter: true,
      sortOrder: sortOrder('duration'),
      showSorterTooltip: false,
      render: (_: unknown, run) =>
        run.status === 'running' ? (
          <LiveDuration startedAt={run.date} />
        ) : (
          <span className="m-runs__dur">{run.duration ? formatDuration(run.duration) : '—'}</span>
        ),
    },
    {
      title: 'When',
      key: 'when',
      width: 104,
      sorter: true,
      sortOrder: sortOrder('when'),
      showSorterTooltip: false,
      render: (_: unknown, run) => <RelativeTime minutesAgo={minutesSince(run.date)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      align: 'right',
      /* Rerun on FAILED runs only. Rerunning a pass has no purpose, and a
         running run offers nothing at all: it cannot be stopped, and pausing
         belongs to the test. An icon on every row would be noise on seventy of
         them. */
      render: (_: unknown, run) =>
        run.status !== 'failed' ? null : (
          <Tooltip title="Run it again">
            <Button
              type="text"
              size="small"
              aria-label={`Rerun ${run.testName}`}
              icon={<RotateCw size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                rerun(run);
              }}
            />
          </Tooltip>
        ),
    },
  ];

  const rangeStart = model.total === 0 ? 0 : (model.page - 1) * model.pageSize + 1;
  const rangeEnd = (model.page - 1) * model.pageSize + model.rows.length;

  const empty = model.filtered ? (
    <EmptyState
      title="No runs match these filters"
      hint="The period counts as a filter here — clear them to see the whole log."
      action={<Button onClick={model.clearFilters}>Clear filters</Button>}
    />
  ) : (
    <EmptyState
      title={EMPTY_TAB[state.tab]}
      hint="Runs appear here as scheduled tests execute, and stay for as long as you keep them."
    />
  );

  return (
    <>
      <PageToolbar>
        <FilterStrip
          label="Filter by result"
          items={model.counts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[state.tab]}
          onSelect={(key) => model.setTab(key as RunTab)}
        />
        <div className="m-runs__controls">
          <FilterMenu
            dimensions={model.dimensions}
            isActive={model.isFilterActive}
            onToggle={model.toggleFilter}
            activeCount={model.filterCount}
            icons={FILTER_ICONS}
            label="Filter runs"
          />
        </div>
      </PageToolbar>

      <ActiveFilters
        chips={model.chips}
        onRemove={model.toggleFilter}
        onClearAll={model.clearFilters}
        resultCount={model.total}
        noun={['run', 'runs']}
      />

      {dataState === 'loading' ? (
        <SkeletonRows rows={7} columns={[12, 40, 14, 16, 8, 8]} />
      ) : dataState === 'empty' ? (
        <EmptyState
          title="Nothing has run yet"
          hint="Approve a test and give it a schedule, and its runs land here — one row per environment, viewport and region it runs against."
        />
      ) : model.rows.length === 0 ? (
        empty
      ) : (
        <>
          <Table<RunData>
            className="m-runs__table"
            rowKey="key"
            columns={columns}
            dataSource={model.rows}
            pagination={false}
            rowClassName="m-runs__row"
            onChange={(_p, _f, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              if (!s?.order) model.setSort(null);
              else model.setSort(s.columnKey as RunSortKey, s.order === 'descend');
            }}
            onRow={(run) => ({
              onClick: (e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                model.openRun(run);
              },
            })}
          />
          <footer className="m-runs__foot">
            <span className="m-runs__range">
              {model.paginated
                ? `${rangeStart}–${rangeEnd} of ${model.total} runs`
                : `${model.total} ${model.total === 1 ? 'run' : 'runs'}`}
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
        onClose={model.closeRun}
        title={model.open?.testName ?? ''}
        meta={
          model.open && (
            <>
              <RunResultChip status={model.open.status} />
              <span>{model.open.stepCount} steps</span>
              <span>
                {model.open.envName} · {resolutionLabel(model.open.resolution)} ·{' '}
                {regionLabel(model.open.region)}
              </span>
              {model.open.duration != null && <span>{formatDuration(model.open.duration)}</span>}
            </>
          )
        }
        note="The run panel — every step with its screenshots, the console, and the network capture as a HAR viewer — is the next piece. This round is the log: the result tabs, the period, the filters and the rerun."
      />
    </>
  );
}
