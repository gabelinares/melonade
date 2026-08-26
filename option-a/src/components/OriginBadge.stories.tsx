import type { Meta, StoryObj } from '@storybook/react-vite';
import { SEGMENTS } from '@shared/issues-data.ts';
import { OriginBadge } from './OriginBadge.tsx';

const firstSegment = SEGMENTS[0];

const meta = {
  title: 'Components/OriginBadge',
  component: OriginBadge,
  args: {},
} satisfies Meta<typeof OriginBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullTraffic: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'No segment, so the agent was sampling everything. The badge is still present: every issue has an origin, and rendering it only for segment finds would make absence of a badge mean two different things, "full traffic" and "nobody told us".',
      },
    },
  },
};

export const Segment: Story = {
  args: { segmentName: firstSegment ? firstSegment.name : 'Billing & checkout' },
  parameters: {
    docs: {
      description: {
        story:
          'Captured inside a saved segment, named on hover. Only the icon and the accent tint change: a coloured chip carrying the segment name on every row would read as the most important thing in the row, when it is actually the least, so the name moves to the tooltip.',
      },
    },
  },
};
