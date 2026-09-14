import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { formatVolume, type DistinctEvent, type EventFilter } from '@shared/events-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { EventsController } from '../state/useEvents.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { SortIcon } from '../components/SortIcon.tsx';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { Segmented } from 'antd';
import { OPENREPLAY_PROPERTY_NAMES, propertiesOfEvent } from '@shared/data-management-logic.ts';
import type { Property } from '@shared/properties-data.ts';
import { DataItemPage } from './DataItemPage.tsx';
import './data-management.css';

export interface EventsPageProps {
  model: EventsController;
  dataState: DataState;
  /** A property row on the event page goes to that property's own page. */
  onOpenProperty: (name: string) => void;
  /** "Play sessions": the sessions list, filtered to this event. */
  onPlaySessions: (eventName: string) => void;
}

type PropScope = 'all' | 'openreplay' | 'custom';

/* The tracker's own properties, described once for every event's page. */
const OPENREPLAY_ROWS: readonly { name: string; displayName: string; description: string }[] = [
  { name: 'url', displayName: 'URL', description: 'The page the event fired on.' },
  { name: 'page_title', displayName: 'Page title', description: 'The document title at the time.' },
  { name: 'browser', displayName: 'Browser', description: 'Browser name and version.' },
  { name: 'os', displayName: 'OS', description: 'Operating system and version.' },
  { name: 'device_type', displayName: 'Device type', description: 'Desktop, mobile or tablet.' },
  { name: 'country', displayName: 'Country', description: 'Resolved from the IP.' },
  { name: 'city', displayName: 'City', description: 'Resolved from the IP.' },
  { name: 'session_id', displayName: 'Session ID', description: 'The recording this event belongs to.' },
  { name: 'sdk_version', displayName: 'SDK version', description: 'The tracker that sent it.' },
];

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
export function EventsPage({ model, dataState, onOpenProperty, onPlaySessions }: EventsPageProps) {
  if (model.open) {
    return <EventPage event={model.open} model={model} onOpenProperty={onOpenProperty} onPlaySessions={onPlaySessions} />;
  }
  const columns: TableColumnsType<DistinctEvent> = [
    {
      title: 'Event name',
      key: 'name',
      width: '22%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, e) => <span className="m-truncate m-dmg__mono">{e.name}</span>,
    },
    {
      title: 'Display name',
      key: 'displayName',
      width: '20%',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
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
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
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

    </PageCard>
  );
}

/**
 * ONE EVENT'S PAGE - production's `DistinctEvent`, which renders the shared
 * `DataItemPage` in place of the list. Display name and description are
 * editable in place, the volume is read, the Status switch hides the event
 * from search and analytics, and the card underneath lists the properties it
 * carries: the tracker's, yours, or both.
 */
function EventPage({
  event,
  model,
  onOpenProperty,
  onPlaySessions,
}: {
  event: DistinctEvent;
  model: EventsController;
  onOpenProperty: (name: string) => void;
  onPlaySessions: (eventName: string) => void;
}) {
  const [scope, setScope] = useState<PropScope>('all');
  const custom = propertiesOfEvent(event.name);
  type Row = { key: string; name: string; displayName: string; description: string; catalogue: Property | null };
  const rows: Row[] = [
    ...(scope === 'custom'
      ? []
      : OPENREPLAY_ROWS.map((r) => ({ key: `or:${r.name}`, ...r, catalogue: null }))),
    ...(scope === 'openreplay'
      ? []
      : custom.map((p) => ({ key: `c:${p.name}`, name: p.name, displayName: p.displayName, description: p.description, catalogue: p }))),
  ];
  const columns: TableColumnsType<Row> = [
    { title: 'Name', key: 'name', width: '26%', render: (_: unknown, r) => <span className="m-truncate m-dmg__mono">{r.name}</span> },
    { title: 'Display name', key: 'displayName', width: '24%', render: (_: unknown, r) => <span className="m-truncate">{r.displayName}</span> },
    { title: 'Description', key: 'description', width: '50%', render: (_: unknown, r) => <span className="m-truncate">{r.description}</span> },
  ];
  return (
    <DataItemPage
      back={{ label: 'Events', onClick: model.closeEvent }}
      title={event.displayName}
      name={event.name}
      actions={
        <Button size="small" icon={<Play size={13} />} onClick={() => onPlaySessions(event.name)}>
          Play sessions
        </Button>
      }
      rows={[
        { label: 'Display name', value: event.displayName, onSave: (v) => model.updateEvent(event.name, { displayName: v || event.name }) },
        { label: 'Description', value: event.description, multiline: true, placeholder: 'What this event means', onSave: (v) => model.updateEvent(event.name, { description: v }) },
        { label: '30-day volume', value: String(event.volume30d), display: <span className="m-dmg__mono">{event.volume30d.toLocaleString()}</span> },
        { label: 'Kind', value: event.autoCaptured ? 'Autocaptured' : 'Custom', hint: event.autoCaptured ? 'Sent by the tracker on its own' : 'Sent by your code' },
      ]}
      status={{ hidden: event.hidden ?? false, onChange: (hidden) => model.updateEvent(event.name, { hidden }) }}
      footer={{
        head: (
          <>
            <span className="m-ditem__head-title">Event properties</span>
            <div className="m-page__controls">
              <Segmented
                size="small"
                value={scope}
                onChange={(v) => setScope(v as PropScope)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'openreplay', label: `OpenReplay (${OPENREPLAY_PROPERTY_NAMES.length})` },
                  { value: 'custom', label: `Yours (${custom.length})` },
                ]}
              />
            </div>
          </>
        ),
        children:
          rows.length === 0 ? (
            <EmptyState title="No properties of your own on this event" hint="Send properties with the event from your code and they will be listed here." />
          ) : (
            <Table<Row>
              className="m-dmg__table"
              tableLayout="fixed"
              rowKey="key"
              columns={columns}
              dataSource={rows}
              pagination={false}
              rowClassName={(r) => (r.catalogue ? 'm-dmg__row' : '')}
              onRow={(r) => ({ onClick: () => r.catalogue && onOpenProperty(r.name) })}
            />
          ),
      }}
    />
  );
}
