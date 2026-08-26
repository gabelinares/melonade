import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { screen, userEvent, within } from 'storybook/test';
import {
  DEFAULT_FILTERS,
  INITIAL_STATE,
  activeFilters,
  filterDimensions,
  isFilterValueActive,
  toggleFilterValue,
  type Filters,
} from '@shared/issues-logic.ts';
import { FilterMenu } from './FilterMenu.tsx';

/**
 * A story that only rendered the trigger would prove nothing: everything worth
 * reviewing in this component is inside a popover that has to be opened, and
 * every count in it is derived from the filters currently applied.
 *
 * So the harness holds real `Filters` in state and rebuilds the dimensions from
 * `filterDimensions()` on every change, exactly as the page does. Ticking
 * "Errors" here genuinely re-counts every other option, which is the behaviour
 * a hand-written fixture would quietly fake.
 */
function FilterMenuHarness({ initialFilters }: { initialFilters: Filters }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const state = useMemo(() => ({ ...INITIAL_STATE, filters }), [filters]);
  const dimensions = useMemo(() => filterDimensions(state), [state]);
  const count = useMemo(() => activeFilters(state).length, [state]);

  return (
    /* right-aligned in a toolbar-width strip, because the menu opens from the
       trigger's right edge and a centred trigger would show it hanging off the
       wrong side of the control */
    <div style={{ width: 340, display: 'flex', justifyContent: 'flex-end', padding: 'var(--m-space-4)' }}>
      <FilterMenu
        dimensions={dimensions}
        activeCount={count}
        isActive={(key, value) => isFilterValueActive(filters, key, value)}
        onToggle={(key, value) => {
          action('toggle')(key, value);
          setFilters((f) => toggleFilterValue(f, key, value));
        }}
      />
    </div>
  );
}

/** The trigger, by its accessible name, which changes once filters are applied.
 *  Matching on the prefix keeps one helper working for both. */
const openMenu = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: /^Filters/ }));
  /* the panel is portalled out of the story root, so it is found on the screen
     rather than on the canvas */
  return screen.findByRole('textbox', { name: 'Search filters' });
};

const meta = {
  title: 'Components/FilterMenu',
  component: FilterMenuHarness,
  args: { initialFilters: DEFAULT_FILTERS },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'One control for every filter, in place of the three sibling dropdowns it replaces. Three buttons was not three times the power of one: each had to be opened to find out whether it held anything, none could show a count against an option, and a sixth filter meant finding another 90px on a toolbar row that had already started wrapping. The stories below open the menu, because a closed popover is not a review of anything.',
      },
    },
  },
} satisfies Meta<typeof FilterMenuHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The whole filter surface at rest: one 24px icon button. That is the claim this component makes and the reason the applied filters have to render as chips beside it, since a single funnel can say "3 applied" but never which three.',
      },
    },
  },
};

export const WithActiveCount: Story = {
  args: {
    initialFilters: { ...DEFAULT_FILTERS, impact: ['High'], tags: ['Checkout'], origins: ['full'] },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The badge counts applied VALUES, not dimensions, so three chips read as three. It also inverts the trigger rather than just adding a number, because a small numeral on an unchanged button is easy to miss on a toolbar and "why is my list short" is the most expensive question this page can produce.',
      },
    },
  },
};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
  },
  parameters: {
    docs: {
      description: {
        story:
          'The root list, opened by the story so the structure is visible without a click. Five dimensions as rows rather than five accordions: the menu stays one screen tall at any number of dimensions, and adding a sixth costs a row here instead of 90px of toolbar. Each row shows how many of its own values are applied, so the answer to "is there anything set in Tags" does not require opening Tags.',
      },
    },
  },
};

export const DimensionOpen: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    await userEvent.click(await screen.findByRole('button', { name: 'Tags' }));
  },
  parameters: {
    docs: {
      description: {
        story:
          'One dimension drilled into, which is where the counts earn the two-level shape. Every option carries its count computed with the other filters still applied, so "Payment 2" tells you what applying it will cost before you apply it. Options that currently match nothing stay in the list, just quieter: a menu that changes shape as you use it is harder to learn than one with a zero in it. The header turns into a labelled back control, so the way out is in the place the way in was.',
      },
    },
  },
};

export const Searching: Story = {
  play: async ({ canvasElement }) => {
    const field = await openMenu(canvasElement);
    await userEvent.type(field, 'checkout');
  },
  parameters: {
    docs: {
      description: {
        story:
          'Typing flattens the tree into one list across every dimension, and the results prove the point: "checkout" returns the Checkout tag and the Billing & checkout segment together, each labelled with the dimension it came from. This is the thing three separate dropdowns structurally cannot do, because it requires knowing which dropdown a value lives in before you can search it, which is exactly the question the search exists to remove.',
      },
    },
  },
};

export const FieldPadding: Story = {
  play: async ({ canvasElement }) => {
    const field = await openMenu(canvasElement);
    field.focus();
  },
  parameters: {
    docs: {
      description: {
        story:
          'The search field, open and focused, so its left inset can be measured rather than assumed. The rule: the placeholder and the caret must clear the field\'s own visible edge, because a borderless input inside a bordered panel has no second frame to hide behind. This story exists because a 1px gap shipped here and went unnoticed for weeks, and it went unnoticed precisely because the component had no story for the automated field audit to walk.',
      },
    },
  },
};
