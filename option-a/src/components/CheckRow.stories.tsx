import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { Tag } from 'lucide-react';
import { CheckRow, type CheckRowProps } from './CheckRow.tsx';

/** The row is controlled, so a story that only passes `on` proves nothing when
 *  you click it. This seeds the state from args and still logs the toggle, so
 *  the Actions panel shows the contract while the row shows the result. */
function Row(props: CheckRowProps) {
  const [on, setOn] = useState(props.on);
  return (
    <CheckRow
      {...props}
      on={on}
      onToggle={() => {
        props.onToggle();
        setOn((v) => !v);
      }}
    />
  );
}

/** The panel this row only ever appears inside. The width is fixed on purpose:
 *  truncation and the reserved checkbox slot are both width-dependent, and a
 *  story that lets the container grow to fit its content cannot show either. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 232,
        padding: 'var(--m-space-2)',
        border: '1px solid var(--m-border-default)',
        borderRadius: 'var(--m-radius-md)',
        background: 'var(--m-surface-raised)',
      }}
    >
      {children}
    </div>
  );
}

/* Six options, two of them already chosen. Six because the whole point of the
   hover rule is what a COLUMN of rows looks like at rest, and two selected
   because one is indistinguishable from a highlight. */
const HOVER_RULE_ROWS = [
  { label: 'Checkout', count: 4, seeded: true },
  { label: 'Payment', count: 2, seeded: false },
  { label: 'Frustration', count: 3, seeded: false },
  { label: 'Drop off', count: 2, seeded: true },
  { label: 'Back and forth', count: 1, seeded: false },
  { label: 'Error encountered', count: 5, seeded: false },
];

function HoverRuleDemo() {
  const [selected, setSelected] = useState<string[]>(
    HOVER_RULE_ROWS.filter((r) => r.seeded).map((r) => r.label),
  );
  const toggle = (label: string) =>
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  return (
    <div style={{ width: 232, display: 'grid', gap: 'var(--m-space-4)' }}>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--m-text-xs)',
          lineHeight: 1.5,
          color: 'var(--m-content-muted)',
        }}
      >
        At rest, only the two selected rows draw a box. Move the cursor down the list and each
        row&rsquo;s box appears where it already had room: the slot is reserved, so no label
        shifts sideways under the pointer. Tab through them for the same result from the keyboard.
      </p>
      <Panel>
        {HOVER_RULE_ROWS.map((r) => (
          <CheckRow
            key={r.label}
            on={selected.includes(r.label)}
            meta={r.count}
            onToggle={() => {
              action('toggle')(r.label);
              toggle(r.label);
            }}
          >
            {r.label}
          </CheckRow>
        ))}
      </Panel>
    </div>
  );
}

const meta = {
  title: 'Components/CheckRow',
  component: CheckRow,
  args: { on: false, children: 'Checkout', onToggle: action('toggle') },
  argTypes: { children: { control: 'text' } },
  decorators: [(Story) => <Panel><Story /></Panel>],
  parameters: {
    docs: {
      description: {
        component:
          'Every option row in every menu: the filter tree, the display menu, the capture popover. One definition exists because the three sibling popovers in the app being replaced each rolled their own, so one had no hover target, one had no selected tint, and the click target was only as wide as the label. The rule worth knowing before reading any other story here is that the checkbox is drawn only on hover, on focus, or when the option is selected, and its slot is reserved either way. `TheHoverRule` is the story that shows it.',
      },
    },
  },
} satisfies Meta<typeof CheckRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: { on: false },
  render: (args) => <Row key="unselected" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Nothing is drawn in the checkbox slot at rest, and that is the deliberate part. A column of nine empty boxes turns a menu into a form: it puts the eye on the controls instead of the labels, and it makes the eight unchecked options as loud as the one that matters. The row is still a full-width button with a hover surface, so the target is the row rather than the word.',
      },
    },
  },
};

export const Selected: Story = {
  args: { on: true },
  render: (args) => <Row key="selected" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Two things change together: the box fills with ink and the label steps up from `content-secondary` to `content-primary`. The second one carries the scan. It lets you find the chosen rows in a list of fifteen by weight of text alone, without checking fifteen small boxes. The fill is ink and not the accent because a popover can hold a dozen of these, and a dozen accent boxes would spend the page’s whole colour budget inside one dropdown.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: { on: false, children: 'Checkout', icon: <Tag size={13} /> },
  render: (args) => <Row key="icon" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The glyph sits in its own slot after the checkbox, never inside it, so the icon cannot be mistaken for the selection state. The slot collapses when no icon is passed, which is why a list of plain tag names carries no dead leading space while a list of mixed kinds still lines up.',
      },
    },
  },
};

export const WithMeta: Story = {
  args: { on: true, children: 'Billing & checkout', meta: 18 },
  render: (args) => <Row key="meta" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The count answers "is this filter worth applying" before it is applied, which is the difference between a menu you plan with and a menu you guess with. It is muted and tabular so a column of counts lines up and never competes with the labels, and it is text rather than a control so there is only one thing to click on the row.',
      },
    },
  },
};

export const SingleSelect: Story = {
  args: { on: true, single: true, children: 'Errors' },
  render: (args) => <Row key="single" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'A dimension that replaces its value rather than accumulating rounds its box into a radio and announces itself as `menuitemradio`. The shape carries the rule: a square box invites you to add a second value, so a dimension that cannot hold two must not draw one. No filter dimension is single-select today, since Category became a list once it was clear there was no reason it should behave differently from impact or tags, and the prop stays because the display menu and the capture popover both have choices that are genuinely one-of.',
      },
    },
  },
};

export const LongLabel: Story = {
  args: {
    on: false,
    children: 'Sessions that reached checkout on mobile Safari with a saved card',
    meta: 4,
  },
  render: (args) => <Row key="long" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'A saved segment is named by whoever saved it, which is to say arbitrarily long. The label truncates on one line and the count keeps its place, because a wrapping row makes one item twice as tall as its neighbours and breaks the scan down the column. The full text stays reachable as the button’s accessible name.',
      },
    },
  },
};

export const TheHoverRule: Story = {
  decorators: [],
  render: () => <HoverRuleDemo />,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'The visual contract for the whole component, and the story to look at in a review. Six rows, two of them selected: at rest the list shows exactly two boxes, so the two decisions already made are the only marks competing with the labels. Hovering or focusing a row reveals that row’s box in place, and because the slot was reserved from the start nothing moves when it appears. Reserving and hiding rather than inserting on hover is the entire trick, and it is the reason this can be a quiet list instead of a form.',
      },
    },
  },
};
