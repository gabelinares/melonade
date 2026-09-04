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
import { StubDrawer } from '../components/StubDrawer.tsx';
import './data-management.css';

export interface PropertiesPageProps {
  model: PropertiesController;
  dataState: DataState;
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
export function PropertiesPage({ model, dataState }: PropertiesPageProps) {
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

      <StubDrawer
        open={model.open != null}
        onClose={model.closeProperty}
        title={model.open?.displayName ?? ''}
        meta={
          model.open && (
            <>
              <span className="m-dmg__mono">{model.open.name}</span>
              <span>{model.open.count.toLocaleString()} {model.open.scope === 'user' ? 'users' : 'in the last 30 days'}</span>
            </>
          )
        }
        note="Editing the display name and description, and hiding a property from search, is the next piece. This round is the catalogue: which properties exist and how much they're used."
      />
    </PageCard>
  );
}
