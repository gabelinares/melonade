import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { Bug, Plus } from 'lucide-react';
import { RailItem } from './RailItem.tsx';

const meta = {
  title: 'Navigation/RailItem',
  component: RailItem,
  args: {
    icon: <Bug size={17} />,
    label: 'Issues',
    count: 0,
    active: false,
    ghost: false,
    onClick: action('rail item clicked'),
  },
  argTypes: {
    count: { control: { type: 'range', min: 0, max: 250, step: 1 } },
    label: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: 'var(--m-rail-width)',
          padding: 'var(--m-space-4) 0',
          background: 'var(--m-surface-nav)',
          border: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'One slot in the rail, drawn on the tinted chrome it actually sits on, inside a 56px column so its real width constraint is visible. The label lives in a tooltip and in the accessible name rather than on screen, and that is the trade this option makes: a slot costs 44px of height and ZERO width, so the eleventh agent is as cheap as the third and the content panes never give anything back. Hover any story to see the tooltip that carries the name.',
      },
    },
  },
} satisfies Meta<typeof RailItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { count: 0 },
  parameters: {
    docs: {
      description: {
        story:
          'An agent with nothing waiting. No badge at all rather than a zero, because a rail of eleven zeroes is eleven things to read that all say "nothing", and the absence of a badge is a faster way to say it. The glyph sits at `content-muted`, one step down from the current slot, so "available" and "where I am" are never confusable.',
      },
    },
  },
};

export const Active: Story = {
  args: { active: true, count: 11 },
  parameters: {
    docs: {
      description: {
        story:
          'The current agent, and the one place in the whole chrome where the accent tints a surface. There is deliberately no coloured stripe down the edge: a bar beside a list item is decoration standing in for structure, and a filled tile has already said it. Note what the badge does here, since it is the subtler decision: on the active slot the count picks up the accent as TEXT and keeps its outline, rather than becoming a second filled shape, because the tile behind the icon is already carrying "current" and two fills would compete.',
      },
    },
  },
};

export const WithCount: Story = {
  args: { count: 4 },
  parameters: {
    docs: {
      description: {
        story:
          'A count on an inactive slot, and the badge is deliberately quiet: an outlined pill in the bottom corner, clear of the glyph. The first pass filled it, and rendered, three filled badges on a 56px rail were the loudest thing in the product and overlapped the icons they were annotating. The count is information, not an alarm, and this is the rail doing the job the labelled nav does with a number in a row: you can see which agent has work without opening it.',
      },
    },
  },
};

export const LargeCount: Story = {
  args: { count: 248 },
  parameters: {
    docs: {
      description: {
        story:
          'Anything past 99 clamps to "99+" and the exact number stays in the tooltip. The cap is a layout guarantee rather than a nicety: three digits would widen the badge past the 36px tile it is pinned to, and once the badge is wider than the slot the whole rail has to grow, which is the one thing this design promises never happens.',
      },
    },
  },
};

export const Ghost: Story = {
  args: { icon: <Plus size={16} />, label: 'Add an agent', ghost: true },
  parameters: {
    docs: {
      description: {
        story:
          'The "add an agent" slot, as a dashed outline. It answers the brief\'s actual question, which is where the next agent goes, by putting the answer in the place it will appear rather than in a header or a settings page. Dashed rather than filled because it is a slot and not an agent, and it scrolls with the group it grows rather than being pinned above it.',
      },
    },
  },
};
