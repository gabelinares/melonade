import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreCount } from './MoreCount.tsx';

const TAGS = [
  'Payment',
  'Checkout',
  'Error encountered',
  'Frustration',
  'Back and forth',
  'Form submission',
  'Slow load',
  'Rage click',
  'Dead click',
  'Mobile',
  'Safari',
  'Saved card',
];

const meta = {
  title: 'Components/MoreCount',
  component: MoreCount,
  args: { hidden: TAGS.slice(0, 2) },
} satisfies Meta<typeof MoreCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Nothing: Story = {
  args: { hidden: [] },
  parameters: {
    docs: {
      description: {
        story:
          'Renders nothing at all, so this story is deliberately blank. The empty case returns null instead of a "+0" or a zero-width span because every callsite passes the tail of a sliced list, and if the component did not absorb the empty case each of them would have to guard, which is exactly how "+0" reached production once already.',
      },
    },
  },
};

export const Two: Story = {
  args: { hidden: TAGS.slice(0, 2) },
  parameters: {
    docs: {
      description: {
        story:
          'The common case in the Tags column: one chip fits, the rest become a number. Hover reads out the hidden names, so the count is a promise that nothing was lost rather than a warning that something was.',
      },
    },
  },
};

export const Twelve: Story = {
  args: { hidden: TAGS },
  parameters: {
    docs: {
      description: {
        story:
          'A two-digit count, which is where a badge-shaped overflow marker would start to shove the column. This one stays plain muted text at the same size, so the width it costs grows by one character and the row keeps its rhythm.',
      },
    },
  },
};
