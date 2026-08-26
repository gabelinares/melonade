import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListSkeleton } from './ListSkeleton.tsx';

const meta = {
  title: 'Components/ListSkeleton',
  component: ListSkeleton,
  args: { rows: 7 },
  argTypes: { rows: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The list column while the queue loads, shaped like the rows it stands in for: a dot, a title line of varying length, and a shorter meta line, at the real 68px `row-height`. A centred spinner would tell the reader to wait; this tells them what is arriving. Matching the row height exactly is the part that matters, because a skeleton one pixel off its real row makes the whole column jump when the data lands, and a jump reads as a bug.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 400,
          background: 'var(--m-surface-sunken)',
          borderRight: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { rows: 7 },
  parameters: {
    docs: {
      description: {
        story:
          'Seven rows, which is roughly what fits above the fold in the real column. The line widths are cycled rather than uniform, and that is the whole trick: equal-length bars read as a chart, varied ones read as text, so the reader recognises a list before any content exists. Nothing shimmers across the group, because a sweep that crosses seven rows draws the eye down the column at exactly the moment there is nothing to look at.',
      },
    },
  },
};

export const FewRows: Story = {
  args: { rows: 3 },
  parameters: {
    docs: {
      description: {
        story:
          'Three rows, for a short pane or a narrow window. `rows` is a prop rather than a fixed count so a caller can fill the height it actually has: a skeleton that overflows its container scrolls, and a loading state that scrolls is worse than no loading state at all.',
      },
    },
  },
};
