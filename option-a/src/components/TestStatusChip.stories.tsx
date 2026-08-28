import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DisplayStatus } from '@shared/tests-data.ts';
import { TestStatusChip } from './TestStatusChip.tsx';

const ALL: DisplayStatus[] = ['draft', 'needs_review', 'approved', 'active', 'paused'];

const meta = {
  title: 'Components/TestStatusChip',
  component: TestStatusChip,
  args: { status: 'active' },
  argTypes: { status: { control: 'inline-radio', options: ALL } },
  parameters: {
    docs: {
      description: {
        component:
          'Five states, three tones. The production page tints all five, which on a list where most rows are Active means most rows carry a coloured chip — and colour that is on everything reports nothing. Here the accent is spent on the one row asking for a person, warning on the one that stopped, and the two idle states stay neutral.',
      },
    },
  },
} satisfies Meta<typeof TestStatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {ALL.map((s) => (
        <TestStatusChip key={s} status={s} />
      ))}
    </div>
  ),
};

export const Playground: Story = {};
