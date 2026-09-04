import { App, Avatar, Button, Dropdown, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Activity,
  BookOpen,
  Filter,
  Flame,
  GitBranch,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Table2,
  Trash2,
} from 'lucide-react';
import { CARD_TYPE_LABELS, type Card, type CardType, type CardTypeFilter } from '@shared/cards-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { CardsController } from '../state/useCards.ts';
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

export interface CardsPageProps {
  model: CardsController;
  dataState: DataState;
}

/** One glyph per card type, so the name cell reads as a KIND of thing rather
 *  than a string - the same reason a filter dimension gets a glyph in
 *  FilterMenu. */
const TYPE_ICONS: Record<CardType, typeof Activity> = {
  timeseries: Activity,
  table: Table2,
  funnel: Filter,
  heatmap: Flame,
  pathAnalysis: GitBranch,
};

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CARDS — the library a dashboard's own "Add card" picks from.
 *
 * A card is one metric, and the one thing worth asking of a shelf of them is
 * what KIND each one is - production's own type filter, kept here as a
 * FilterStrip over the type union rather than a full FilterMenu, since it is
 * the only real dimension the entity has.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function CardsPage({ model, dataState }: CardsPageProps) {
  const { message } = App.useApp();

  const columns: TableColumnsType<Card> = [
    {
      title: 'Title',
      key: 'name',
      width: '36%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, c) => {
        const Icon = TYPE_ICONS[c.type];
        return (
          <div className="m-pa__type-cell">
            <Tooltip title={CARD_TYPE_LABELS[c.type]} mouseEnterDelay={0.3}>
              <Avatar size={24} icon={<Icon size={13} />} className="m-pa__type-avatar" />
            </Tooltip>
            <span className="m-truncate">{c.name}</span>
          </div>
        );
      },
    },
    {
      title: 'Owner',
      key: 'owner',
      width: '27%',
      sorter: (a, b) => a.owner.localeCompare(b.owner),
      render: (_: unknown, c) => <span className="m-truncate">{c.owner}</span>,
    },
    {
      title: 'Last modified',
      key: 'updatedAt',
      width: '22%',
      sorter: (a, b) => b.updatedAt - a.updatedAt,
      defaultSortOrder: 'ascend',
      render: (_: unknown, c) => <RelativeTime minutesAgo={minutesSince(c.updatedAt)} />,
    },
    {
      title: '',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (_: unknown, c) => (
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
              if (key === 'delete') model.remove(c.id);
              else message.info('Renaming is the next piece.');
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`Actions for ${c.name}`}
            icon={<MoreHorizontal size={15} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const firstRun = (
    <EmptyState
      title="No cards yet"
      hint="A card is one metric — a timeseries, a funnel, a table — that a dashboard can be built from."
      action={
        <Button icon={<Plus size={14} />} onClick={() => message.info('The card builder is the next piece.')}>
          Create card
        </Button>
      }
    />
  );

  const empty =
    model.query || model.type !== 'all' ? (
      <EmptyState
        title={model.query ? 'No cards match your search' : 'No cards of this type'}
        hint="Clear the search, or pick another type."
        action={
          <Button
            onClick={() => {
              model.setQuery('');
              model.setType('all');
            }}
          >
            Show all cards
          </Button>
        }
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Cards"
      subtitle="One metric each — the library any dashboard is built from."
      actions={
        <>
          <SearchField placeholder="Search cards" value={model.query} onChange={model.setQuery} />
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => message.info('The card builder is the next piece.')}
          >
            Create card
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Card settings' },
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
          label="Filter by type"
          items={model.typeCounts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[model.type]}
          onSelect={(key) => model.setType(key as CardTypeFilter)}
        />
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[36, 27, 22, 15]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Card>
            className="m-pa__table"
            tableLayout="fixed"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            showSorterTooltip={false}
            rowClassName="m-pa__row"
            onRow={(c) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                model.openCard(c.id);
              },
            })}
          />
          <ListFooter page={1} pageSize={model.visible.length} total={model.visible.length} noun={['card', 'cards']} />
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeCard}
        title={model.open?.name ?? ''}
        meta={model.open && <span>{CARD_TYPE_LABELS[model.open.type]}</span>}
        note="The card builder itself — picking the metric, shaping the query, choosing the visualisation — is the next piece. This round is the shelf: which cards exist, what kind each one is, when it last changed."
      />
    </PageCard>
  );
}
