import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SESSIONS, entryOf, valueOptions } from '@shared/sessions-logic.ts';
import { ValuePicker } from './ValuePicker.tsx';

/** Four fields, chosen because each one is a different SOURCE of shares. */
const FIELDS = {
  'Country (counted)': 'userCountry',
  'Browser (counted, closed set)': 'userBrowser',
  'URL (fixture, open set)': 'url',
  'Error message (fixture, ugly values)': 'value',
} as const;

type FieldLabel = keyof typeof FIELDS;

function ValueHarness({ field, narrowed }: { field: FieldLabel; narrowed: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  const entryId = FIELDS[field];
  const entry = entryOf(entryId);
  /* `narrowed` stands in for the rest of the search having already run. The
     counts are computed against whatever it left, which is the whole point of
     them: they answer "how many would this leave me". */
  const rows = narrowed ? SESSIONS.filter((s) => s.deviceType === 'mobile') : SESSIONS;
  const options = valueOptions(entryId, rows);

  return (
    <div style={{ padding: 'var(--m-space-6)', minHeight: 460, display: 'flex', flexDirection: 'column', gap: 'var(--m-space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--m-space-3)' }}>
        <span style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-muted)' }}>
          {entry?.displayName} is
        </span>
        <ValuePicker
          entryId={entryId}
          value={value}
          onChange={setValue}
          rows={rows}
          name={entry?.displayName ?? 'value'}
          freeText={!entry?.options}
        />
      </div>
      <p style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)', fontFamily: 'var(--m-font-num)' }}>
        {options.length} candidates, counted against {rows.length} sessions
        {options[0] ? ` · widest is ${options[0].value} at ${options[0].count}` : ''}
      </p>
    </div>
  );
}

const meta = {
  title: 'Sessions/ValuePicker',
  component: ValueHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The value field, with the share of traffic each candidate holds.\n\nThis is the best control in the production app and the easiest one to lose in a redesign, because it looks like an ordinary multi-select until you notice the bar. What the bar does: **it tells you whether a filter is worth applying before you apply it.** "France 12" turns picking a value from a guess into a decision, and a value with a sliver of a bar tells you the filter will empty the list before you watch it happen.\n\nFour decisions. THE COUNTS ARE LIVE and computed against what the other filters already left, so they narrow as you build and the menu can never disagree with the table — flip the `narrowed` control to see it. THE BAR IS RELATIVE TO THE WIDEST CANDIDATE, not to the total: sessions spread over nine countries put every share under 20%, and nine slivers compare to nothing. IT IS `CheckRow`, the same option row the filter tree and the display menu use, with the bar riding its `meta` slot. And AN OPEN FIELD TAKES TYPED VALUES — a URL that only exists on staging is still a URL you need to filter on.\n\nProduction draws its bar as a blue underline hard against the row\'s left edge, beneath the label — a coloured line under text you are trying to read, clipped at whatever width the label happened to be. Right-aligned in a fixed column, the bars share an axis, so their lengths are comparable rather than merely present.',
      },
    },
  },
  args: { field: 'Country (counted)', narrowed: false },
  argTypes: {
    field: { control: 'select', options: Object.keys(FIELDS) },
    narrowed: { control: 'boolean' },
  },
} satisfies Meta<typeof ValueHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Counted: Story = {
  args: { field: 'Country (counted)', narrowed: false },
  render: (a) => <ValueHarness key={`${a.field}${a.narrowed}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'Country, counted off the 134 sessions themselves. The figures add up to the number of sessions, so the menu and the table are the same data — asserted in `sessions-check`.\n\nTurn on `narrowed` to see the counts recomputed against a search that has already narrowed to mobile. That is what the control does in the page: every count answers "how many would this leave me", not "how many exist somewhere".',
      },
    },
  },
};

export const ClosedSet: Story = {
  args: { field: 'Browser (counted, closed set)', narrowed: false },
  render: (a) => <ValueHarness key={`${a.field}${a.narrowed}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'Browser is a closed set — four values and no others — so the field takes no typed values and the "use what you typed" affordance never appears. A field that let you filter on a browser the backend has never heard of is not a help.',
      },
    },
  },
};

export const FixtureValues: Story = {
  args: { field: 'URL (fixture, open set)', narrowed: false },
  render: (a) => <ValueHarness key={`${a.field}${a.narrowed}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'A URL is not a field on a session, so there is nothing to count — the candidates and their weights come from `VALUE_FIXTURES`. The control is identical either way, which is the point: a value field with no shares is this control with its best feature removed.\n\nIt is an OPEN set, so type something that is not in the list and the field offers to use it. Enter commits.',
      },
    },
  },
};

export const UglyValues: Story = {
  args: { field: 'Error message (fixture, ugly values)', narrowed: false },
  render: (a) => <ValueHarness key={`${a.field}${a.narrowed}`} {...a} />,
  parameters: {
    docs: {
      description: {
        story:
          'The worst values in the product, which is why they are in the fixture: a bare message, a serialised response body, a stack-shaped sentence, and the classic cross-origin "Script error." with nothing in it.\n\nThis is the story to check the control against, because it is where a value list falls apart — every row has to truncate cleanly, keep its figure and its bar in the same column, and stay pickable. Set one and look at the trigger: past two values it names the first and counts the rest, because a row is a clause and not a list.',
      },
    },
  },
};
