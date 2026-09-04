import { Button, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { MapPin } from 'lucide-react';
import { personLabel, type Person } from '@shared/people-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { PeopleController } from '../state/usePeople.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { SortIcon } from '../components/SortIcon.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './data-management.css';

export interface PeoplePageProps {
  model: PeopleController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PEOPLE — the roster identified sessions build up.
 *
 * The same `SessionAvatar`/`seedFor` the sessions list already uses, not a
 * lookalike: a person is one robot everywhere their identity appears, which
 * is the whole point of that component and would be lost by drawing a second
 * avatar system here.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function PeoplePage({ model, dataState }: PeoplePageProps) {
  const columns: TableColumnsType<Person> = [
    {
      title: 'Name',
      key: 'name',
      width: '28%',
      sorter: (a, b) => personLabel(a).localeCompare(personLabel(b)),
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, p) => (
        <div className="m-dmg__identity-cell">
          <SessionAvatar seed={p.userId} size={24} />
          <span className="m-truncate">{personLabel(p)}</span>
        </div>
      ),
    },
    {
      title: 'User ID',
      key: 'userId',
      width: '26%',
      render: (_: unknown, p) => <span className="m-truncate m-dmg__mono">{p.userId}</span>,
    },
    {
      title: 'Location',
      key: 'location',
      width: '20%',
      render: (_: unknown, p) => (
        <span className="m-dmg__location-cell">
          <MapPin size={13} aria-hidden="true" />
          <span className="m-truncate">{p.city}, {p.country}</span>
        </span>
      ),
    },
    {
      title: 'Last seen',
      key: 'lastSeenAt',
      width: '13%',
      sorter: (a, b) => b.lastSeenAt - a.lastSeenAt,
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      defaultSortOrder: 'ascend',
      render: (_: unknown, p) => <RelativeTime minutesAgo={minutesSince(p.lastSeenAt)} />,
    },
    {
      title: 'Created',
      key: 'createdAt',
      width: '13%',
      sorter: (a, b) => b.createdAt - a.createdAt,
      sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
      render: (_: unknown, p) => <RelativeTime minutesAgo={minutesSince(p.createdAt)} />,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No people yet"
      hint="People are identified from tracked sessions via the tracker or the OpenReplay SDK."
    />
  );

  const empty = model.query ? (
    <EmptyState
      title="No people match your search"
      hint="Clear the search to see everyone."
      action={<Button onClick={() => model.setQuery('')}>Show everyone</Button>}
    />
  ) : (
    firstRun
  );

  return (
    <PageCard
      title="People"
      subtitle="Everyone the tracker or the SDK has put a name or an id to."
      actions={<SearchField placeholder="Search people" value={model.query} onChange={model.setQuery} />}
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={5} columns={[28, 26, 20, 13, 13]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Person>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="userId"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-dmg__row"
            onRow={(p) => ({ onClick: () => model.openPerson(p.userId) })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['person', 'people']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closePerson}
        title={model.open ? personLabel(model.open) : ''}
        meta={
          model.open && (
            <>
              <span>{model.open.userId}</span>
              <span>{model.open.city}, {model.open.country}</span>
            </>
          )
        }
        note="The person's own timeline — every session, every property, every event they've triggered — is the next piece. This round is the roster: who they are, where they were, when they were last here."
      />
    </PageCard>
  );
}
