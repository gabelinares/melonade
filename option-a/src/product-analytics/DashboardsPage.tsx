import { App, Button, Dropdown, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { BookOpen, Lock, MoreHorizontal, Pencil, Plus, Settings2, Trash2, Users } from 'lucide-react';
import { type Dashboard, type DashboardScope } from '@shared/dashboards-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { DashboardsController } from '../state/useDashboards.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './product-analytics.css';

export interface DashboardsPageProps {
  model: DashboardsController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * DASHBOARDS — a shelf, not a canvas.
 *
 * A dashboard is a saved arrangement of cards. The canvas that builds one -
 * dragging cards onto a layout - is not this round; this page answers the
 * question every shelf answers: which ones exist, who owns them, when was
 * each one last touched. Production's own toggle for "mine vs. everyone's" is
 * a Switch buried in a column header; here it is the page's one real
 * dimension, so it becomes the toolbar's FilterStrip instead - the same
 * "toggle as a strip item" idiom Audits already uses for status.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function DashboardsPage({ model, dataState }: DashboardsPageProps) {
  const { message } = App.useApp();

  const columns: TableColumnsType<Dashboard> = [
    {
      title: 'Title',
      key: 'name',
      width: '31%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, d) => <span className="m-truncate">{d.name}</span>,
    },
    {
      title: 'Owner',
      key: 'owner',
      width: '20%',
      sorter: (a, b) => a.owner.localeCompare(b.owner),
      render: (_: unknown, d) => <span className="m-truncate">{d.owner}</span>,
    },
    {
      title: 'Last modified',
      key: 'updatedAt',
      width: '20%',
      sorter: (a, b) => b.updatedAt - a.updatedAt,
      defaultSortOrder: 'ascend',
      render: (_: unknown, d) => <RelativeTime minutesAgo={minutesSince(d.updatedAt)} />,
    },
    {
      title: 'Visibility',
      key: 'visibility',
      width: '19%',
      render: (_: unknown, d) => (
        <Tag icon={d.visibility === 'team' ? <Users size={12} /> : <Lock size={12} />} bordered={false}>
          {d.visibility === 'team' ? 'Team' : 'Private'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'right',
      render: (_: unknown, d) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
              { key: 'access', icon: <Users size={13} />, label: 'Visibility & access' },
              { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === 'delete') model.remove(d.id);
              else message.info(`${key === 'rename' ? 'Renaming' : 'Visibility & access'} is the next piece.`);
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`Actions for ${d.name}`}
            icon={<MoreHorizontal size={15} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const firstRun = (
    <EmptyState
      title="No dashboards yet"
      hint="Build dashboards to track key metrics and monitor performance in one place."
      action={
        <Button icon={<Plus size={14} />} onClick={() => message.info('The dashboard canvas is the next piece.')}>
          Create dashboard
        </Button>
      }
    />
  );

  const empty =
    model.query || model.scope !== 'all' ? (
      <EmptyState
        title={model.query ? 'No dashboards match your search' : 'No dashboards here yet'}
        hint="Clear the search, or switch back to all dashboards."
        action={
          <Button
            onClick={() => {
              model.setQuery('');
              model.setScope('all');
            }}
          >
            Show all dashboards
          </Button>
        }
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Dashboards"
      subtitle="Saved arrangements of cards, tracking a set of metrics together."
      actions={
        <>
          <SearchField placeholder="Search dashboards" value={model.query} onChange={model.setQuery} />
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => message.info('The dashboard canvas is the next piece.')}
          >
            Create dashboard
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Dashboard settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
      toolbar={
        <FilterStrip
          label="Filter by owner"
          items={model.scopeCounts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[model.scope]}
          onSelect={(key) => model.setScope(key as DashboardScope)}
        />
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[31, 20, 20, 19, 10]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Dashboard>
            className="m-pa__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-pa__row"
            onRow={(d) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                model.openDashboard(d.id);
              },
            })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['dashboard', 'dashboards']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeDashboard}
        title={model.open?.name ?? ''}
        meta={
          model.open && (
            <>
              <span>{model.open.owner}</span>
              <span>{model.open.visibility === 'team' ? 'Team' : 'Private'}</span>
            </>
          )
        }
        note="The dashboard canvas itself — the charts, the layout, adding and resizing cards — is the next piece. This round is the shelf: which dashboards exist, who owns them, when each was touched."
      />
    </PageCard>
  );
}
