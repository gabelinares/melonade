import { Table } from 'antd';
import type { TableColumnsType } from 'antd';
import type { Feature } from '@shared/features-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { FeaturesController } from '../state/useFeatures.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './data-management.css';

export interface FeaturesPageProps {
  model: FeaturesController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * FEATURES — production's Tags, under the label already committed in tree.ts.
 *
 * Not a feature-flag catalogue: this watches one DOM element, tagged from a
 * session recording, for adoption - does anyone use this button. See the
 * note at the top of shared/features-data.ts.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FeaturesPage({ model, dataState }: FeaturesPageProps) {
  const columns: TableColumnsType<Feature> = [
    {
      title: 'Name',
      key: 'name',
      width: '26%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, f) => <span className="m-truncate">{f.name}</span>,
    },
    {
      title: 'Location',
      key: 'location',
      width: '22%',
      render: (_: unknown, f) =>
        f.location ? <span className="m-truncate m-dmg__mono">{f.location}</span> : <span className="m-dmg__mono">—</span>,
    },
    {
      title: 'Selector',
      key: 'selector',
      width: '30%',
      render: (_: unknown, f) => <span className="m-truncate m-dmg__mono">{f.selector}</span>,
    },
    {
      title: 'Users',
      key: 'users',
      width: '11%',
      align: 'right',
      sorter: (a, b) => b.users - a.users,
      render: (_: unknown, f) => <span className="m-dmg__mono">{f.users.toLocaleString()}</span>,
    },
    {
      title: 'Interactions',
      key: 'interactions',
      width: '11%',
      align: 'right',
      sorter: (a, b) => b.interactions - a.interactions,
      defaultSortOrder: 'ascend',
      render: (_: unknown, f) => <span className="m-dmg__mono">{f.interactions.toLocaleString()}</span>,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No features yet"
      hint="From Sessions, select a recording and tag your first element to start watching it."
    />
  );

  const empty = model.query ? (
    <EmptyState title="No features match your search" hint="Clear the search to see every tagged element." />
  ) : (
    firstRun
  );

  return (
    <PageCard
      title="Features"
      subtitle="Elements tagged from a session recording, watched for adoption."
      actions={<SearchField placeholder="Search features" value={model.query} onChange={model.setQuery} />}
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[26, 22, 30, 11, 11]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Feature>
            className="m-dmg__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-dmg__row"
            onRow={(f) => ({ onClick: () => model.openFeature(f.id) })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['feature', 'features']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeFeature}
        title={model.open?.name ?? ''}
        meta={model.open && <span className="m-dmg__mono">{model.open.selector}</span>}
        note="Editing the tag's name and selector, and tagging a new element from a recording, is the next piece. This round is the shelf: which elements are watched, and how much they're used."
      />
    </PageCard>
  );
}
