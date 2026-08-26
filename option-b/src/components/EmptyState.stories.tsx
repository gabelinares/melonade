import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@mantine/core';
import { action } from 'storybook/actions';
import { EmptyState } from './EmptyState.tsx';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: { title: 'Nothing matches these filters', variant: 'pane' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['pane', 'inline'] },
    title: { control: 'text' },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An empty state teaches the interface. "No results" restates what the reader can already see, whereas naming the filter that emptied the list points at the control to reach for, and naming the mechanism ("the agent is still reading sessions") answers the question a new project actually has. There is no illustration in either variant: the pane form fills a whole column, and a drawing at that size would be the loudest thing in the product.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          height: 420,
          background: 'var(--m-surface-default)',
          border: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PaneTitleOnly: Story = {
  args: { variant: 'pane', title: 'Nothing selected' },
  parameters: {
    docs: {
      description: {
        story:
          'The detail pane with no issue chosen, and the second of exactly two places this design system lets the display serif speak. It is set at `text-4xl`, which makes it the largest type in the product: an empty reading pane is the one moment there is nothing to compete with, so the face gets to carry the brand instead of a logo doing it.',
      },
    },
  },
};

export const PaneWithHint: Story = {
  args: {
    variant: 'pane',
    title: 'Nothing selected',
    hint: 'Pick an issue from the queue, or press J and K to walk it.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The hint is where the keyboard walk gets discovered. A shortcut nobody is told about is a shortcut nobody uses, and an empty pane is the only surface in this layout with room to say it without becoming a tooltip nobody opens. The hint is capped at 42 characters of measure so it stays one or two lines and does not turn into documentation.',
      },
    },
  },
};

export const PaneWithAction: Story = {
  args: {
    variant: 'pane',
    title: 'Nothing matches these filters',
    hint: 'Clear them to see the whole queue again.',
    action: (
      <Button variant="default" size="xs" onClick={action('clear filters')}>
        Clear filters
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'An action belongs here only when there is something to undo. This is the filtered-to-nothing case, so the button does the exact thing the hint describes. The rule the component enforces by making `action` optional: a genuinely empty project gets no button, because a Clear control that clears nothing teaches the reader that buttons here do not work.',
      },
    },
  },
};

export const Inline: Story = {
  args: {
    variant: 'inline',
    title: 'Nothing is critical to you yet',
    hint: 'Describe what matters to you on any issue, and everything like it lands here from then on.',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          height: 420,
          width: 400,
          background: 'var(--m-surface-sunken)',
          borderRight: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'The same component inside the 400px list column, drawn on the tinted surface it actually sits on. The title drops out of the serif and down to `text-md` medium, which is the decision worth seeing: a 32px display headline inside a 400px column would wrap to three lines and read as a page title, and the column is not a page. The variant is not a size, it is a change of voice.',
      },
    },
  },
};
