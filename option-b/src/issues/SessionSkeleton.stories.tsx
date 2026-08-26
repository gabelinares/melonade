import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionSkeleton } from './SessionSkeleton.tsx';

function Row() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 'var(--m-space-4)',
        padding: 'var(--m-space-8)',
        background: 'var(--m-surface-sunken)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <SessionSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

const meta = {
  title: 'Issues/SessionSkeleton',
  component: Row,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "A session card with nothing in it yet, built out of the card's **own** classes " +
          'rather than a second set of boxes that happen to be about the same size. That is ' +
          'the whole trick: the still, the variation line, the identity row and the device ' +
          'line are laid out by `session-card.css`, so a skeleton cannot drift from the card ' +
          'it stands in for and the band cannot change height when the real ones arrive.\n\n' +
          'Three of them, in the same three-column grid the band uses, because the band is ' +
          'capped at three. See `shortlistSessions`.',
      },
    },
  },
} satisfies Meta<typeof Row>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
