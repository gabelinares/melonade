import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveDuration } from './LiveDuration.tsx';

const meta = {
  title: 'Components/LiveDuration',
  component: LiveDuration,
  args: { startedAt: Date.now() - 94_000 },
  parameters: {
    docs: {
      description: {
        component:
          'The elapsed time of a run still in flight. A finished run prints its duration; an unfinished one printing a dash would throw away the only thing anybody wants to know about it. It ticks once a second because a counter that does not move is indistinguishable from a stopped run — watch this one for a moment rather than taking the screenshot for it.',
      },
    },
  },
} satisfies Meta<typeof LiveDuration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ticking: Story = {};
