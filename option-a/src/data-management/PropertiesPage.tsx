import { Button, Switch, Table, Tabs, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { EyeOff } from 'lucide-react';
import { type Property, type PropertyScope } from '@shared/properties-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { PropertiesController } from '../state/useProperties.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { SortIcon } from '../components/SortIcon.tsx';
import { MapPin } from 'lucide-react';
import { personLabel, type Person } from '@shared/people-data.ts';
import type { DistinctEvent } from '@shared/events-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import { eventsWithProperty, propertyTypeOf, usersWithProperty } from '@shared/data-management-logic.ts';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { DataItemPage } from './DataItemPage.tsx';
import './data-management.css';

export interface PropertiesPageProps {
  model: PropertiesController;
  dataState: DataState;
  /** The card under a user property lists the people who carry it; a row
   *  opens the person. The card under an event property lists the events
   *  that send it; a row opens the event. Both live on other pages. */
  onOpenPerson: (userId: string) => void;
  onOpenEvent: (name: string) => void;
}

const SCOPE_TABS: { key: PropertyScope; label: string }[] = [
  { key: 'user', label: 'User properties' },
  { key: 'event', label: 'Event properties' },
];

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROPERTIES — two catalogues sharing one table.
 *
 * The User/Event split lives one level BELOW the Subitem, the one legitimate
 * place in this port for an in-page tab strip (§30's rule is about menu
 * Subitems, not about every page) - same shape as `TestsPage`'s own section
 * tabs: one title, the subtitle and the body change under it.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function PropertiesPage({ model, dataState, onOpenPerson, onOpenEvent }: PropertiesPageProps) {
  if (model.open) {
    return <PropertyPage property={model.open} model={model} onOpenPerson={onOpenPerson} onOpenEvent={onOpenEvent} />;
  }
  const volumeLabel = model.scope === 'user' ? '# Users' : '30-day volume';

  const columns: TableColumnsType<Property> = [
    {
      title: model.scope === 'user' ? 'Property' : 'Name',
      key: 'name',
      width: '24%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, p) => (
        <span className="m-dmg__identity-cell">
          <span className="m-truncate m-dmg__mono">{p.name}</span>
          {p.hidden && (
            <Tooltip title="This property is hidden from search and analytics" mouseEnterDelay={0.3}>
              <EyeOff size={13} aria-hidden="true" className="m-dmg__hidden-icon" />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Display name',
      key: 'displayName',
      width: '20%',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, p) => <span className="m-truncate">{p.displayName}</span>,
    },
    {
      title: 'Description',
      key: 'description',
      width: '40%',
      render: (_: unknown, p) => (
        <Tooltip title={p.description} mouseEnterDelay={0.4}>
          <span className="m-truncate">{p.description}</span>
        </Tooltip>
      ),
    },
    {
      title: volumeLabel,
      key: 'count',
      width: '16%',
      align: 'right',
      sorter: (a, b) => b.count - a.count,
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      defaultSortOrder: 'ascend',
      render: (_: unknown, p) => <span className="m-dmg__mono">{p.count.toLocaleString()}</span>,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No properties yet"
      hint={
        model.scope === 'user'
          ? 'User properties are captured from tracked sessions via the OpenReplay SDK.'
          : 'Properties are captured automatically from your events.'
      }
    />
  );

  const empty = model.query ? (
    <EmptyState
      title="No properties match your search"
      hint="Clear the search to see the full catalogue."
      action={<Button onClick={() => model.setQuery('')}>Show all properties</Button>}
    />
  ) : (
    firstRun
  );

  return (
    <PageCard
      title="Properties"
      subtitle="Fields captured on a user or an event — a plan, a role, an order total."
      tabs={
        <Tabs
          activeKey={model.scope}
          onChange={(key) => model.setScope(key as PropertyScope)}
          items={SCOPE_TABS.map((t) => ({ key: t.key, label: t.label }))}
        />
      }
      actions={
        <>
          <Switch
            checked={model.showHidden}
            onChange={model.setShowHidden}
            checkedChildren="All"
            unCheckedChildren="Visible"
            aria-label="Show hidden properties"
          />
          <SearchField
            placeholder={model.scope === 'user' ? 'Search user properties' : 'Search event properties'}
            value={model.query}
            onChange={model.setQuery}
          />
        </>
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={5} columns={[24, 20, 40, 16]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Property>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-dmg__row"
            onRow={(p) => ({ onClick: () => model.openProperty(p.id) })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['property', 'properties']} />
        </>
      )}

    </PageCard>
  );
}

/**
 * ONE PROPERTY'S PAGE - production's `UserProperty` / `EventPropsPage`, both
 * the shared `DataItemPage`. Same rows as an event's page plus the type, and
 * a card underneath that answers the property's own question: for a user
 * property, WHO has it; for an event property, WHICH events send it.
 */
function PropertyPage({
  property: p,
  model,
  onOpenPerson,
  onOpenEvent,
}: {
  property: Property;
  model: PropertiesController;
  onOpenPerson: (userId: string) => void;
  onOpenEvent: (name: string) => void;
}) {
  const isUser = p.scope === 'user';
  const people = isUser ? usersWithProperty(p) : [];
  const events = isUser ? [] : eventsWithProperty(p.name);

  const peopleColumns: TableColumnsType<Person> = [
    {
      title: 'Name', key: 'name', width: '32%',
      render: (_: unknown, u) => (
        <div className="m-dmg__identity-cell">
          <SessionAvatar seed={u.userId} size={24} />
          <span className="m-truncate">{personLabel(u)}</span>
        </div>
      ),
    },
    { title: 'User ID', key: 'userId', width: '30%', render: (_: unknown, u) => <span className="m-truncate m-dmg__mono">{u.userId}</span> },
    {
      title: 'Location', key: 'location', width: '22%',
      render: (_: unknown, u) => (
        <span className="m-dmg__location-cell">
          <MapPin size={13} aria-hidden="true" />
          <span className="m-truncate">{u.city}, {u.country}</span>
        </span>
      ),
    },
    { title: 'Last seen', key: 'lastSeenAt', width: '16%', render: (_: unknown, u) => <RelativeTime minutesAgo={minutesSince(u.lastSeenAt)} /> },
  ];
  const eventColumns: TableColumnsType<DistinctEvent> = [
    { title: 'Event name', key: 'name', width: '26%', render: (_: unknown, e) => <span className="m-truncate m-dmg__mono">{e.name}</span> },
    { title: 'Display name', key: 'displayName', width: '24%', render: (_: unknown, e) => <span className="m-truncate">{e.displayName}</span> },
    { title: 'Description', key: 'description', width: '50%', render: (_: unknown, e) => <span className="m-truncate">{e.description}</span> },
  ];

  return (
    <DataItemPage
      back={{ label: isUser ? 'User properties' : 'Event properties', onClick: model.closeProperty }}
      title={p.displayName}
      name={p.name}
      rows={[
        { label: 'Display name', value: p.displayName, onSave: (v) => model.updateProperty(p.id, { displayName: v || p.name }) },
        { label: 'Description', value: p.description, multiline: true, placeholder: 'What this property holds', onSave: (v) => model.updateProperty(p.id, { description: v }) },
        {
          label: isUser ? 'Users with this property' : 'Events with this property',
          value: String(p.count),
          display: <span className="m-dmg__mono">{p.count.toLocaleString()}</span>,
          hint: isUser ? undefined : 'in the last 30 days',
        },
        { label: 'Type', value: propertyTypeOf(p), display: <span className="m-dmg__mono">{propertyTypeOf(p)}</span> },
      ]}
      status={{ hidden: p.hidden, onChange: (hidden) => model.updateProperty(p.id, { hidden }) }}
      footer={{
        head: (
          <span className="m-ditem__head-title">
            {isUser ? `Users with this property` : `Events with this property`}
            <span className="m-dmg__count"> · {isUser ? people.length : events.length}</span>
          </span>
        ),
        children: isUser ? (
          people.length === 0 ? (
            <EmptyState title="Nobody carries this property yet" />
          ) : (
            <Table<Person>
              className="m-dmg__table"
              tableLayout="fixed"
              rowKey="userId"
              columns={peopleColumns}
              dataSource={people}
              pagination={false}
              rowClassName="m-dmg__row"
              onRow={(u) => ({ onClick: () => onOpenPerson(u.userId) })}
            />
          )
        ) : events.length === 0 ? (
          <EmptyState title="No event sends this property" hint="Attach it to an event from your code and the event will be listed here." />
        ) : (
          <Table<DistinctEvent>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="name"
            columns={eventColumns}
            dataSource={events}
            pagination={false}
            rowClassName="m-dmg__row"
            onRow={(e) => ({ onClick: () => onOpenEvent(e.name) })}
          />
        ),
      }}
    />
  );
}
