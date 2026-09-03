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
          'The menu, and the piece the brief asks to be judged on: does it survive more stuff going into it. Drag the agent count and watch what happens — the three groups scroll together, so the logo and the switcher above them and the tools and credits below never move.\n\nTHE SHAPE IS GABRIEL\'S, 2026-09-03, drawing out Mehdi\'s 09-02 ask for product-named groups and sub-menus. Three groups: an unlabelled one (Search, Sessions, Highlights), then Agents, then Product. ⚠ TABS ARE NOT IN HERE — only subitems. Synthetics is one row and its Tests / Runs / Environments strip stays on its page, which is why the only expanding row in the whole column is Analytics, holding Data Management and Dashboards. The groups are named again because a bare rule can say that a category changed and not what it changed to; that argument only held while there was one group.\n\nThe collapse moved to the top right corner, opposite the mark: every control in the foot opens something, and this one reshapes the thing they all sit in. Narrow, the brand row becomes the control — 52px does not hold a mark and a button, and a collapsed menu whose only way out is a keyboard shortcut is a trap.\n\nNote also what is NOT here: no background and no border on the nav itself, so the ground wraps around the content plane instead of meeting it at a seam.',
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
 * for the label the width took, and hover Analytics for its two subitems -
 * which is the only card in the column now, because it is the only row with
 * anything under it.
 */
export const Collapsed: Story = { args: { collapsed: true } };

/** Eleven agents, narrow: the case the two together have to survive. */
export const CollapsedEleven: Story = { args: { collapsed: true, agentCount: 11 } };
