import { useState } from 'react';
import { Button } from 'antd';
import { Plus } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CATALOGUE,
  EVENT_PROPERTIES,
  describeFilter,
  makeFilter,
  type CatalogueEntry,
  type SearchFilter,
} from '@shared/sessions-logic.ts';
import { FilterPicker } from './FilterPicker.tsx';

/** Picking is the whole component, so the harness prints what it picked. */
function PickerHarness({
  scope,
  sentences,
}: {
  scope: 'everything' | 'event-properties';
  sentences: boolean;
}) {
  const [picked, setPicked] = useState<SearchFilter[]>([]);
  const entries = scope === 'everything' ? CATALOGUE : EVENT_PROPERTIES;

  return (
    <div style={{ padding: 'var(--m-space-6)', minHeight: 420 }}>
      <FilterPicker
        entries={entries}
        taken={picked.filter((f) => !f.isEvent).map((f) => f.entryId)}
        onPick={(e: CatalogueEntry) => setPicked((p) => [...p, makeFilter(e)])}
        onTranslate={sentences ? (f) => setPicked((p) => [...p, ...f]) : undefined}
      >
        <Button size="small" icon={<Plus size={14} />}>
          Add filter
        </Button>
      </FilterPicker>

      <ul
        style={{
          marginTop: 'var(--m-space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--m-space-2)',
          fontSize: 'var(--m-text-sm)',
          color: 'var(--m-content-secondary)',
          listStyle: 'none',
          padding: 0,
        }}
      >
        {picked.length === 0 ? (
          <li style={{ color: 'var(--m-content-muted)' }}>Nothing picked yet.</li>
        ) : (
          picked.map((f) => <li key={f.key}>{describeFilter(f)}</li>)
        )}
      </ul>
    </div>
  );
}

const meta = {
  title: 'Sessions/FilterPicker',
  component: PickerHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The picker behind the single button, and the same one behind a row\'s subject and an event\'s property affordance. Three callers, one component — which is also true in production, where both "+ Add" buttons and every row\'s name button open the same `FilterModal`.\n\nFour things it keeps from production, each load-bearing. The CATEGORY RAIL, because forty-five entries in nine categories is not a list you scroll, and because it is the only place the four categories the backend special-cases are visible as categories. SEARCH ACROSS EVERY CATEGORY, which is what makes the rail optional rather than a maze — type "rage" and the autocapture event and the saved segment come back together. `initialCategory`, so re-picking a row\'s subject opens where that subject lives. And A PROPERTY ALREADY IN THE SEARCH IS DISABLED WHILE AN EVENT IS NOT: two Clicks in a sequence is the normal case, two Country filters is a contradiction.\n\nOne thing it adds: the same field takes a sentence.',
      },
    },
  },
  args: { scope: 'everything', sentences: true },
  argTypes: {
    scope: { control: 'inline-radio', options: ['everything', 'event-properties'] },
    sentences: { control: 'boolean' },
  },
} satisfies Meta<typeof PickerHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Everything: Story = {
  args: { scope: 'everything', sentences: true },
  render: (a) => <PickerHarness key={`${a.scope}${a.sentences}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'The whole catalogue, shaped the way `filterStore.processFilterResponse` shapes what the API returns: `events` split into Autocapture and Events, `features` sent as TAG_TRIGGER, `segments` carried as one event each, and the property categories passed through.\n\nThings to try. Pick two events and note neither is disabled. Pick Country twice and note the second attempt is struck out rather than removed — a list that shrinks as you use it is harder to learn than one with a disabled row in it. Type "rage" and watch the rail\'s counts follow the query while no category disappears. Then type "checkout" and see the autocapture page event and the customer\'s own `checkout_start` side by side, which is the thing two scoped pickers structurally cannot do.',
      },
    },
  },
};

export const ASentence: Story = {
  args: { scope: 'everything', sentences: true },
  render: (a) => <PickerHarness key={`${a.scope}${a.sentences}sentence`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'Type two or more words — "paid users who hit an error", "mobile rage clicks", "trials that reached checkout" — and the field offers to read them as a search.\n\nThe offer SHOWS ITS WORK: the steps it understood, numbered, in the same words the rows will use, and the words it could not use printed rather than dropped. A translator that silently ignores half a sentence is one you stop trusting the first time you notice, and you always notice.\n\nIt sits ABOVE the matches and never instead of them, because what you typed might be both a filter name and half a sentence and the picker does not get to decide which you meant. What comes back is ordinary rows you can edit — see the list under the button.\n\nThe translator itself is a mock (`translate` in `shared/sessions-logic.ts`) and deliberately dumb. The real endpoint already exists: `aiFiltersStore` has printed "Translating your query into search steps…" in production for as long as nothing on the sessions bar has opened it. Swapping one function is the whole integration.',
      },
    },
  },
};

export const EventProperties: Story = {
  args: { scope: 'event-properties', sentences: false },
  render: (a) => <PickerHarness key={`${a.scope}${a.sentences}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'The same component narrowed to one event\'s properties, which is what a row\'s funnel affordance opens. In production this set is fetched per event (`filterStore.getEventFilters(id)`); the shape of the control is identical either way.\n\nThe sentence path is OFF here, and that is the argument for making it a prop rather than a behaviour: inside an event there is nowhere for a whole search to go, so offering one would be a control with no destination.',
      },
    },
  },
};
