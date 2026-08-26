import type { Meta, StoryObj } from '@storybook/react-vite';
import { Split } from 'lucide-react';
import { Chip } from './Chip.tsx';

/* One chip, five tones. The stories are laid out tone by tone because the rule
   worth checking is not "does it render" but "does an untoned chip still read as
   a label rather than a status". */
const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: 'Checkout', tone: 'neutral', iconOnly: false },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'danger', 'warning', 'success', 'info'],
    },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: { tone: 'neutral' },
  parameters: {
    docs: {
      description: {
        story:
          'The default, and the one used for tags and plan names. A tag is not a status, so it gets no colour at all: reserving tint for meaning is what keeps a row of five tags from reading as five warnings.',
      },
    },
  },
};

export const Danger: Story = {
  args: { tone: 'danger', children: 'Critical' },
  parameters: {
    docs: {
      description: {
        story:
          'Reserved for something a person has to act on. In the Issues list this tone appears at most once per row, on the critical flag, so its rarity is what makes it legible.',
      },
    },
  },
};

export const Warning: Story = {
  args: { tone: 'warning', children: 'Slowness' },
  parameters: {
    docs: {
      description: {
        story:
          'Degraded, not broken. It exists so the danger tone does not have to stretch to cover both, which is how a palette ends up with one alarm colour and no way to say "worth a look".',
      },
    },
  },
};

export const Success: Story = {
  args: { tone: 'success', children: 'Resolved' },
  parameters: {
    docs: {
      description: {
        story:
          'Rarely correct in a triage product. A green chip on a session row would read as "this session went well", which is the opposite of what a row on an issue is reporting, so metadata uses the neutral tone instead.',
      },
    },
  },
};

export const Info: Story = {
  args: { tone: 'info', children: 'Billing & checkout' },
  parameters: {
    docs: {
      description: {
        story:
          'The single accent tone, carried by the teal. It marks provenance rather than severity, which is why the origin badge uses it: where something was captured is a fact, not a problem.',
      },
    },
  },
};

export const IconOnly: Story = {
  args: { iconOnly: true, tone: 'info', children: <Split size={11} aria-hidden="true" /> },
  parameters: {
    docs: {
      description: {
        story:
          'A square 20px chip with the label removed. It exists so a per-row marker such as the origin badge costs the Tags column the width of one glyph instead of a word, and so the caller cannot invent a second, smaller chip to fit.',
      },
    },
  },
};

export const Overflow: Story = {
  args: {
    children: 'Payment declined during checkout on mobile Safari with a saved card',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 168, border: '1px dashed var(--m-border-default)', padding: 4 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Label far longer than its container, inside a 168px box that stands in for the Tags column. The chip clips with an ellipsis and keeps its 20px height rather than wrapping to two lines, because a wrapping chip would push the 38px table row taller and break the alignment of every other column.',
      },
    },
  },
};
