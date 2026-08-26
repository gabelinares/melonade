import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import {
  DEFAULT_FILTERS,
  INITIAL_STATE,
  activeFilters,
  type ActiveFilterChip,
  type Filters,
} from '@shared/issues-logic.ts';
import { ActiveFilters } from './ActiveFilters.tsx';

/** Chips derived the way the column derives them, so the dimension names and the
 *  ordering are the real ones and not a plausible-looking transcription. */
const chipsFor = (filters: Partial<Filters>): ActiveFilterChip[] =>
  activeFilters({ ...INITIAL_STATE, filters: { ...DEFAULT_FILTERS, ...filters } });

const meta = {
  title: 'Components/ActiveFilters',
  component: ActiveFilters,
  args: {
    chips: chipsFor({ impact: ['High'] }),
    resultCount: 4,
    onRemove: action('remove'),
    onClearAll: action('clearAll'),
  },
  decorators: [
    (Story) => (
      /* the width of the list column this bar sits in, so wrapping and
         truncation happen where they happen in the app rather than never */
      <div style={{ width: 380, padding: 'var(--m-space-4)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The applied filters, spelled out and individually removable. This is the price of collapsing five controls into one icon and it is not optional: a funnel button can say "3 applied" but never which three, so without this bar the answer to "why is my list short" lives behind a click. Each chip names its dimension as well as its value, because "High" stops being unambiguous the moment both Impact and Critical have options. In a narrow list column the bar is also the only place the filter state is legible at all, which is why it wraps rather than scrolls.',
      },
    },
  },
} satisfies Meta<typeof ActiveFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { chips: [], resultCount: 12 },
  parameters: {
    docs: {
      description: {
        story:
          'Renders nothing at all, and that is correct rather than a missing empty state. The bar answers a question the reader only has once they have filtered; with nothing applied there is no question, and a permanent "no filters" strip would spend a row of a narrow column on the state that needs it least. The count goes with it, because on its own a row count is just the length of the list already on screen.',
      },
    },
  },
};

export const OneChip: Story = {
  args: { chips: chipsFor({ impact: ['High'] }), resultCount: 4 },
  parameters: {
    docs: {
      description: {
        story:
          'One filter with its result count beside it. The count is what makes this a reading rather than a receipt: it says what the filter did, so "High, 4 issues" is a finding and not a label. Clicking the chip removes that one value, so undoing a single decision never costs you the whole set.',
      },
    },
  },
};

export const ManyChips: Story = {
  args: {
    chips: chipsFor({
      cats: ['Errors'],
      impact: ['High', 'Medium'],
      tags: ['Checkout', 'Payment'],
      origins: ['full', 1],
      critical: ['mine'],
    }),
    resultCount: 2,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Eight chips at column width, which is what a real triage session looks like by the third question. The row wraps onto as many lines as it needs rather than scrolling sideways, because a horizontal scroller hides applied filters behind an edge and hidden filter state is the exact failure this component was added to prevent. "Clear all" stays last so it never lands where a chip was a moment ago, since the two actions differ by seven filters.',
      },
    },
  },
};

export const LongValue: Story = {
  args: {
    chips: [
      { key: 'origins', value: '9', dimension: 'Found in', label: 'Mobile Safari sessions that reached the payment step' },
      { key: 'impact', value: 'High', dimension: 'Impact', label: 'High' },
    ],
    resultCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A segment named by whoever saved it, beside a short chip. The value truncates and the dimension label never does, because "Found in" is what keeps the chip readable while it is cut off, and the full value stays reachable through the chip\'s accessible name. Letting the chip size to its text is the alternative and it fails here: at 380px one long segment name would push the count and "Clear all" off the row, costing the reader both things the bar is for.',
      },
    },
  },
};
