import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { entryOf, translate } from '@shared/sessions-logic.ts';
import { useSessions } from '../state/useSessions.ts';
import { SessionsPage } from './SessionsPage.tsx';

type Preset = 'empty-search' | 'sequence' | 'translated' | 'bookmarks' | 'loading' | 'no-data';

/** The page takes its controller as a prop, so a story owns one and drives it
 *  through the REAL verbs. Every preset below is reached the way somebody
 *  reaches it in the app - addFilter, moveEvent, setEventsOrder - so a story
 *  cannot show a state the app cannot produce. */
function PageHarness({ preset }: { preset: Preset }) {
  const model = useSessions();

  useEffect(() => {
    if (preset === 'loading') return model.setDataState('loading');
    if (preset === 'no-data') return model.setDataState('empty');
    if (preset === 'bookmarks') return model.setTab('bookmarks');
    if (preset === 'sequence') {
      /* Two events and a property: the shape that shows every difference
         between the two kinds at once - number, handle, order control, and an
         operator on the row that has one. */
      const click = entryOf('click');
      const checkout = entryOf('checkout_start');
      const country = entryOf('userCountry');
      if (click) model.addFilter(click);
      if (checkout) model.addFilter(checkout);
      if (country) model.addFilter(country);
      return undefined;
    }
    if (preset === 'translated') {
      model.addFilters(translate('paid users on mobile who hit an error').filters);
      return undefined;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--m-surface-canvas)' }}>
      <div style={{ flex: 1, minWidth: 0, padding: 'var(--m-space-5)' }}>
        <SessionsPage model={model} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Sessions/SessionsPage',
  component: PageHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The sessions page, rebuilt from the production one on 2026-09-02. Two changes carry it, and both are drawn from the same constraint: nothing here may need a field the list payload does not already carry.\n\nFIRST, the search is ONE button and ONE list. Production has two "+ Add" buttons under two headings, opening the same picker with half the catalogue each — so you had to know whether the thing you wanted was an event or a property before you could look for it. The store never split them: `searchStore.instance.filters` is one array with `isEvent` on every item. The two kinds are still obvious from the rows rather than from a heading over them — an event has a number, a drag handle and a property affordance; a property has an operator and a value.\n\nSECOND, the list is a table. Production draws each session as an 84px four-zone card in which no two rows put a figure in the same place. A table lines the figures up, lets the columns sort, and finally shows `errorsCount` and `pagesCount` — both of which are in the payload today and drawn nowhere.\n\nThe full inventory of what the production page does, and which parts of it are free, cheap or expensive to change, is in `context/sessions-feature-inventory-2026-09-02.md`.',
      },
    },
  },
  args: { preset: 'empty-search' },
  argTypes: {
    preset: {
      control: 'select',
      options: ['empty-search', 'sequence', 'translated', 'bookmarks', 'loading', 'no-data'],
    },
  },
} satisfies Meta<typeof PageHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptySearch: Story = {
  args: { preset: 'empty-search' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'The page as it opens. The search is one line — a button, a sentence about what the field takes, and three examples — because an empty search is not an empty state: nothing is wrong and nothing is missing.\n\nThe three examples are there because the field accepts prose as well as filter names, and a field that accepts prose has to show the shape of prose it accepts. All three actually translate; an example that came back empty would be worse than no examples. Click one and watch what it becomes: real, editable rows, not a result set.',
      },
    },
  },
};

export const Sequence: Story = {
  args: { preset: 'sequence' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'Two events and a property in one list, which is the shape worth reviewing.\n\nThe events are numbered and draggable and the property is not, because only the events have an order — that is the whole reason `eventsOrder` exists. Drag the second event above the first and the numbers follow; the property never moves, because it has no position to move to.\n\nThe order control appears at two events and not at one: with a single event there is no gap for an operator to sit in. It is the same one value the backend takes for the whole search, and it is reworded from "Events Order: THEN" to "matching then" — the first is the column name, the second is English. Switch it between then, and, or and watch the count change: they are three different questions.\n\nHover a row for its handle, its property affordance and its remove. Click the subject to re-pick it and the picker opens at that row\'s own category, which is production\'s behaviour and the reason a mis-picked filter costs one click.',
      },
    },
  },
};

export const Translated: Story = {
  args: { preset: 'translated' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          '“paid users on mobile who hit an error”, read as a search.\n\n`aiFiltersStore` has existed in production for as long as the string "Translating your query into search steps…" has, and nothing on the sessions bar ever opened it. Here it is the same field as everything else: type two or more words into the picker and it offers to read them, showing the steps it understood and the words it could not use before you accept.\n\nWhat comes back is ordinary rows. That is the point — you can see what it understood, correct the one clause it got wrong, and keep the rest. A translator whose output you cannot edit is a search box you cannot trust.',
      },
    },
  },
};

export const Bookmarks: Story = {
  args: { preset: 'bookmarks' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'The bookmarked sessions — Vault, on enterprise. It is a TAB rather than a filter, because it is a different list of the same thing and it has its own route in production. A section replaces the body; a filter narrows it.\n\nEverything else keeps working inside it: the search, the columns, the date range, the order. That is what makes it a tab and not a second page.',
      },
    },
  },
};

export const Loading: Story = {
  args: { preset: 'loading' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'Fetching. The header, the tabs, the toolbar and the search all stay exactly where they are and only the body changes, so nobody loses their place when the data arrives. The skeleton is the same component the other two lists use.',
      },
    },
  },
};

export const NoData: Story = {
  args: { preset: 'no-data' },
  render: (args) => <PageHarness key={args.preset} preset={args.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'A project that has never recorded. The empty state names the situation and says what happens next rather than reporting "no results" — which is the one thing the reader can already see.',
      },
    },
  },
};
