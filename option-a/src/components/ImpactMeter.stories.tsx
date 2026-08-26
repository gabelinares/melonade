import type { Meta, StoryObj } from '@storybook/react-vite';
import { impactLevel } from '@shared/issues-data.ts';
import { ImpactMeter } from './ImpactMeter.tsx';

/* The level is DERIVED from the score, so the stories are written as scores.
   Passing a level in would let a callsite disagree with the sort order. */
const SCORES = [71, 33, 12] as const;

const meta = {
  title: 'Components/ImpactMeter',
  component: ImpactMeter,
  args: { value: 71, compact: false },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
} satisfies Meta<typeof ImpactMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {
  args: { value: 71 },
  parameters: {
    docs: {
      description: {
        story:
          'Three bars in red, at the top of the 45-and-above band. The word sits beside the bars on purpose: the live app hides the level behind a tooltip, and a reader with no legend cannot tell two filled bars from three.',
      },
    },
  },
};

export const Medium: Story = {
  args: { value: 33 },
  parameters: {
    docs: {
      description: {
        story:
          'The 25 to 44 band. Amber rather than a lighter red, so the middle of the scale is a different hue and not merely a dimmer alarm, which is the distinction that survives being printed or read by someone colour-blind.',
      },
    },
  },
};

export const Low: Story = {
  args: { value: 12 },
  parameters: {
    docs: {
      description: {
        story:
          'One grey bar. Low impact gets no hue at all: colouring the bottom of the scale would mean every row on the page carries a colour, and then none of them read as urgent.',
      },
    },
  },
};

export const Compact: Story = {
  args: { value: 71, compact: true },
  parameters: {
    docs: {
      description: {
        story:
          'Bars only, for a context that has already said the word somewhere else. It is off by default because dropping the label is a real loss of meaning, so a caller has to ask for it rather than get it by accident.',
      },
    },
  },
};

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      {SCORES.map((score) => (
        <div key={score} style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
          <ImpactMeter value={score} />
          <span
            style={{
              fontSize: 'var(--m-text-2xs)',
              color: 'var(--m-content-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            score {score} · {impactLevel(score)}
          </span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The three bands side by side with their raw scores, which is the only view that proves the steps are distinguishable at 13px without a legend. The thresholds shown here come from the shared logic, so this story fails visibly if anyone moves them.',
      },
    },
  },
};
