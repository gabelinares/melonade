import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import {
  DEFAULT_FILTERS,
  INITIAL_STATE,
  activeFilters,
  type ActiveFilterChip,
} from '@shared/issues-logic.ts';
import { ActiveFilters } from './ActiveFilters.tsx';

/** Chips derived the way the page derives them, so the dimension names and the
 *  ordering are the real ones rather than a plausible-looking transcription. */
const chipsFor = (filters: Partial<typeof DEFAULT_FILTERS>): ActiveFilterChip[] =>
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
      /* the width of the list header this bar spans, so wrapping and truncation
         happen at the width they happen at in the app */
      <div style={{ width: 640, padding: 'var(--m-space-4)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The applied filters, spelled out and individually removable. This is the price of collapsing five controls into one icon and it is not optional: a funnel button can say "3 applied" but never which three, so without this bar the answer to "why is my list short" lives behind a click. Every chip names its dimension as well as its value, because "High" alone stops being unambiguous the moment both Impact and Critical have options.',
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
          'Renders nothing at all, and that is correct rather than a missing empty state. The bar exists to answer a question the reader only has once they have filtered; with no filters applied there is no question, and a persistent "no filters" strip would spend a row of vertical space on the state that needs it least. The row count is not shown here either, because it belongs to the filters: on its own it is just the length of the list you can already see.',
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
          'One filter, and the result count beside it. The count is what makes the bar a reading rather than a receipt: it says what the filter did, so "High, 4 issues" is a finding and not just a label. Clicking the chip removes that one value, so undoing a single decision never means clearing the set.',
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
          'Eight chips, which is what a real triage session looks like by the third question. The row wraps rather than scrolling sideways, because a horizontal scroller hides applied filters behind an edge and hidden filter state is the exact failure this component was added to prevent. "Clear all" stays last so it never sits where a chip was a moment ago, since the two actions differ by seven filters.',
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
          'A segment named by whoever saved it, next to a short chip. The value truncates and the dimension label never does, because "Found in" is what makes the chip readable while it is truncated, and the value stays reachable through the chip\'s accessible name. The alternative, letting the chip size to its text, would push the count and "Clear all" off the row: one long segment name would cost the reader the two things the bar is for.',
      },
    },
  },
};
