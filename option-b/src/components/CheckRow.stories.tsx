import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { Tag } from 'lucide-react';
import { CheckRow, type CheckRowProps } from './CheckRow.tsx';

/** The row is controlled, so a story that only passes `on` proves nothing when
 *  you click it. This seeds from args and still logs the toggle, so the Actions
 *  panel shows the contract while the row shows the result. */
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

/** The dropdown this row only ever appears inside. The width is fixed on
 *  purpose: truncation and the reserved checkbox slot are both width-dependent,
 *  and a container that grows to fit its content can show neither. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 260,
        padding: 'var(--m-space-3)',
        borderRadius: 'var(--m-radius-sm)',
        background: 'var(--m-surface-raised)',
        border: '1px solid var(--m-border-default)',
        boxShadow: 'var(--m-shadow-popover)',
      }}
    >
      {children}
    </div>
  );
}

/* Six options, two already chosen. Six because the hover rule is about what a
   COLUMN of rows looks like at rest, and two selected because one selected row
   is indistinguishable from a highlight. */
const HOVER_RULE_ROWS = [
  { label: 'Checkout', meta: '4%', seeded: true },
  { label: 'Payment', meta: '2%', seeded: false },
  { label: 'Frustration', meta: '3%', seeded: false },
  { label: 'Drop off', meta: '2%', seeded: true },
  { label: 'Back and forth', meta: '1%', seeded: false },
  { label: 'Error encountered', meta: '5%', seeded: false },
];

function HoverRuleDemo() {
  const [selected, setSelected] = useState<string[]>(
    HOVER_RULE_ROWS.filter((r) => r.seeded).map((r) => r.label),
  );
  const toggle = (label: string) =>
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  return (
    <div style={{ width: 260, display: 'grid', gap: 'var(--m-space-4)' }}>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--m-text-xs)',
          lineHeight: 1.5,
          color: 'var(--m-content-muted)',
        }}
      >
        At rest, only the two selected rows draw a box. Run the cursor down the list and each
        row&rsquo;s box appears where it already had room: the slot is reserved, so no label
        shifts sideways under the pointer. Tab through them for the same result from the keyboard.
      </p>
      <Panel>
        {HOVER_RULE_ROWS.map((r) => (
          <CheckRow
            key={r.label}
            on={selected.includes(r.label)}
            meta={r.meta}
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
  args: { on: false, children: 'Billing & checkout', onToggle: action('toggle') },
  argTypes: { children: { control: 'text' } },
  decorators: [(Story) => <Panel><Story /></Panel>],
  parameters: {
    docs: {
      description: {
        component:
          'Every option row in every menu here: the filter tree, the display menu, the capture popover. One definition exists because the three neighbouring popovers in the app being replaced each built their own, so one had no hover target, one had no selected tint, and the click area was only as wide as the label. The rule to know before reading anything else on this page is that the checkbox is drawn only on hover, on focus, or when the option is selected, and its slot is reserved either way. `TheHoverRule` is the story that shows it.',
      },
    },
  },
} satisfies Meta<typeof CheckRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: { on: false, children: 'Critical only' },
  render: (args) => <Row key="unselected" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Nothing is drawn in the checkbox slot at rest, and the empty slot is the deliberate part. A column of nine empty boxes turns a menu into a form: it puts the eye on the controls instead of the labels and makes the eight unchecked options as loud as the one that matters. On this tinted chrome that matters more than on flat white, since a plum-tinted dropdown full of grey outlines reads as busy before it reads as a list. The row is still a full-width button with a hover surface, so the target is all 260px and not the words.',
      },
    },
  },
};

export const Selected: Story = {
  args: { on: true, children: 'Critical only' },
  render: (args) => <Row key="selected" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Selected, and two things move together: the box fills with the accent and the label steps from `content-secondary` to `content-primary`. The second one carries the scan, because it lets you find the chosen rows in a list of fifteen by weight of text alone rather than by inspecting fifteen small boxes. It is the same mechanism selection uses everywhere else in this design, which is why the row does not also need a tick in the margin or a left rule.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: { on: false, children: 'Billing & checkout', icon: <Tag size={13} /> },
  render: (args) => <Row key="icon" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The glyph gets its own slot after the checkbox, never inside it, so it can never be read as the selection state. The slot collapses when no icon is passed, which is why a list of plain tag names carries no dead leading space while a list of mixed kinds still lines up down the left.',
      },
    },
  },
};

export const WithMeta: Story = {
  args: { on: true, children: 'Billing & checkout', meta: '2%' },
  render: (args) => <Row key="meta" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The trailing slot, and the reason this is a component rather than a checkbox with a label. Choosing segments is a decision about how much traffic you are watching: two segments could be 4% of the day or 60% of it, and without the share on the row the choice is blind. Tabular figures so a column of them lines up, and plain text so the row still has exactly one thing to click.',
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
          'A dimension that replaces its value instead of accumulating rounds its box into a radio and announces itself as `menuitemradio`. The shape carries the rule: a square box invites you to add a second value, so anything that cannot hold two must not draw one. No filter dimension is single-select today, since Category became a list once it was clear there was no reason it should behave differently from impact or tags, and the prop stays because the capture popover and the display menu both have choices that are genuinely one-of.',
      },
    },
  },
};

export const LongLabel: Story = {
  args: {
    on: false,
    children: 'Mobile Safari sessions that reached the payment step in the last 7 days',
    meta: '11%',
  },
  render: (args) => <Row key="long" {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'A saved segment is named by whoever saved it, which is to say longer than the dropdown. The label truncates on one line and the share keeps its place, so a percentage is never pushed out of view by a name. Wrapping is the tempting alternative and it is wrong here: a two-line row in a list of fifteen breaks the scan, and the even row height is what makes this read as a list rather than a form. The full text stays reachable as the button\'s accessible name.',
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
          'The visual contract for the whole component, and the story to open in a review. Six rows, two of them selected: at rest the column shows exactly two boxes, so the two decisions already made are the only marks competing with the labels. Hover or focus a row and that row\'s box appears in place, and because the slot was reserved from the start nothing moves when it does. Reserving and hiding rather than inserting on hover is the entire trick, and it is what lets this be a quiet list instead of a form.',
      },
    },
  },
};
