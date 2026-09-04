import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { Globe, Tag as TagIcon, Zap } from 'lucide-react';
import type { ActivityEvent, ActivityFilterKey } from '@shared/activity-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { ActivityController } from '../state/useActivity.ts';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { DateRange } from '../components/DateRange.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './data-management.css';

export interface ActivityPageProps {
  model: ActivityController;
  dataState: DataState;
}

const FILTER_ICONS: Partial<Record<ActivityFilterKey, typeof TagIcon>> = {
  events: TagIcon,
  environments: Globe,
};

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVITY — the raw log. The heaviest page in Data Management, and the one
 * most subtracted from: production draws draggable, hideable columns and a
 * live "N new events" poll over this table. Neither survives here - a
 * working "hide this column" control over five fixed columns changes nothing
 * anyone would notice, and a poll needs a backend to be honest about. What
 * stays is the two real questions a log answers: WHICH events, and WHEN.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ActivityPage({ model, dataState }: ActivityPageProps) {
  const columns: TableColumnsType<ActivityEvent> = [
    {
      title: 'Event name',
      key: 'eventName',
      width: '24%',
      render: (_: unknown, e) => (
        <span className="m-dmg__identity-cell">
          <Tooltip title={e.autoCaptured ? 'Autocaptured' : 'Custom event'} mouseEnterDelay={0.3}>
            {e.autoCaptured ? (
              <Zap size={13} aria-hidden="true" className="m-dmg__hidden-icon" />
            ) : (
              <TagIcon size={13} aria-hidden="true" className="m-dmg__hidden-icon" />
            )}
          </Tooltip>
          <span className="m-truncate m-dmg__mono">{e.eventName}</span>
        </span>
      ),
    },
    {
      title: 'Time',
      key: 'at',
      width: '16%',
      render: (_: unknown, e) => <RelativeTime minutesAgo={minutesSince(e.at)} />,
    },
    {
      title: 'Distinct ID',
      key: 'distinctId',
      width: '26%',
      render: (_: unknown, e) =>
        e.identified ? (
          <span className="m-truncate m-dmg__mono">{e.distinctId}</span>
        ) : (
          <Tooltip title="This user was not identified yet" mouseEnterDelay={0.3}>
            <span className="m-truncate m-dmg__mono" style={{ color: 'var(--m-content-disabled)' }}>
              {e.distinctId}
            </span>
          </Tooltip>
        ),
    },
    {
      title: 'City',
      key: 'city',
      width: '17%',
      render: (_: unknown, e) => <span className="m-truncate">{e.city}</span>,
    },
    {
      title: 'Environment',
      key: 'environment',
      width: '17%',
      render: (_: unknown, e) => <span className="m-truncate">{e.environment}</span>,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No activity yet"
      hint="Events are captured automatically as your users interact with your app. Once sessions start coming in, they'll appear here."
    />
  );

  const empty =
    model.query || model.filterCount > 0 ? (
      <EmptyState
        title={model.query ? 'No events match your search' : 'No events match these filters'}
        hint="Clear the search or the filters to see the full log."
        action={<Button onClick={model.clearFilters}>Clear filters</Button>}
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Activity"
      subtitle="The raw event log — every event, in order, with who fired it and where."
      actions={<SearchField placeholder="Search activity" value={model.query} onChange={model.setQuery} />}
      toolbar={
        <div className="m-page__controls">
          <DateRange field="Occurred" value={model.range} onChange={model.setRange} />
          <FilterMenu
            dimensions={model.dimensions}
            isActive={model.isFilterActive}
            onToggle={model.toggleFilter}
            activeCount={model.filterCount}
            icons={FILTER_ICONS}
            label="Filter activity"
          />
        </div>
      }
    >
      <ActiveFilters
        chips={model.chips}
        onRemove={model.toggleFilter}
        onClearAll={model.clearFilters}
        resultCount={model.visible.length}
        noun={['event', 'events']}
      />

      {dataState === 'loading' ? (
        <SkeletonRows rows={6} columns={[24, 16, 26, 17, 17]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<ActivityEvent>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            rowClassName="m-dmg__row"
            onRow={(e) => ({ onClick: () => model.openEvent(e.id) })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['event', 'events']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeEvent}
        title={model.open?.eventName ?? ''}
        meta={
          model.open && (
            <>
              <span className="m-dmg__mono">{model.open.distinctId}</span>
              <span>{model.open.city}</span>
              <span>{model.open.environment}</span>
            </>
          )
        }
        note="This event's full payload — every property it carried, and a link into the session it happened in — is the next piece. This round is the log: which events fired, when, and by whom."
      />
    </PageCard>
  );
}
