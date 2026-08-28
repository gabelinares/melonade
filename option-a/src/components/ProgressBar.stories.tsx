import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar.tsx';

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  args: { value: 38, label: 'Mobile visitors — July is still running' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
  parameters: {
    docs: {
      description: {
        component:
          'A job in flight, with the number deliberately left off. An audit reads a sample of sessions and its duration is genuinely unknowable, so a percentage would be a promise the agent cannot keep. The bar says "still working", which is the only honest thing there is to say; the accessible name carries the position for anyone who wants it.',
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 160 }}>
      {[8, 38, 74, 96].map((v) => (
        <ProgressBar key={v} value={v} label={`${v} per cent`} />
      ))}
    </div>
  ),
};

export const Playground: Story = {};
