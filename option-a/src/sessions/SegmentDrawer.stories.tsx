import { useState } from 'react';
import { App } from 'antd';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SAVED_SEGMENTS, SESSIONS, type SavedSegment } from '@shared/sessions-logic.ts';
import { SegmentDrawer } from './SegmentDrawer.tsx';

/** The drawer, over a plain ground. `App` because the delete confirm goes
 *  through `App.useApp()` — a static `Modal.confirm` bypasses the theme, which
 *  is the componentization mandate's one hard rule. */
function Harness({ segment, seeded }: { segment: SavedSegment | null; seeded: boolean }) {
  const [saved, setSaved] = useState<string | null>(null);
  const seed = seeded
    ? { filters: SAVED_SEGMENTS[4]!.filters, eventsOrder: SAVED_SEGMENTS[4]!.eventsOrder }
    : { filters: [], eventsOrder: 'then' as const };

  return (
    <App>
      <div style={{ minHeight: 520, padding: 'var(--m-space-6)' }}>
        <p style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-muted)' }}>
          {saved ? `saved: ${saved}` : 'The drawer is open over this.'}
        </p>
        <SegmentDrawer
          key={segment?.id ?? 'new'}
          open
          segment={segment}
          seed={seed}
          pool={SESSIONS}
          onSave={(s) => setSaved(s.name)}
          onDelete={(id) => setSaved(`deleted ${id}`)}
          onApply={(id) => setSaved(`used ${id}`)}
          onClose={() => setSaved('closed')}
        />
      </div>
    </App>
  );
}

const meta = {
  title: 'Sessions/SegmentDrawer',
  component: Harness,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mine, with a sequence in it. The rules editor is `SearchCard` in its panel
 *  variant — the same picker, the same clause rows, the same value fields with
 *  their proportion bars. A segment is one saved search, so it is edited by the
 *  thing that edits a search. */
export const Mine: Story = { args: { segment: SAVED_SEGMENTS[0]!, seeded: false } };

/** Two plain properties, no sequence — so the order control is absent, which is
 *  the same rule the page follows: it appears at two events and not before. */
export const PropertiesOnly: Story = { args: { segment: SAVED_SEGMENTS[5]!, seeded: false } };

/** ⚠ SOMEBODY ELSE'S. It opens, it reads, it applies — and it cannot be saved
 *  or deleted. The eyebrow names the owner rather than leaving a disabled
 *  button to be interpreted. */
export const TheirSegment: Story = { args: { segment: SAVED_SEGMENTS[3]!, seeded: false } };

/** ⚠ NEW, FROM A SEARCH YOU HAD BUILT. The button that opens this sits under a
 *  filter you have just made, so it starts from that filter: an empty drawer
 *  there would throw the work away and ask for it again. The name is the only
 *  thing missing, and the footer says so until it is not. */
export const NewFromTheSearch: Story = { args: { segment: null, seeded: true } };

/** New from nothing, which is the state the header's "New segment" button on
 *  the segments tab produces. Both are the same drawer; only the seed differs. */
export const NewFromNothing: Story = { args: { segment: null, seeded: false } };
