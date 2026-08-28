import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { Bug, FlaskConical } from 'lucide-react';
import { NavItem } from './NavItem.tsx';

const meta = {
  title: 'Nav/NavItem',
  component: NavItem,
  args: { icon: <Bug size={15} />, label: 'Issues', count: 11, onClick: action('navigate') },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'One nav row. The count is the reason it exists: the menu doubles as the queue, so you can see which agent has work without opening it — that is what makes a growing list of agents useful rather than merely long. The caret is its own control: the row goes to the agent, the caret opens its sections without going anywhere, because a disclosure that also navigates makes it impossible to look inside something without leaving where you are.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 216, background: 'var(--m-surface-nav)', padding: 'var(--m-space-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 1 }}>
      <NavItem icon={<Bug size={15} />} label="Issues" count={11} onClick={action('issues')} />
      <NavItem icon={<Bug size={15} />} label="Issues, active" count={11} active onClick={action('issues')} />
      <NavItem icon={<FlaskConical size={15} />} label="Regressions" badge="Soon" onClick={action('soon')} />
    </div>
  ),
};

/** An agent with more than one body under its name. */
export const WithSections: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [on, setOn] = useState('tests/runs');
    return (
      <div style={{ display: 'grid', gap: 1 }}>
        <NavItem
          icon={<FlaskConical size={15} />}
          label="Tests"
          count={7}
          expandable
          expanded={open}
          onToggle={() => setOpen((v) => !v)}
          onClick={() => setOn('tests')}
          active={on === 'tests' && !open}
        />
        {open && (
          <div
            style={{
              display: 'grid',
              gap: 1,
              marginLeft: 'var(--m-space-6)',
              paddingLeft: 'var(--m-space-6)',
              borderLeft: '1px solid var(--m-border-subtle)',
            }}
          >
            {[
              { key: 'tests', label: 'List' },
              { key: 'tests/runs', label: 'Runs' },
              { key: 'tests/environments', label: 'Environments' },
            ].map((s) => (
              <NavItem key={s.key} nested label={s.label} active={on === s.key} onClick={() => setOn(s.key)} />
            ))}
          </div>
        )}
      </div>
    );
  },
};

export const Playground: Story = {};
