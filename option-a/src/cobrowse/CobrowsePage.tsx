import { App, Table, Tabs } from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, RefreshCw } from 'lucide-react';
import type { CobrowseSection, LiveSession, LiveSort, Recording } from '@shared/cobrowse-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import { formatDuration } from '@shared/sessions-logic.ts';
import type { DataState } from '@shared/issues-logic.ts';
import type { CobrowseController } from '../state/useCobrowse.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { MenuSelect } from '../components/DisplayMenu.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './cobrowse-page.css';

export interface CobrowsePageProps {
  model: CobrowseController;
  dataState: DataState;
}

const SECTION_TABS = [
  { key: 'live', label: 'Live' },
  { key: 'recordings', label: 'Recordings' },
] as const;

const SORT_CHOICES: ReadonlyArray<{ value: LiveSort; label: string }> = [
  { value: 'startedAt', label: 'Start time' },
  { value: 'duration', label: 'Duration' },
];

const identityLabel = (s: LiveSession) => s.userId ?? s.userAnonymousId;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COBROWSE — who is on the site right now, and what was captured from a past
 * call.
 *
 * A single nav row, no Subitems, so the Live/Recordings split becomes an
 * in-page Tabs strip - the same shape Properties' User/Event split is, one
 * level below Data Management's own Subitem.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function CobrowsePage({ model, dataState }: CobrowsePageProps) {
  const { message } = App.useApp();

  const liveColumns: TableColumnsType<LiveSession> = [
    {
      title: 'User',
      key: 'user',
      width: '34%',
      render: (_: unknown, s) => (
        <div className="m-cb__identity-cell">
          <SessionAvatar seed={identityLabel(s)} size={24} />
          <span className="m-truncate">{identityLabel(s)}</span>
        </div>
      ),
    },
    {
      title: 'Started',
      key: 'startedAt',
      width: '22%',
      render: (_: unknown, s) => <RelativeTime minutesAgo={minutesSince(s.startedAt)} />,
    },
    {
      title: 'Duration',
      key: 'duration',
      width: '20%',
      render: (_: unknown, s) => <span className="m-cb__mono">{formatDuration(s.durationSec)}</span>,
    },
    {
      title: 'Location',
      key: 'location',
      width: '24%',
      render: (_: unknown, s) => <span className="m-truncate">{s.city}, {s.country}</span>,
    },
  ];

  const recordingColumns: TableColumnsType<Recording> = [
    {
      title: 'Name',
      key: 'name',
      width: '50%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_: unknown, r) => <span className="m-truncate">{r.name}</span>,
    },
    {
      title: 'Recorded by',
      key: 'recordedBy',
      width: '30%',
      render: (_: unknown, r) => <span className="m-truncate">{r.recordedBy}</span>,
    },
    {
      title: 'Recorded',
      key: 'recordedAt',
      width: '20%',
      sorter: (a, b) => b.recordedAt - a.recordedAt,
      defaultSortOrder: 'ascend',
      render: (_: unknown, r) => <RelativeTime minutesAgo={minutesSince(r.recordedAt)} />,
    },
  ];

  const liveEmpty = (
    <EmptyState
      title="No live sessions found"
      hint="Support users with live sessions, cobrowsing, and video calls."
    />
  );

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
          <>
            <IconButton
              icon={<RefreshCw size={14} />}
              label="Refresh live sessions"
              variant="ghost"
              onClick={() => message.info('Refreshed.')}
            />
            <MenuSelect
              id="cb-sort"
              value={model.sort}
              choices={SORT_CHOICES}
              onChange={(v) => model.setSort(v as LiveSort)}
            />
            <IconButton
              icon={model.order === 'desc' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
              label={model.order === 'desc' ? 'Newest first' : 'Oldest first'}
              variant="ghost"
              pressed
              onClick={() => model.setOrder(model.order === 'desc' ? 'asc' : 'desc')}
            />
          </>
        ) : (
          <SearchField
            placeholder="Search recordings"
            value={model.recordingsQuery}
            onChange={model.setRecordingsQuery}
          />
        )
      }
    >
      {model.section === 'live' ? (
        dataState === 'loading' ? (
          <SkeletonRows rows={4} columns={[34, 22, 20, 24]} />
        ) : model.visibleLive.length === 0 ? (
          liveEmpty
        ) : (
          <>
            <Table<LiveSession>
              className="m-cb__table"
              tableLayout="fixed"
              rowKey="id"
              columns={liveColumns}
              dataSource={model.visibleLive}
              pagination={false}
              rowClassName="m-cb__row"
              onRow={(s) => ({ onClick: () => model.openLiveSession(s.id) })}
            />
            <ListFooter
              page={1}
              pageSize={model.visibleLive.length}
              total={model.visibleLive.length}
              noun={['live session', 'live sessions']}
            />
          </>
        )
      ) : dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[50, 30, 20]} />
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
            rowClassName="m-cb__row"
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

      <StubDrawer
        open={model.openLive != null}
        onClose={model.closeLiveSession}
        title={model.openLive ? identityLabel(model.openLive) : ''}
        meta={model.openLive && <span>{model.openLive.city}, {model.openLive.country}</span>}
        note="Joining the call — watching the visitor's screen live and drawing on it together — is the next piece. This round is the roster: who's live right now."
      />
      <StubDrawer
        open={model.openRecording != null}
        onClose={model.closeRecordingRow}
        title={model.openRecording?.name ?? ''}
        meta={model.openRecording && <span>{model.openRecording.recordedBy}</span>}
        note="Playing the recorded call back is the next piece. This round is the library: which calls were captured, and by whom."
      />
    </PageCard>
  );
}
