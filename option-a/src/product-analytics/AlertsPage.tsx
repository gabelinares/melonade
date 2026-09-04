import { App, Button, Dropdown, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { Bell, BookOpen, MoreHorizontal, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { ruleSentence, type Alert } from '@shared/alerts-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { AlertsController } from '../state/useAlerts.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './product-analytics.css';

export interface AlertsPageProps {
  model: AlertsController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ALERTS — the only Product Analytics page production draws as a hand-rolled
 * grid instead of a table.
 *
 * Ported here as a real `Table` instead, to match its two siblings: Title,
 * Type and Modified already map onto columns cleanly, and three pages sitting
 * side by side in one nav group should share one table grammar. The row's
 * rule - what it watches, at what threshold, over what window - is the one
 * thing a column cannot hold without turning into five more of them, so it
 * survives as the second line under the name, the same way an audit's scope
 * lives under ITS name.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AlertsPage({ model, dataState }: AlertsPageProps) {
  const { message } = App.useApp();

  const columns: TableColumnsType<Alert> = [
    {
      title: 'Title',
      key: 'name',
      width: '52%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, a) => (
        <div className="m-pa__name-cell">
          <span className="m-truncate">{a.name}</span>
          <span className="m-pa__rule m-truncate" title={ruleSentence(a)}>
            {ruleSentence(a)}
          </span>
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'detectionMethod',
      width: '18%',
      render: (_: unknown, a) => (
        <Chip kind="tag">{a.detectionMethod === 'threshold' ? 'Threshold' : 'Change'}</Chip>
      ),
    },
    {
      title: 'Modified',
      key: 'updatedAt',
      width: '20%',
      sorter: (a, b) => b.updatedAt - a.updatedAt,
      defaultSortOrder: 'ascend',
      render: (_: unknown, a) => <RelativeTime minutesAgo={minutesSince(a.updatedAt)} />,
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'right',
      render: (_: unknown, a) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
              { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === 'delete') model.remove(a.id);
              else message.info('Renaming is the next piece.');
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`Actions for ${a.name}`}
            icon={<MoreHorizontal size={15} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const firstRun = (
    <EmptyState
      title="No alerts have been configured yet"
      hint="Configure alerts to stay informed about app activity with threshold or change-based notifications."
      action={
        <Button icon={<Plus size={14} />} onClick={() => message.info('The alert builder is the next piece.')}>
          Create alert
        </Button>
      }
    />
  );

  const empty = model.query ? (
    <EmptyState
      title="No alerts match your search"
      hint="Clear the search to see every alert."
      action={<Button onClick={() => model.setQuery('')}>Show all alerts</Button>}
    />
  ) : (
    firstRun
  );

  return (
    <PageCard
      title="Alerts"
      subtitle="Watches one metric and fires when it crosses a line."
      actions={
        <>
          <SearchField placeholder="Search alerts" value={model.query} onChange={model.setQuery} />
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => message.info('The alert builder is the next piece.')}
          >
            Create alert
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Alert settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[52, 18, 20, 10]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Alert>
            className="m-pa__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-pa__row"
            onRow={(a) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                model.openAlert(a.id);
              },
            })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['alert', 'alerts']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeAlert}
        title={model.open?.name ?? ''}
        meta={
          model.open && (
            <>
              <Bell size={13} aria-hidden="true" />
              <span>{ruleSentence(model.open)}</span>
            </>
          )
        }
        note="The alert builder itself — picking the metric, the threshold, who gets notified — is the next piece. This round is the shelf: which alerts exist and what each one watches."
      />
    </PageCard>
  );
}
