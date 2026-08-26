import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { AGENTS, SHIPPED_AGENT_COUNT } from './agents.ts';
import { SideNav } from './SideNav.tsx';

/**
 * The nav is `height: 100vh` and sticky, because in the app it IS the viewport
 * column. A story frame therefore has to hand it a height, or the internal
 * scroll never engages and the pinned shoulders prove nothing. The override
 * below is scoped to this frame and lives only in the story.
 */
function NavFrame({
  agentCount,
  initialCollapsed,
}: {
  agentCount: number;
  initialCollapsed: boolean;
}) {
  const [active, setActive] = useState('issues');
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <div
      className="sb-nav-frame"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 720,
        background: 'var(--m-surface-canvas)',
      }}
    >
      <style>{'.sb-nav-frame .m-nav { height: 100%; position: relative; top: auto; }'}</style>
      <SideNav
        active={active}
        onNavigate={(key) => {
          action('navigate')(key);
          setActive(key);
        }}
        agentCount={agentCount}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div
        style={{
          flex: 1,
          padding: 'var(--m-space-6)',
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
        }}
      >
        The content plane. Current page: {active}.
      </div>
    </div>
  );
}

const meta = {
  title: 'Navigation/SideNav',
  component: SideNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The menu, which is the piece this whole exercise asks to be judged on: does it survive more stuff going into it. Four decisions carry that. AGENTS ARE PEERS, NOT CHILDREN: today Issues, Tests and Audits are nested inside a collapsible "Agents" item, so reaching any of them costs a disclosure click and the tree has to remember open state, whereas flattened, a new agent costs exactly one row and nothing has to be expanded. THE SHOULDERS ARE PINNED: only the agent list scrolls, with Replay above it and the account below it fixed, so Preferences can never be pushed off-screen, which is what happens in a nav that grows as one long scrolling column. THE NAV IS THE QUEUE: every agent carries its open count, so eleven agents is a worklist rather than eleven doors, and length only becomes a problem when the rows say nothing. IT COLLAPSES TO A RAIL: structural responsiveness rather than fluid type, the labels go, the icons stay, and the counts survive as presence dots. Each story below is the same component at a different roster size, so the claim is checkable rather than asserted.',
      },
    },
  },
  args: {
    active: 'issues',
    agentCount: SHIPPED_AGENT_COUNT,
    collapsed: false,
    onNavigate: action('navigate'),
    onToggleCollapsed: action('toggle collapsed'),
  },
  argTypes: {
    agentCount: { control: { type: 'range', min: 1, max: AGENTS.length, step: 1 } },
  },
} satisfies Meta<typeof SideNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeAgents: Story = {
  args: { agentCount: SHIPPED_AGENT_COUNT, collapsed: false },
  render: (args) => (
    <NavFrame key={`${args.agentCount}`} agentCount={args.agentCount} initialCollapsed={false} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Today: the three shipped agents, read from the roster rather than typed in, so this story tracks the product. At this size the section label and its count look like decoration; the next two stories are what they are for.',
      },
    },
  },
};

export const SixAgents: Story = {
  args: { agentCount: 6, collapsed: false },
  render: (args) => (
    <NavFrame key={`${args.agentCount}`} agentCount={args.agentCount} initialCollapsed={false} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Double the roster, and the shape has not changed: no new level of nesting, no disclosure, and Preferences is still exactly where it was. This is the size where a nested "Agents" tree starts costing a click per visit, and where the flat list stops looking like a stylistic choice.',
      },
    },
  },
};

export const ElevenAgents: Story = {
  args: { agentCount: AGENTS.length, collapsed: false },
  render: (args) => (
    <NavFrame key={`${args.agentCount}`} agentCount={args.agentCount} initialCollapsed={false} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The full roster in a 720px frame, which is where the scroll finally engages. Watch what does NOT move: Sessions stays above, the account block and Preferences stay below, and only the agent list travels. "Add agent" scrolls with the group it grows, so the answer to "where does the next one go" is visible in place rather than parked in a header.',
      },
    },
  },
};

export const CollapsedRail: Story = {
  args: { agentCount: AGENTS.length, collapsed: true },
  render: (args) => (
    <NavFrame key={`${args.agentCount}-rail`} agentCount={args.agentCount} initialCollapsed />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The 52px rail with all eleven agents. In the app this state is reached two ways, the toggle at the bottom and any window under 1080px, and the narrow window wins whatever the toggle says because the content plane needs the width more than the labels do. The group label is replaced by a hairline rule, since a truncated word is worse than a divider, and every count becomes a dot with the number kept in the tooltip. Use the collapse control at the bottom to expand it and watch the width transition.',
      },
    },
  },
};
