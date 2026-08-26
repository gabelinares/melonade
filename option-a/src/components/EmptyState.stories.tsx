import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'antd';
import { action } from 'storybook/actions';
import { EmptyState } from './EmptyState.tsx';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: { title: 'No issues match these filters' },
  decorators: [
    (Story) => (
      <div style={{ width: 640, border: '1px solid var(--m-border-subtle)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  args: { title: 'No issues found yet' },
  parameters: {
    docs: {
      description: {
        story:
          'The only shape allowed to ship without a hint: nothing has gone wrong and there is genuinely nothing for the reader to do except wait. Everywhere else the missing hint is a bug, because "no results" only repeats what the reader can already see.',
      },
    },
  },
};

export const WithHint: Story = {
  args: {
    title: 'Nothing is critical to you yet',
    hint: 'Describe what matters to you on any issue, and everything like it lands here from then on.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A hint that teaches the mechanism instead of apologising for the emptiness. This list is empty because criticality is derived from descriptions and the reader has not written one, so the sentence names the thing that would fill it. The hint is capped at 46 characters of measure so it stays one readable block rather than a paragraph.',
      },
    },
  },
};

export const WithAction: Story = {
  args: {
    title: 'No issues match these filters',
    hint: 'Clear them to see the whole list again.',
    action: <Button onClick={action('clear filters')}>Clear filters</Button>,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The empty state the reader caused, so it carries the undo. The button is a default antd Button, not a primary one: an ink-filled call to action here would out-rank the toolbar control that actually emptied the list, and the reader has to be able to find that control again either way. No illustration in any of these, because the row this block replaces is 38px tall and a drawing would out-shout the entire page.',
      },
    },
  },
};
