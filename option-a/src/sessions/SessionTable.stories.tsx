import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SESSIONS, columnSortOf, sortKeyOf, sortSessions, type ColumnSort, type SessionSortKey } from '@shared/sessions-logic.ts';
import { LIVE_SESSIONS } from '@shared/cobrowse-data.ts';
import { DEFAULT_LIVE_SORT, LIVE_SORTABLE, liveSessionRowOf, sortLiveRows } from '@shared/cobrowse-logic.ts';
import { PagePanel } from '../components/PageCard.tsx';
import { SessionTable } from './SessionTable.tsx';

/**
 * ONE TABLE FOR EVERY LIST OF SESSIONS (2026-09-15). Sessions and the
 * CoBrowse live tab draw this component; what differs between them is said
 * in props - which fields are on, which headers the backend can honour - and
 * nothing is redrawn. The stories hold the table's state themselves so a
 * header click reorders the rows, which is the behaviour that was missing
 * until today: `sorter: true` with nothing listening flips a chevron and
 * moves no rows.
 */
/* No `component`: both stories render a harness that owns the sort state, so
   there are no args to control and Storybook is told so. */
const meta = {
  title: 'Sessions/SessionTable',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="m-page__body" style={{ padding: 'var(--m-space-5)' }}>
        <PagePanel>
          <Story />
        </PagePanel>
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

function SessionsHarness() {
  const [key, setKey] = useState<SessionSortKey>('recent');
  const rows = sortSessions([...SESSIONS].slice(0, 12), key);
  return (
    <SessionTable
      rows={rows}
      fields={['started', 'events', 'duration', 'location', 'device', 'metadata']}
      sortable={['started', 'events']}
      sort={columnSortOf(key)}
      onSort={(next) => setKey(sortKeyOf(next))}
      onOpen={() => {}}
      onFilterToUser={() => {}}
      onMetaClick={() => {}}
      lastViewedId={SESSIONS[0]?.sessionId}
    />
  );
}

function LiveHarness() {
  const [sort, setSort] = useState<ColumnSort>(DEFAULT_LIVE_SORT);
  const rows = sortLiveRows(LIVE_SESSIONS.map((s) => liveSessionRowOf(s)), sort);
  return (
    <SessionTable
      rows={rows}
      fields={['started', 'duration', 'location', 'device', 'metadata']}
      sortable={LIVE_SORTABLE}
      sort={sort}
      onSort={(next) => setSort(next ?? DEFAULT_LIVE_SORT)}
      onOpen={() => {}}
      onFilterToUser={() => {}}
      liveBadge={false}
    />
  );
}

export const Sessions: Story = {
  render: () => <SessionsHarness />,
  parameters: {
    docs: {
      description: {
        story:
          'The Recordings page: every field on, Started and Events sortable because those are the two orders the backend accepts. Click a header - the rows move, and the chevron shows the order the list is actually in.',
      },
    },
  },
};

export const Live: Story = {
  render: () => <LiveHarness />,
  parameters: {
    docs: {
      description: {
        story:
          "The CoBrowse live tab: the same table over live sessions expressed as rows. No Events or Pages (a live session has not finished having them), no live badge (the tab already says so), and Started and Duration sortable because those are the two orders production's live search has.",
      },
    },
  },
};
