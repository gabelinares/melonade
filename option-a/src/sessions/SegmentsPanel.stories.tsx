import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SAVED_SEGMENTS, SESSIONS, type SavedSegment } from '@shared/sessions-logic.ts';
import { SegmentsPanel } from './SegmentsPanel.tsx';

/** The tab, with whatever list of segments the story hands it. Every state here
 *  is reached by giving it a different list — there is no story prop that puts
 *  the component into a state the app could not produce. */
function Harness({ segments }: { segments: readonly SavedSegment[] }) {
  const [opened, setOpened] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  return (
    <div style={{ padding: 'var(--m-space-6)', display: 'flex', flexDirection: 'column', minHeight: 420 }}>
      <SegmentsPanel
        segments={segments}
        pool={SESSIONS}
        onOpen={setOpened}
        onApply={setApplied}
        onNew={() => setOpened('new')}
      />
      <p style={{ marginTop: 'var(--m-space-5)', fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)' }}>
        opened: {opened ?? '—'} · used: {applied ?? '—'}
      </p>
    </div>
  );
}

const meta = {
  title: 'Sessions/SegmentsPanel',
  component: Harness,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Six segments: mine and other people's, shared and private, sequences and
 *  plain properties. Every row prints its own rules and its live count. */
export const AllOfThem: Story = { args: { segments: SAVED_SEGMENTS } };

/** ⚠ Only mine. The Owner column reads "You" on every row, which is the state
 *  where the column is doing the least — worth looking at, because it is also
 *  the state most single-person projects are permanently in. */
export const OnlyMine: Story = { args: { segments: SAVED_SEGMENTS.filter((s) => s.mine) } };

/** One segment. The table is a table with one row in it rather than something
 *  else — a list that changes shape at low counts is a list you cannot learn. */
export const JustOne: Story = { args: { segments: SAVED_SEGMENTS.slice(0, 1) } };

/** ⚠ EMPTY, and this is the one people meet first. It says what a segment IS,
 *  because "no saved segments" on a page nobody has used yet explains nothing:
 *  the empty state has to teach the feature, not report its absence. */
export const Nothing: Story = { args: { segments: [] } };

/** A segment whose rules currently match nothing — a real state, and the reason
 *  the count column exists. It reads as a dash rather than a zero, like every
 *  other empty figure in the app, so a shelf of segments shows at a glance
 *  which ones have gone quiet. */
export const OneHoldsNothing: Story = {
  args: {
    segments: [
      {
        ...SAVED_SEGMENTS[0]!,
        id: 'seg-empty',
        name: 'Enterprise crashes on Firefox',
        filters: [
          { key: 'e1', entryId: 'userBrowser', isEvent: false, operator: 'is', value: ['Firefox'] },
          { key: 'e2', entryId: 'issueType', isEvent: false, operator: 'hasAny', value: ['crash'] },
          { key: 'e3', entryId: 'meta.plan', isEvent: false, operator: 'is', value: ['enterprise'] },
        ],
      },
      ...SAVED_SEGMENTS.slice(1, 3),
    ],
  },
};
