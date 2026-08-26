import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { AGENTS, SHIPPED_AGENT_COUNT } from './agents.ts';
import { AgentRail } from './AgentRail.tsx';

/**
 * The rail is `height: 100%` because in the app it IS the viewport column. A
 * story frame therefore has to hand it a height, or the internal scroll region
 * never engages and the pinned foot proves nothing. 720px is a small laptop,
 * which is the size where growth actually bites.
 */
function RailFrame({ agentCount }: { agentCount: number }) {
  const [active, setActive] = useState('issues');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 720,
        background: 'var(--m-surface-canvas)',
      }}
    >
      <AgentRail
        active={active}
        agentCount={agentCount}
        onNavigate={(key) => {
          action('navigate')(key);
          setActive(key);
        }}
        onOpenSearch={action('open the command palette')}
      />
      <div
        style={{
          flex: 1,
          padding: 'var(--m-space-6)',
          background: 'var(--m-surface-default)',
          fontSize: 'var(--m-text-sm)',
          color: 'var(--m-content-muted)',
        }}
      >
        The content planes live here. Current page: {active}.
      </div>
    </div>
  );
}

const meta = {
  title: 'Navigation/AgentRail',
  component: AgentRail,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'THE MENU, and the piece this whole exercise asks to be judged on: does it survive more stuff going into it. This option answers structurally rather than with labels, and four decisions carry it. IT COSTS NO WIDTH, EVER: the rail is 56px at every window size and every roster size, so adding the eleventh agent takes 44px of vertical space that was empty anyway and the content panes give back nothing, where a labelled 216px nav has to collapse to a rail on a small screen and therefore has two layouts to keep honest. GROUPS ARE SPACE, NOT HEADERS: there is no room for an "Agents" caption, so the boundary between replay and the agents is a gap plus a hairline, and two groups need a separator rather than a title. THE AGENTS BLOCK IS THE ONLY THING THAT SCROLLS: the project mark and Sessions sit above it and search, Preferences, support, theme and the account sit below, all pinned, so Preferences can never be pushed off-screen by growth. THE COST IS DISCOVERABILITY, AND IT IS PAID FOR EXPLICITLY: an icon rail hides names, so the search slot and Cmd K open a real command palette where every agent is reachable and searchable by name. Ship the rail without that palette and this is a worse menu than the labelled list it replaces. Each story below is the same component at a different roster size, so the claim is checkable rather than asserted.',
      },
    },
  },
  args: {
    active: 'issues',
    agentCount: SHIPPED_AGENT_COUNT,
    onNavigate: action('navigate'),
    onOpenSearch: action('open the command palette'),
  },
  argTypes: {
    agentCount: { control: { type: 'range', min: 1, max: AGENTS.length, step: 1 } },
  },
} satisfies Meta<typeof AgentRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeAgents: Story = {
  args: { agentCount: SHIPPED_AGENT_COUNT },
  render: (args) => <RailFrame key={args.agentCount} agentCount={args.agentCount} />,
  parameters: {
    docs: {
      description: {
        story:
          'Today: the three shipped agents, read from the roster rather than typed in, so this story tracks the product instead of a snapshot of it. At this size the rail looks like a stylistic choice and the hairline separator looks like decoration. The next two stories are what both are for.',
      },
    },
  },
};

export const SixAgents: Story = {
  args: { agentCount: 6 },
  render: (args) => <RailFrame key={args.agentCount} agentCount={args.agentCount} />,
  parameters: {
    docs: {
      description: {
        story:
          'Double the roster, and nothing about the shape has changed: no new level of nesting, no disclosure to remember, and the whole foot block is exactly where it was. This is the size where a nested "Agents" tree starts costing a click on every visit, and where the flat rail stops being a preference.',
      },
    },
  },
};

export const ElevenAgents: Story = {
  args: { agentCount: AGENTS.length },
  render: (args) => <RailFrame key={args.agentCount} agentCount={args.agentCount} />,
  parameters: {
    docs: {
      description: {
        story:
          'The full roster in a 720px frame, which is where the scroll finally engages. Watch what does NOT move: the project mark and Sessions stay above, search and Preferences and the account stay below, and only the agents block travels. Its scrollbar is hidden on purpose, since 8px of a 56px rail is 14% of the menu spent on a hint, and the region is still keyboard and wheel scrollable. "Add an agent" scrolls with the group it grows, so the answer to "where does the next one go" is visible in place. The honest cost is on screen too: eleven glyphs and no words, which is why the search slot beneath them is not optional.',
      },
    },
  },
};
