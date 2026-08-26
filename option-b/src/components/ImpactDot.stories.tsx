import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImpactDot } from './ImpactDot.tsx';

/* The thresholds live in the shared data layer (>= 45 High, >= 25 Medium), so
   the args below are impact VALUES rather than levels. Passing a number is the
   point: no callsite gets to decide what counts as high. */
const meta = {
  title: 'Components/ImpactDot',
  component: ImpactDot,
  args: { value: 62, withLabel: false },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'One filled dot, three colours, and the interesting thing about it is what it is NOT. The denser option shows impact as a three-bar meter, because its list is an ungrouped table where every row has to carry its own rank. This list is grouped by impact band with a sticky header per band, so a meter on every row would repeat what the header just said, five or six times per group. The dot is a colour anchor for the band you are inside, not a reading you are meant to decode. It is also why the level word is off by default: the header is the label.',
      },
    },
  },
} satisfies Meta<typeof ImpactDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {
  args: { value: 62 },
  parameters: {
    docs: {
      description: {
        story:
          'Any impact of 45 or more. It shares the danger ramp with the critical flag, which is deliberate: high impact and "somebody said this matters" are the two reasons a row gets attention, and they should look related rather than compete.',
      },
    },
  },
};

export const Medium: Story = {
  args: { value: 34 },
  parameters: {
    docs: {
      description: {
        story:
          '25 to 44. Amber exists so high impact does not have to cover everything worth reading, which is how a ranking collapses into one alarm colour and a long tail nobody looks at.',
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
          'Under 25, and it is a neutral rather than a green. Green would read as "fine", and a low-impact issue is not fine, it is just further down the queue. Neutral says "ranked, not urgent" without making a claim about health.',
      },
    },
  },
};

export const WithLabel: Story = {
  args: { value: 62, withLabel: true },
  parameters: {
    docs: {
      description: {
        story:
          'The level spelled out, which happens in exactly one place: the detail pane meta line, where the row is on its own and there is no group header above it to say it. This is the switch that keeps the same component honest in both contexts instead of a second, wordier dot appearing next to the first.',
      },
    },
  },
};

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32 }}>
      {[62, 34, 12].map((value) => (
        <ImpactDot key={value} value={value} withLabel />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The three bands together, which is the only arrangement that tests the thing a dot has to survive: at 7px, colour is doing all the work. Read left to right the hues have to separate for a reader who cannot rely on them, which is why the label variant exists and why the accessible name always carries the level whether or not the word is drawn.',
      },
    },
  },
};
