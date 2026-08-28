import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SHIPPED_AGENT_COUNT } from './agents.ts';
import { SideNav } from './SideNav.tsx';

function NavHarness({ agentCount, active: initial }: { agentCount: number; active: string }) {
  const [active, setActive] = useState(initial);
  return (
    <div style={{ display: 'flex', height: 640, background: 'var(--m-surface-nav)' }}>
      <SideNav active={active} onNavigate={setActive} agentCount={agentCount} />
      {/* the plane, so the wrap is visible: the menu has no surface of its own,
          and the ground continues around the card on all four sides */}
      <div style={{ flex: 1, padding: 'var(--m-space-5) var(--m-space-5) var(--m-space-5) 0' }}>
        <div
          style={{
            height: '100%',
            border: '1px solid var(--m-border-subtle)',
            borderRadius: 'var(--m-radius-lg)',
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
          'The menu, and the piece the brief asks to be judged on: does it survive more stuff going into it. Drag the agent count and watch what happens — the products list is the only thing that scrolls, so Home and Sessions above it and the tools, credits and account below it never move. Only an agent with more than one body expands, and what it expands into is data rather than a special case in the component. Note also what is NOT here: no background and no border on the nav itself, so the ground wraps around the content plane instead of meeting it at a seam.',
      },
    },
  },
  args: { agentCount: SHIPPED_AGENT_COUNT, active: 'tests/runs' },
  argTypes: {
    agentCount: { control: { type: 'range', min: 1, max: 11, step: 1 } },
    active: { control: 'select', options: ['home', 'sessions', 'issues', 'tests', 'tests/runs', 'tests/environments', 'audits'] },
  },
} satisfies Meta<typeof NavHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipped: Story = {};

/** Eleven agents, which is the question the brief actually asks. */
export const Eleven: Story = { args: { agentCount: 11 } };

export const OnTheList: Story = { args: { active: 'tests' } };
