import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bug } from 'lucide-react';
import { action } from 'storybook/actions';
import { NavItem } from './NavItem.tsx';

const meta = {
  title: 'Navigation/NavItem',
  component: NavItem,
  args: {
    icon: <Bug size={15} />,
    label: 'Issues',
    count: 0,
    active: false,
    collapsed: false,
    onClick: action('navigate'),
  },
  decorators: [
    (Story, context) => (
      /* the nav surface, at its real width, because this row is a full-width
         target and its hover state is only honest against the nav's own ground */
      <div
        style={{
          width: context.args.collapsed ? 'var(--m-nav-width-collapsed)' : 'var(--m-nav-width)',
          padding: 'var(--m-space-4)',
          background: 'var(--m-surface-nav)',
          border: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Issues' },
  parameters: {
    docs: {
      description: {
        story:
          'The resting row: a decorative icon, a label that truncates, and nothing else. The icon sits at the muted end of the ramp so a column of eleven of them reads as texture rather than as eleven competing marks.',
      },
    },
  },
};

export const Active: Story = {
  args: { label: 'Issues', active: true },
  parameters: {
    docs: {
      description: {
        story:
          'Current page, marked by a filled surface and a step up in weight. No coloured bar and no accent fill: the page title already says where you are, and an accent in the nav would compete with the single accent the content plane is allowed. It also sets `aria-current="page"`, so the state is not carried by colour alone.',
      },
    },
  },
};

export const WithCount: Story = {
  args: { label: 'Issues', count: 11 },
  parameters: {
    docs: {
      description: {
        story:
          'The count is why this component exists. The nav doubles as the queue, so you can see which agent has work waiting without opening it, and that is what makes a growing list of agents useful rather than merely long. Zero renders nothing, because a row of "0"s would train the reader to stop reading the numbers.',
      },
    },
  },
};

export const Collapsed: Story = {
  args: { label: 'Issues', collapsed: true },
  parameters: {
    docs: {
      description: {
        story:
          'The rail. The label leaves the layout but not the accessible name: it stays in a screen-reader-only span and comes back as a tooltip on hover, so collapsing costs pixels and not information.',
      },
    },
  },
};

export const CollapsedWithCount: Story = {
  args: { label: 'Issues', collapsed: true, count: 11 },
  parameters: {
    docs: {
      description: {
        story:
          'Collapsed with work waiting. A two-digit number will not fit in a 52px rail, so the count degrades to a presence dot and the exact figure moves to the tooltip and the accessible name. Degrading to "there is something here" keeps the rail scannable; dropping the count entirely would make the collapsed nav a worse tool rather than a narrower one.',
      },
    },
  },
};
