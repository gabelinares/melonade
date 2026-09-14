import { App, Button, Dropdown, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { BookOpen, Lock, MoreHorizontal, Pencil, Plus, Settings2, Trash2, Users } from 'lucide-react';
import { type Dashboard, type DashboardScope } from '@shared/dashboards-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { DashboardsController } from '../state/useDashboards.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { SortIcon } from '../components/SortIcon.tsx';
import { RenameDialog } from '../components/RenameDialog.tsx';
import { DashboardPage } from './DashboardPage.tsx';
import { useState } from 'react';
import type { Card } from '@shared/cards-data.ts';
import './product-analytics.css';

export interface DashboardsPageProps {
  model: DashboardsController;
  dataState: DataState;
  /** The live card library, for the widgets' names and the Add-card picker. */
  cards: readonly Card[];
  /** A widget's Edit, or its chart, goes to the card's own page. */
  onOpenCard: (cardId: number) => void;
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
export function DashboardsPage({ model, dataState, cards, onOpenCard }: DashboardsPageProps) {
  const { message } = App.useApp();
  const [renaming, setRenaming] = useState<Dashboard | null>(null);
  /* A row opens the dashboard in place of the list - production's
     `/dashboard/:id` - the same list → page swap Issues and Sessions make. */
  if (model.open) {
    return <DashboardPage key={model.open.id} dashboard={model.open} model={model} cards={cards} onOpenCard={onOpenCard} />;
  }

  const columns: TableColumnsType<Dashboard> = [
    {
      title: 'Title',
      key: 'name',
      width: '31%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, d) => <span className="m-truncate">{d.name}</span>,
    },
    {
      title: 'Owner',
      key: 'owner',
      width: '20%',
      sorter: (a, b) => a.owner.localeCompare(b.owner),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, d) => <span className="m-truncate">{d.owner}</span>,
    },
    {
      title: 'Last modified',
      key: 'updatedAt',
      width: '20%',
      sorter: (a, b) => b.updatedAt - a.updatedAt,
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      defaultSortOrder: 'ascend',
      render: (_: unknown, d) => <RelativeTime minutesAgo={minutesSince(d.updatedAt)} />,
    },
    {
      title: 'Visibility',
      key: 'visibility',
      width: '19%',
      render: (_: unknown, d) => (
        <Chip kind="tag">
          {d.visibility === 'team' ? <Users size={11} /> : <Lock size={11} />}
          {d.visibility === 'team' ? 'Team' : 'Private'}
        </Chip>
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
              else if (key === 'rename') setRenaming(d);
              else message.info('Open the dashboard to change who sees it.');
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

      <RenameDialog
        open={renaming != null}
        title="Rename dashboard"
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => {
          if (renaming) model.rename(renaming.id, name);
          setRenaming(null);
        }}
      />
    </PageCard>
  );
}
