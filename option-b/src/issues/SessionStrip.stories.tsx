import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import {
  NO_SESSION_FILTERS,
  sessionPool,
  shortlistSessions,
  toggleSessionFilter,
  type SessionFilters,
} from '@shared/issues-logic.ts';
import { SessionStrip } from './SessionStrip.tsx';

const ISSUE = ISSUES[0]!;
/* The real pool, not the three hand-written records: 134 sessions is what makes
   "3 of 134", the show-more control and the pager mean anything to look at. */
const POOL = sessionPool(ISSUE);

/** The controller's job, in miniature: the shortlist is derived from the
 *  filters, and one derivation feeds the cards, the chips and the arrows. */
function Harness({ density }: { density: 'cards' | 'strip' }) {
  const [at, setAt] = useState<number | null>(density === 'strip' ? 0 : null);
  const [filters, setFilters] = useState<SessionFilters>(NO_SESSION_FILTERS);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(3);
  const [autoplay, setAutoplay] = useState(false);
  const shortlist = useMemo(() => shortlistSessions(POOL, filters, query), [filters, query]);

  const step = (delta: number) => {
    const reachable = shortlist.slice(0, visible);
    const current = at != null ? POOL[at] : undefined;
    const i = current ? reachable.indexOf(current) : -1;
    const next = reachable[Math.min(reachable.length - 1, Math.max(0, i + delta))];
    if (next) setAt(POOL.indexOf(next));
  };

  return (
    <div style={{ background: 'var(--m-surface-default)', padding: '2rem 0' }}>
      <SessionStrip
        sessions={POOL}
        shortlist={shortlist}
        visible={visible}
        onShowMore={() => setVisible((v) => v + 3)}
        autoplay={autoplay}
        onToggleAutoplay={() => setAutoplay((a) => !a)}
        activeIndex={at}
        onOpen={setAt}
        onStep={step}
        density={density}
        filters={filters}
        query={query}
        onQuery={setQuery}
        onToggleFilter={(key, value) => setFilters((f) => toggleSessionFilter(f, key, value))}
        onClearFilters={() => { setFilters(NO_SESSION_FILTERS); setQuery(''); }}
      />
    </div>
  );
}

const meta = {
  title: 'Issues/SessionStrip',
  component: Harness,
  args: { density: 'cards' as const },
  argTypes: { density: { control: 'inline-radio', options: ['cards', 'strip'] } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'THE CONSTANT of the flow. Everything else either collapses or appears; this is on ' +
          'screen at every depth, in the same slot, and it is what carries you from "which ' +
          'session" to "watching one" and back. One component with two densities rather than a ' +
          'list and, separately, a tab bar that happen to hold the same data.\n\n' +
          'It does not move between depths either. It sits directly under the issue, and when the ' +
          'issue collapses from a write-up to a two-line bar the strip rides up with it. Nothing ' +
          'jumps: the space above it is what changed.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {
  args: { density: 'cards' },
  parameters: {
    docs: {
      description: {
        story:
          'Triage density. The VARIATION is the load-bearing line, not the email: three sessions ' +
          'of one issue are not interchangeable - one person retried twice, one gave up instantly, ' +
          'one was on a phone - and choosing between those is the entire reason to pick a session ' +
          'rather than take the first. Three lines then clamp; the dataset deliberately holds one ' +
          'variation that runs long and one that sits at exactly three lines.',
      },
    },
  },
};

export const Strip: Story = {
  args: { density: 'strip' },
  parameters: {
    docs: {
      description: {
        story:
          'Watching density. One row: who, how long, where you are in the set. The variation is ' +
          "gone because you read it to get here, and the player's caption is telling the story " +
          'now. Local part of the address only - the full one is three times the width and the ' +
          'domain is the same on every row anyway.',
      },
    },
  },
};
