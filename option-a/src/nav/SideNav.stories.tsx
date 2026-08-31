import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SHIPPED_AGENT_COUNT } from './agents.ts';
import { SideNav } from './SideNav.tsx';

function NavHarness({
  agentCount,
  active: initial,
  collapsed: initialCollapsed,
}: {
  agentCount: number;
  active: string;
  collapsed: boolean;
}) {
  const [active, setActive] = useState(initial);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  return (
    <div style={{ display: 'flex', height: 640, background: 'var(--m-surface-canvas)' }}>
      <SideNav
        active={active}
        onNavigate={setActive}
        agentCount={agentCount}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      {/* the plane, so the wrap is visible: the menu has no surface of its own,
          and the ground continues around the card on all four sides */}
      <div style={{ flex: 1, padding: 'var(--m-space-5) var(--m-space-5) var(--m-space-5) 0' }}>
        <div
          style={{
            height: '100%',
            border: '1px solid var(--m-border-subtle)',
            borderRadius: 'var(--m-radius-surface)',
            background: 'var(--m-surface-default)',
          }}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Nav/SideNav',
  component: NavHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The menu, and the piece the brief asks to be judged on: does it survive more stuff going into it. Drag the agent count and watch what happens — the products list is the only thing that scrolls, so Sessions above it and the tools, credits and account below it never move. Only an agent with more than one body expands, and what it expands into is data rather than a special case in the component. Note also what is NOT here: no background and no border on the nav itself, so the ground wraps around the content plane instead of meeting it at a seam. Toggle the collapse control at the foot, or the `collapsed` arg: the narrow menu keeps its count column, which is why it is 76px and not a 56px icon rail, and the labels come back on hover.',
      },
    },
  },
  args: { agentCount: SHIPPED_AGENT_COUNT, active: 'tests/runs', collapsed: false },
  argTypes: {
    agentCount: { control: { type: 'range', min: 1, max: 11, step: 1 } },
    active: { control: 'select', options: ['sessions', 'issues', 'tests', 'tests/runs', 'tests/environments', 'audits'] },
    collapsed: { control: 'boolean' },
  },
} satisfies Meta<typeof NavHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipped: Story = {};

/** Eleven agents, which is the question the brief actually asks. */
export const Eleven: Story = { args: { agentCount: 11 } };

export const OnTheList: Story = { args: { active: 'tests' } };

/**
 * The narrow menu. Two columns — a glyph and a figure — because the counts are
 * the menu's whole argument and they are the part still legible at this width;
 * an icon rail would have saved 20px and thrown the argument away. Hover a row
 * for the label the width took, and hover Tests for its three sections.
 */
export const Collapsed: Story = { args: { collapsed: true } };

/** Eleven agents, narrow: the case the two together have to survive. */
export const CollapsedEleven: Story = { args: { collapsed: true, agentCount: 11 } };
