import type { Meta, StoryObj } from '@storybook/react-vite';
import { CountSuffix } from './CountSuffix.tsx';

const meta = {
  title: 'Components/CountSuffix',
  component: CountSuffix,
  args: { n: 11 },
  decorators: [
    (Story) => (
      <span style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-primary)' }}>
        Errors
        <Story />
      </span>
    ),
  ],
} satisfies Meta<typeof CountSuffix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: { n: 4 },
  parameters: {
    docs: {
      description: {
        story:
          'A single digit after a tab label. The count is muted and unboxed on purpose: a filled badge would make every tab look like it had unread work, and there are four of them in a row on the Issues toolbar.',
      },
    },
  },
};

export const Large: Story = {
  args: { n: 1284 },
  parameters: {
    docs: {
      description: {
        story:
          'Four digits, which is where a count starts changing the width of the thing it follows. Tabular numerals keep the label from shifting as the number ticks, and no thousands separator is applied here so the component stays a count rather than a formatter with an opinion about locale.',
      },
    },
  },
};
