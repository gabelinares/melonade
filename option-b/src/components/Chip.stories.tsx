import type { Meta, StoryObj } from '@storybook/react-vite';
import { Split } from 'lucide-react';
import { Chip } from './Chip.tsx';

/* One chip, five tones, and a second axis that matters more than the tones do.
   The stories are laid out tone by tone because the rule worth checking is not
   "does it render" but "does an untoned chip still read as a label rather than a
   status". */
const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: 'Checkout', tone: 'neutral', quiet: false },
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
  args: { tone: 'danger', children: 'Yours' },
  parameters: {
    docs: {
      description: {
        story:
          'Reserved for something a person has to act on, or own. It appears at most once in any view, which is what makes it legible: in the critical dialog it marks the description that is yours, and in a list row it never appears at all.',
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
          'Rarely correct in a triage product. A green chip on a session row would read as "this session went well", which is the opposite of what a row on an issue is reporting, so session metadata uses the neutral tone instead.',
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
          'The accent tone, carried by the plum. It marks provenance rather than severity, which is why it shares the ramp with selection: where something was captured is a fact, not a problem, and it should look like the thing you chose rather than like a warning.',
      },
    },
  },
};

export const Quiet: Story = {
  args: { quiet: true, children: 'Errors' },
  parameters: {
    docs: {
      description: {
        story:
          'The label with the container removed, and the reason it exists is arithmetic. A list row carries three or four pieces of metadata at once: the category, where it was found, when it was last seen, and sometimes "Hidden". Four filled pills on one line is a texture rather than information, and it makes the row look busier than the title it is annotating. Quiet keeps the component (so the metadata cannot drift into a hand-rolled span) and drops the fill. A quiet chip with a tone keeps its colour in the text, since it no longer has a fill to carry it.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: { tone: 'info', icon: <Split size={11} />, children: 'Billing & checkout' },
  parameters: {
    docs: {
      description: {
        story:
          'A leading glyph, sized by the chip rather than by the caller, and held at 75% opacity so it annotates the label instead of competing with it. The pattern it serves is origin: a segment and full traffic need to be distinguishable at a glance in a meta line, and two words that both start with a capital letter are not.',
      },
    },
  },
};

export const Overflow: Story = {
  args: {
    children: 'Payment declined during checkout on mobile Safari with a saved card',
    title: 'Payment declined during checkout on mobile Safari with a saved card',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 180, border: '1px dashed var(--m-border-default)', padding: 4 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'A label far longer than its container, in a 180px box standing in for the width a chip actually gets inside a 400px list column. It clips with an ellipsis and holds its 22px height rather than wrapping, because a wrapping chip would push the row past the 68px `row-height` that the loading skeleton is built to match, and the column would then jump when data lands. `title` carries the full text, so nothing is lost, it is just not shown.',
      },
    },
  },
};
