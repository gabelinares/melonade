import { useState } from 'react';
import { App, Button, Dropdown, Table, Tabs } from 'antd';
import type { TableColumnsType } from 'antd';
import { MoreHorizontal, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import { recordingMetaOf } from '@shared/media-logic.ts';
import { LIVE_SORTABLE, liveCatalogue } from '@shared/cobrowse-logic.ts';
import type { CobrowseSection, Recording } from '@shared/cobrowse-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import { entryOf, formatDuration } from '@shared/sessions-logic.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { CobrowseController } from '../state/useCobrowse.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { sortable } from '../components/SortIcon.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { RenameDialog } from '../components/RenameDialog.tsx';
import { SearchCard } from '../sessions/SearchCard.tsx';
import { SessionTable } from '../sessions/SessionTable.tsx';
import { LiveSessionPage } from './LiveSessionPage.tsx';
import './cobrowse-page.css';

export interface CobrowsePageProps {
  model: CobrowseController;
  dataState: DataState;
}

const SECTION_TABS = [
  { key: 'live', label: 'Live' },
  { key: 'recordings', label: 'Recordings' },
] as const;

/** The live list's columns. No Events or Pages: a live session has not
 *  finished having them, and a column of zeros says nothing. */
const LIVE_FIELDS = ['started', 'duration', 'location', 'device', 'metadata'] as const;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COBROWSE — who is on the site right now, and what was captured from a past
 * call.
 *
 * A single nav row, no Subitems, so the Live/Recordings split becomes an
 * in-page Tabs strip - the same shape Properties' User/Event split is, one
 * level below Data Management's own Subitem.
 *
 * ── ⚠ THE LIVE LIST IS THE SESSIONS PAGE'S OWN TWO COMPONENTS (2026-09-15) ─
 * Mehdi, on the 09-14 build: "here we missed the search - there is a button
 * for applying search", and "you have start time and end time there, but
 * that's not consistent with what we've done in sessions... in sessions we
 * have it as headers, you can sort them." Gabriel said production's own live
 * list differs. "No, no, no. Don't. That's the whole point - consistency."
 *
 * So the live tab is the QUESTION and the ANSWER, exactly as Sessions draws
 * them: the same `SearchCard` over a catalogue narrowed to what production's
 * live search accepts (user, geography, technology, platform, metadata - no
 * events), and the same `SessionTable`, with Started and Duration as the two
 * sortable headers because those are the two orders production's live list
 * has. The sort dropdown and the order toggle that sat in the header are
 * gone; the headers do that job now, where they do it on Sessions.
 *
 * Production, for the record, draws its live rows with the sessions list's
 * own `SessionItem`. One table here is not a redesign; it is the arrangement
 * the product already has, made visible.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function CobrowsePage({ model, dataState }: CobrowsePageProps) {
  const { message } = App.useApp();
  const [renaming, setRenaming] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState<Recording | null>(null);
  /* A live row opens the assist view in place of the list - production's
     `/assist/<sessionId>`. See LiveSessionPage. */
  if (model.openLive) {
    return <LiveSessionPage key={model.openLive.id} session={model.openLive} model={model} />;
  }

  /* ⚠ A RECORDING PLAYS IN A NEW TAB, because that is what production does:
     the row fetches a signed URL and hands it to `window.open`. There is no
     in-app player to build, and building one would be inventing a screen the
     product does not have. The row, and the "Play video" link on it, both go
     the same way; the menu carries the two things you can do to the file. */
  const recordingColumns: TableColumnsType<Recording> = [
    {
      title: 'Name',
      key: 'name',
      width: '44%',
      /* ⚠ THE APP'S CHEVRON, not antd's triangles (2026-09-15). These two
         headers were `sorter` alone, so this was the one table in the app
         drawing antd's stacked triangles beside its titles - the exact drift
         `sortable` in SortIcon.tsx exists to prevent. Same spread as every
         other sortable header; the comparator stays local because the
         recordings list is the one list antd sorts by itself. */
      ...sortable,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, r) => (
        <span className="m-cb__identity-cell">
          <span style={{ minWidth: 0 }}>
            <span className="m-truncate" style={{ display: 'block' }}>{r.name}</span>
            <span className="m-cb__sub m-cb__mono">{formatDuration(recordingMetaOf(r).durationSec)}</span>
          </span>
        </span>
      ),
    },
    {
      title: 'Recorded by',
      key: 'recordedBy',
      width: '22%',
      render: (_: unknown, r) => <span className="m-truncate">{r.recordedBy}</span>,
    },
    {
      title: 'Recorded',
      key: 'recordedAt',
      width: '16%',
      ...sortable,
      sorter: (a, b) => b.recordedAt - a.recordedAt,
      defaultSortOrder: 'ascend',
      render: (_: unknown, r) => <RelativeTime minutesAgo={minutesSince(r.recordedAt)} />,
    },
    {
      title: '',
      key: 'actions',
      width: '18%',
      align: 'right',
      render: (_: unknown, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--m-space-3)' }}>
          <button
            type="button"
            className="m-cb__play"
            onClick={(e) => {
              e.stopPropagation();
              model.openRecordingRow(r.id);
            }}
          >
            <Play size={12} aria-hidden="true" />
            Play video
          </button>
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
                if (key === 'rename') setRenaming(r);
                else setDeleting(r);
              },
            }}
          >
            <Button
              type="text"
              size="small"
              aria-label={`Actions for ${r.name}`}
              icon={<MoreHorizontal size={15} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </span>
      ),
    },
  ];
  const recordingsEmpty = (
    <EmptyState
      title="No videos have been recorded in your co-browsing sessions."
      hint="Capture and share video recordings of co-browsing sessions with your team for product feedback and training."
    />
  );

  return (
    <PageCard
      title="CoBrowse"
      subtitle="See and support a visitor's session live, or review a past call."
      tabs={
        <Tabs
          activeKey={model.section}
          onChange={(key) => model.setSection(key as CobrowseSection)}
          items={SECTION_TABS.map((t) => ({ key: t.key, label: t.label }))}
        />
      }
      actions={
        model.section === 'live' ? (
          /* ⚠ ONLY THE REFRESH IS LEFT UP HERE. The sort menu and the order
             toggle moved into the table's own headers (2026-09-15); a control
             that changes how the rows are ordered belongs on the rows, where
             Sessions keeps it. Production refreshes the live list on a timer
             and offers this button too. */
          <IconButton
            icon={<RefreshCw size={14} />}
            label="Refresh live sessions"
            variant="ghost"
            onClick={() => message.info('Refreshed.')}
          />
        ) : (
          <SearchField
            placeholder="Search recordings"
            value={model.recordingsQuery}
            onChange={model.setRecordingsQuery}
          />
        )
      }
      /* ⚠ SPLIT, like Sessions: the page lays out its own two components. */
      split
    >
      {model.section === 'live' ? (
        <>
          {/* ── 1 · THE QUESTION ──────────────────────────────────────────
              The same card Sessions draws, over the filters a live session
              can be asked about. No Save as segment: a segment is a saved
              search over recordings, and production offers none here. */}
          <PagePanel spills>
            <SearchCard
              events={model.events}
              properties={model.properties}
              eventsOrder="then"
              onAdd={model.addFilter}
              onAddMany={model.addFilters}
              onReplace={model.replaceFilter}
              onUpdate={model.updateFilter}
              onRemove={model.removeFilter}
              onMoveEvent={model.moveEvent}
              onAddProperty={model.addProperty}
              onUpdateProperty={model.updateProperty}
              onRemoveProperty={model.removeProperty}
              onTogglePropertyOrder={model.togglePropertyOrder}
              onEventsOrder={() => {}}
              onClear={model.clearSearch}
              rows={model.matchedLive}
              entries={liveCatalogue()}
              lead="Filter the live sessions"
            />
          </PagePanel>

          {/* ── 2 · THE ANSWER ────────────────────────────────────────────
              The sessions table, with the two headers production's live
              search can order by. */}
          <PagePanel>
            {dataState === 'loading' ? (
              <SkeletonRows rows={4} />
            ) : model.liveRows.length === 0 ? (
              <EmptyState
                title="No live sessions found"
                hint="Support users with live sessions, cobrowsing, and video calls."
              />
            ) : model.visibleLive.length === 0 ? (
              <EmptyState
                title="No live sessions match this search"
                hint="Loosen one of the filters above."
                action={
                  <Button size="small" onClick={model.clearSearch}>
                    Clear the search
                  </Button>
                }
              />
            ) : (
              <>
                <SessionTable
                  rows={model.visibleLive}
                  fields={LIVE_FIELDS}
                  sortable={LIVE_SORTABLE}
                  sort={model.sort}
                  onSort={model.setSort}
                  onOpen={(s) => model.openLiveSession(s.sessionId)}
                  onFilterToUser={model.filterToUser}
                  /* Every row here is live; the tab says so once. */
                  liveBadge={false}
                  onMetaClick={(k, v) => {
                    const entry = entryOf(`meta.${k}`);
                    if (entry) model.addFilters([{ key: `m${entry.id}`, entryId: entry.id, isEvent: false, operator: 'is', value: [v] }]);
                  }}
                />
                <ListFooter
                  page={1}
                  pageSize={model.visibleLive.length}
                  total={model.visibleLive.length}
                  noun={['live session', 'live sessions']}
                />
              </>
            )}
          </PagePanel>
        </>
      ) : (
        <PagePanel>
          {dataState === 'loading' ? (
            <SkeletonRows rows={4} columns={[44, 22, 16, 18]} />
          ) : model.visibleRecordings.length === 0 ? (
            recordingsEmpty
          ) : (
            <>
              <Table<Recording>
                className="m-cb__table"
                tableLayout="fixed"
                rowKey="id"
                columns={recordingColumns}
                dataSource={model.visibleRecordings}
                pagination={false}
                showSorterTooltip={false}
                rowClassName={(r) => `m-cb__row${model.openRecording?.id === r.id ? ' is-opening' : ''}`}
                onRow={(r) => ({ onClick: () => model.openRecordingRow(r.id) })}
              />
              <ListFooter
                page={1}
                pageSize={model.visibleRecordings.length}
                total={model.visibleRecordings.length}
                noun={['recording', 'recordings']}
              />
            </>
          )}
        </PagePanel>
      )}

      <RenameDialog
        open={renaming != null}
        title="Rename recording"
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => {
          if (renaming) model.renameRecording(renaming.id, name);
          setRenaming(null);
          message.success('Recording name updated');
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title="Delete this recording?"
        okText="Delete"
        onCancel={() => setDeleting(null)}
        onOk={() => {
          if (deleting) model.removeRecording(deleting.id);
          setDeleting(null);
          message.success('Recording deleted');
        }}
      >
        <span className="m-dlg__subject">{deleting?.name}</span> is deleted for everyone on the team. The co-browsing
        session it came from is not affected.
      </ConfirmDialog>
    </PageCard>
  );
}
