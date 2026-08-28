import type { Meta, StoryObj } from '@storybook/react-vite';
import { HealthScore } from './HealthScore.tsx';

const meta = {
  title: 'Components/HealthScore',
  component: HealthScore,
  args: { score: 67 },
  argTypes: { score: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
  parameters: {
    docs: {
      description: {
        component:
          'An audit’s headline number, printed rather than metered. Impact on the issue queue is a rank and three bars say everything a reader needs; a health score is a finding that gets quoted in a meeting and compared against last month, so rounding it into three buckets would throw away the thing people came for. The band only decides the colour.',
      },
    },
  },
} satisfies Meta<typeof HealthScore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bands: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 28 }}>
      {[82, 67, 41].map((s) => (
        <HealthScore key={s} score={s} />
      ))}
    </div>
  ),
};

export const Playground: Story = {};
