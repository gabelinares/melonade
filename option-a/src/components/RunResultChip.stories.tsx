import type { Meta, StoryObj } from '@storybook/react-vite';
import type { RunStatus } from '@shared/runs-data.ts';
import { RunResultChip } from './RunResultChip.tsx';

const ALL: RunStatus[] = ['running', 'failed', 'passed'];

const meta = {
  title: 'Components/RunResultChip',
  component: RunResultChip,
  args: { status: 'failed' },
  argTypes: { status: { control: 'inline-radio', options: ALL } },
  parameters: {
    docs: {
      description: {
        component:
          'How a run came out. All three states are toned here, which is the opposite of the choice the tests list makes one tab over — and the difference is what the two columns are for. A test’s status is a lifecycle, and most rows being Active means colouring them all reports nothing. A run’s status is the single fact its row exists to deliver, and a log is scanned for the failures in it. The icon keeps the outcome readable without relying on colour, which matters most in exactly this column.',
      },
    },
  },
} satisfies Meta<typeof RunResultChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {ALL.map((s) => (
        <RunResultChip key={s} status={s} />
      ))}
    </div>
  ),
};

export const Playground: Story = {};
