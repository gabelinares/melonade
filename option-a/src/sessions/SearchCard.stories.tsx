import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { entryOf, translate } from '@shared/sessions-logic.ts';
import { useSessions } from '../state/useSessions.ts';
import { SearchCard } from './SearchCard.tsx';

type Preset = 'empty' | 'one-event' | 'sequence' | 'properties' | 'nested' | 'segment' | 'pending';

/** The card wired to the real controller, so every state below is reached
 *  through the same verbs the page uses. */
function CardHarness({ preset }: { preset: Preset }) {
  const model = useSessions();

  useEffect(() => {
    const add = (id: string) => {
      const e = entryOf(id);
      if (e) model.addFilter(e);
    };
    switch (preset) {
      case 'one-event':
        add('click');
        break;
      case 'sequence':
        add('location');
        add('add_to_cart');
        add('checkout_start');
        break;
      case 'properties':
        model.addFilters(translate('paid users on mobile in France').filters);
        break;
      case 'nested':
        add('request');
        break;
      case 'segment':
        add('seg-118');
        add('userBrowser');
        break;
      case 'pending':
        add('userCity');
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  /* The `nested` preset needs a property ON the event, which is a second verb
     after the event exists. */
  useEffect(() => {
    if (preset !== 'nested') return;
    const ev = model.events[0];
    const status = entryOf('status');
    const method = entryOf('method');
    if (!ev || ev.properties?.length) return;
    if (status) model.addProperty(ev.key, status);
    if (method) model.addProperty(ev.key, method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, model.events.length]);

  return (
    <div style={{ padding: 'var(--m-space-6)', background: 'var(--m-surface-default)', maxWidth: 920 }}>
      <SearchCard
        events={model.events}
        properties={model.properties}
        eventsOrder={model.eventsOrder}
        onAdd={model.addFilter}
        onAddMany={model.addFilters}
        onReplace={model.replaceFilter}
        onUpdate={model.updateFilter}
        onRemove={model.removeFilter}
        onMoveEvent={model.moveEvent}
        onAddProperty={model.addProperty}
        onUpdateProperty={model.updateProperty}
        onRemoveProperty={model.removeProperty}
        onTogglePropertyOrder={model.togglePropertyOrder}
        onEventsOrder={model.setEventsOrder}
        onClear={model.clearSearch}
        rows={model.matched}
      />
      <p
        style={{
          marginTop: 'var(--m-space-5)',
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
          fontFamily: 'var(--m-font-num)',
        }}
      >
        {model.total} of 134 sessions match
      </p>
    </div>
  );
}

const meta = {
  title: 'Sessions/SearchCard',
  component: CardHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'THE ONE BUTTON. Mehdi, 2026-09-02: "add the event and filter button as a single button, but the core functioning should be exactly the same."\n\nProduction has two "+ Add" buttons under two headings — Events and Filters — opening the SAME picker with half the catalogue each. The store never split them: `searchStore.instance.filters` is one array with `isEvent` on every item, so this is the existing control opened once with the filter on its input removed. Nothing downstream changes: the picker still hands `addFilter` one catalogue entry and the entry\'s own `isEvent` decides where the row lands.\n\nWhat the two sections cost was concrete: you had to know whether the thing you wanted was an event or a property before you could start looking. "Is duration an event?" is not a question anybody should answer to search their own sessions.\n\nEverything load-bearing is kept — the numbered draggable event sequence, the one THEN/AND/OR for the whole search, an event\'s own "where … and/or" properties, a property that cannot be added twice and an event that can. The count under the card is live, so every state here can be checked against a real result.',
      },
    },
  },
  args: { preset: 'sequence' },
  argTypes: {
    preset: {
      control: 'select',
      options: ['empty', 'one-event', 'sequence', 'properties', 'nested', 'segment', 'pending'],
    },
  },
} satisfies Meta<typeof CardHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { preset: 'empty' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'One line: the button, what the field takes, and three examples that translate. Open the picker and note that the category rail is the only structure in it — forty-five entries in nine categories is not a list you scroll, and the rail is also the only place the four categories the backend special-cases are visible as categories. Autocapture, Events, Features and Segments behave differently from one another, so grouping them is information rather than tidiness.',
      },
    },
  },
};

export const OneEvent: Story = {
  args: { preset: 'one-event' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'One event, and NO order control — there is no gap for an operator to sit in, and a control that cannot change the result teaches you to ignore controls. No drag handle either, for the same reason. Production shows the order control from the first event onwards and only refetches above one, which is a control that lies about being useful.',
      },
    },
  },
};

export const Sequence: Story = {
  args: { preset: 'sequence' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'Three events in sequence — a page, then a cart, then a checkout. Drag to reorder and the numbers follow. Switch "matching" between then, and and or and watch the live count under the card: three genuinely different questions, and the same one value the backend takes for the whole search.\n\nThe words carry their own explanation in the dropdown and not on the closed control, because "then / and / or" is exactly the kind of vocabulary people get wrong once and then avoid — and a closed control that repeats its own explanation is twice as wide as it needs to be.',
      },
    },
  },
};

export const Properties: Story = {
  args: { preset: 'properties' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'Three properties and no events, so no rule, no numbers and no order control — the list holds only constraints.\n\nEach row is a CLAUSE and not three form fields: "Metadata · plan is paid" reads left to right at one size, with the operator drawn as the word it is. It is still a real Select — focusable, keyboard-operable, the same one production uses — and it takes its box back on hover and focus. Production draws three bordered controls of three different widths per row, and the sentence is something you assemble in your head.',
      },
    },
  },
};

export const NestedProperties: Story = {
  args: { preset: 'nested' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'An event narrowed by its own properties: a network request where the status and the method are constrained.\n\nThis is production\'s grammar kept intact — indented on a rail, "where" then a clickable and/or — because it is good and because somebody already learned it. One value per event, so clicking either word changes both, which is what the backend takes. The one improvement: the and/or now looks like a word you can change (dotted underline, a fill on hover), where production styles it as plain text that says nothing about itself until you hover it.\n\nThe rail is DASHED. Every solid rule in this app separates peers; these belong to the row above them.',
      },
    },
  },
};

export const SegmentAndProperty: Story = {
  args: { preset: 'segment' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'A saved segment used as an event, plus a property.\n\nA segment IS a saved search, so it takes no operator and no value — production carries its id as the value and offers nothing to edit. The only addition here is the words "is matched", because an event row with nothing after it looked unfinished. Note also what a segment costs on the page: a search containing one cannot itself be saved, and the Save button says so rather than failing.',
      },
    },
  },
};

export const NeedsAValue: Story = {
  args: { preset: 'pending' },
  render: (a) => <CardHarness key={a.preset} preset={a.preset} />,
  parameters: {
    docs: {
      description: {
        story:
          'A property whose operator wants a value and has none. It is marked rather than silently ignored — the row is narrowing nothing, and that is the fact worth printing. A word and not a red dot: the row is unfinished, not wrong.',
      },
    },
  },
};
