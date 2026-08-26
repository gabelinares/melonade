import type { Meta, StoryObj } from '@storybook/react-vite';
import { RelativeTime } from './RelativeTime.tsx';

const LADDER = [0, 5, 45, 200, 1500, 5000, 20000] as const;

const meta = {
  title: 'Components/RelativeTime',
  component: RelativeTime,
  args: { minutesAgo: 45 },
  argTypes: { minutesAgo: { control: { type: 'number', min: 0 } } },
} satisfies Meta<typeof RelativeTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ladder: Story = {
  render: () => (
    <table style={{ borderCollapse: 'collapse', fontSize: 'var(--m-text-xs)' }}>
      <tbody>
        {LADDER.map((m) => (
          <tr key={m}>
            <td
              style={{
                padding: '4px 16px 4px 0',
                color: 'var(--m-content-muted)',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}
            >
              {m} min
            </td>
            <td style={{ padding: '4px 0' }}>
              <RelativeTime minutesAgo={m} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Every threshold on one screen: just now, minutes, hours, days, and then an absolute date once the relative form stops helping. Reading them as a ladder is how you catch a boundary that reads wrong, such as "1440m ago" or a "7d ago" that should already be a date. Past a week the label switches to a real date because "23d ago" asks the reader to do arithmetic to answer a question they were about to ask anyway.',
      },
    },
  },
};

export const Single: Story = {
  args: { minutesAgo: 200 },
  parameters: {
    docs: {
      description: {
        story:
          'One value, with the exact timestamp on hover. Relative on the surface and absolute underneath is the split that lets a triage list stay scannable while still answering "when exactly", and both strings come from the shared data layer so a list and a detail page can never disagree.',
      },
    },
  },
};
