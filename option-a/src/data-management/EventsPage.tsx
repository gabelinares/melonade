import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { formatVolume, type DistinctEvent, type EventFilter } from '@shared/events-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { EventsController } from '../state/useEvents.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './data-management.css';

export interface EventsPageProps {
  model: EventsController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EVENTS — the catalogue of distinct event names the tracker has seen.
 *
 * Autocaptured vs. custom is the one real split production draws (a
 * dropdown there, a FilterStrip here, same idiom as every other page's
 * status toggle) - everything else on the row is a fact the name already
 * carries: what it's called, what it means, how often it fires.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function EventsPage({ model, dataState }: EventsPageProps) {
  const columns: TableColumnsType<DistinctEvent> = [
    {
      title: 'Event name',
      key: 'name',
      width: '22%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, e) => <span className="m-truncate m-dmg__mono">{e.name}</span>,
    },
    {
      title: 'Display name',
      key: 'displayName',
      width: '20%',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      render: (_: unknown, e) => <span className="m-truncate">{e.displayName}</span>,
    },
    {
      title: 'Description',
      key: 'description',
      width: '40%',
      render: (_: unknown, e) => (
        <Tooltip title={e.description} mouseEnterDelay={0.4}>
          <span className="m-truncate">{e.description}</span>
        </Tooltip>
      ),
    },
    {
      title: '30-day volume',
      key: 'volume30d',
      width: '18%',
      align: 'right',
      sorter: (a, b) => b.volume30d - a.volume30d,
      defaultSortOrder: 'ascend',
      render: (_: unknown, e) => <span className="m-dmg__mono">{formatVolume(e.volume30d)}</span>,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No events yet"
      hint="Events are captured automatically as your users interact with your app. Once sessions start coming in, they'll appear here."
    />
  );

  const empty =
    model.query || model.filter !== 'all' ? (
      <EmptyState
        title={model.query ? 'No events match your search' : 'No events of this kind'}
        hint="Clear the search, or pick another filter."
        action={
          <Button
            onClick={() => {
              model.setQuery('');
              model.setFilter('all');
            }}
          >
            Show all events
          </Button>
        }
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Events"
      subtitle="The distinct event names the tracker has seen — autocaptured and custom."
      actions={<SearchField placeholder="Search events" value={model.query} onChange={model.setQuery} />}
      toolbar={
        <FilterStrip
          label="Filter by kind"
          items={model.filterCounts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[model.filter]}
          onSelect={(key) => model.setFilter(key as EventFilter)}
        />
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={5} columns={[22, 20, 40, 18]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<DistinctEvent>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="name"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-dmg__row"
            onRow={(e) => ({ onClick: () => model.openEvent(e.name) })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['event', 'events']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeEvent}
        title={model.open?.displayName ?? ''}
        meta={
          model.open && (
            <>
              <span className="m-dmg__mono">{model.open.name}</span>
              <span>{formatVolume(model.open.volume30d)} in the last 30 days</span>
            </>
          )
        }
        note="This event's own detail — its properties, its trend over time, the sessions it fires in — is the next piece. This round is the catalogue: which events exist, what each one means, how often it fires."
      />
    </PageCard>
  );
}
