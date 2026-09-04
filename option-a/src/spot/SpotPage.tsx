import type { CSSProperties } from 'react';
import { App, Button, Checkbox, Dropdown } from 'antd';
import { Copy, Download, MoreHorizontal, Pencil, Play, Trash2 } from 'lucide-react';
import { clipDuration, type Spot, type SpotScope } from '@shared/spot-data.ts';
import { hueIndexFor } from '@shared/avatar.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { SpotController } from '../state/useSpot.ts';
import { CardGrid } from '../components/CardGrid.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './spot-page.css';

export interface SpotPageProps {
  model: SpotController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SPOT — a card grid, the one deliberate exception in this port.
 *
 * The thumbnail is what a Spot IS to scan; a text row would answer "what's
 * this clip called" and lose "is this the one I'm looking for". Production
 * draws it as a card grid for the same reason. The colour behind the play
 * glyph reuses `hueIndexFor` - the same seeded-twelve-hues idiom the session
 * avatar uses - because a stub thumbnail is still worth being ONE consistent
 * colour for the same title rather than a random one on every render.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SpotPage({ model, dataState }: SpotPageProps) {
  const { message } = App.useApp();

  const firstRun = (
    <EmptyState
      title="No Spots yet"
      hint="Record your screen, share a link — Spot is a short video clip, captured in seconds."
    />
  );

  const empty =
    model.query || model.scope !== 'all' ? (
      <EmptyState
        title={model.query ? 'No Spots match your search' : 'No Spots here yet'}
        hint="Clear the search, or switch back to all Spots."
        action={
          <Button
            onClick={() => {
              model.setQuery('');
              model.setScope('all');
            }}
          >
            Show all Spots
          </Button>
        }
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Spot"
      subtitle="Short screen recordings, captured and shared like a clip."
      actions={
        <>
          {model.selected.length > 0 && (
            <>
              <Button size="small" onClick={model.clearSelection}>
                Clear
              </Button>
              <Button size="small" danger onClick={model.deleteSelected}>
                Delete ({model.selected.length})
              </Button>
            </>
          )}
          <SearchField placeholder="Search Spots" value={model.query} onChange={model.setQuery} />
        </>
      }
      toolbar={
        <FilterStrip
          label="Filter by owner"
          items={model.scopeCounts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[model.scope]}
          onSelect={(key) => model.setScope(key as SpotScope)}
        />
      }
    >
      {dataState === 'loading' ? (
        <CardGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="m-spot-card m-spot-card--skeleton" />
          ))}
        </CardGrid>
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <CardGrid>
          {model.visible.map((s) => (
            <SpotCard
              key={s.id}
              spot={s}
              selected={model.selected.includes(s.id)}
              onToggleSelect={() => model.toggleSelected(s.id)}
              onOpen={() => model.openSpot(s.id)}
              onRename={() => message.info('Renaming is the next piece.')}
              onDelete={() => model.remove(s.id)}
            />
          ))}
        </CardGrid>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeSpot}
        title={model.open?.title ?? ''}
        meta={
          model.open && (
            <>
              <span>{model.open.ownerName}</span>
              <span>{clipDuration(model.open.durationSec)}</span>
            </>
          )
        }
        note="Playing the clip back — the recorder, the player, the share link — is the next piece. This round is the library: which Spots exist, who made them, how long each one runs."
      />
    </PageCard>
  );
}

function SpotCard({
  spot,
  selected,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
}: {
  spot: Spot;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`m-spot-card${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="m-spot-card__thumb"
        style={{ '--m-avatar-i': hueIndexFor(spot.title) } as CSSProperties}
        onClick={onOpen}
        aria-label={`Open ${spot.title}`}
      >
        <Play size={28} aria-hidden="true" className="m-spot-card__play" />
        <span className="m-spot-card__duration">{clipDuration(spot.durationSec)}</span>
      </button>
      <div className="m-spot-card__foot">
        <Checkbox checked={selected} onChange={onToggleSelect} className="m-spot-card__check" />
        <div className="m-spot-card__meta">
          <button type="button" className="m-spot-card__title m-truncate" onClick={onOpen}>
            {spot.title}
          </button>
          <span className="m-spot-card__by">
            {spot.ownerName} <span aria-hidden="true">·</span> <RelativeTime minutesAgo={minutesSince(spot.createdAt)} />
          </span>
        </div>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
              { key: 'copy', icon: <Copy size={13} />, label: 'Copy link' },
              { key: 'download', icon: <Download size={13} />, label: 'Download video' },
              { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === 'delete') onDelete();
              else if (key === 'rename') onRename();
            },
          }}
        >
          <Button
            type="text"
            size="small"
            aria-label={`Actions for ${spot.title}`}
            icon={<MoreHorizontal size={15} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    </div>
  );
}
