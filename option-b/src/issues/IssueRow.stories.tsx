import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { ISSUES, type Issue } from '@shared/issues-data.ts';
import { IssueRow } from './IssueRow.tsx';

/** Indexing the shared dataset is checked rather than cast, because a missing
 *  fixture should say so here instead of failing inside a render. */
function issueAt(index: number): Issue {
  const issue = ISSUES[index];
  if (!issue) throw new Error(`ISSUES[${index}] is missing from the shared dataset`);
  return issue;
}

const base = issueAt(0);
const inSegment = ISSUES.find((i) => i.segmentId != null) ?? base;

const meta = {
  title: 'Issues/IssueRow',
  component: IssueRow,
  args: {
    issue: base,
    title: base.head,
    selected: false,
    hidden: false,
    criticalState: 'none',
    fields: ['impact', 'category', 'origin', 'lastSeen'],
    onSelect: action('select issue'),
    onOpenCritical: action('open the critical dialog'),
  },
  argTypes: {
    criticalState: {
      control: 'inline-radio',
      options: ['none', 'team', 'mine', 'dismissed'],
    },
    title: { control: 'text' },
  },
  /* The real column is 400px, and the two-line clamp only behaves like the
     product's if the row is given that width. A row in a centered story would
     stretch to the canvas and never clamp anything. */
  decorators: [
    (Story) => (
      <div
        style={{
          width: 400,
          background: 'var(--m-surface-sunken)',
          border: '1px solid var(--m-border-subtle)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'One row in the triage column, and it is two lines rather than a table row. A table row puts every field in a fixed column, which is right when you are comparing rows and wrong when you are choosing which one to read: it gives the title whatever the title column happens to be and truncates it there. Here the title gets two full lines at reading size and everything else drops to one quiet meta line beneath it. Nothing is cut to fit a column boundary, because there are no column boundaries.',
      },
    },
  },
} satisfies Meta<typeof IssueRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: { selected: false },
  parameters: {
    docs: {
      description: {
        story:
          'The resting row on the tinted list surface. The category chip is quiet and always neutral: colouring "Errors" red would conflate a category with a severity, and the impact dot two columns to the left is already carrying severity. Hover it to see the target, which is the whole row rather than the title.',
      },
    },
  },
};

export const Selected: Story = {
  args: { selected: true },
  parameters: {
    docs: {
      description: {
        story:
          'The selected row, and it is a tinted surface plus `aria-current` and nothing else. No coloured stripe down the edge: that is decoration standing in for structure, and against the plum tint it would be the third thing saying "this one". The tint is drawn from the accent ramp, which is the same ramp the active rail slot uses, so a reader learns one colour for "where I am" and it means that everywhere.',
      },
    },
  },
};

export const Hidden: Story = {
  args: { hidden: true },
  parameters: {
    docs: {
      description: {
        story:
          'A hidden issue, shown because the reader asked to see hidden issues. It carries both a dimming and the word "Hidden" in the meta line, and the redundancy is the point: opacity alone is not a state a reader can name, and a hidden row that merely looks faded is indistinguishable from a disabled one. Hiding is reversible from the detail pane, so this row is still fully clickable.',
      },
    },
  },
};

export const CriticalNone: Story = {
  args: { criticalState: 'none' },
  parameters: {
    docs: {
      description: {
        story:
          'No description matches this issue, so nobody is being alerted about it. The flag is still present as a bare outline rather than absent, because it is the entry point to writing the description that would match, and a control that appears only once it has been used is a control nobody finds.',
      },
    },
  },
};

export const CriticalTeam: Story = {
  args: { criticalState: 'team', matchedBy: 'Mehdi O.' },
  parameters: {
    docs: {
      description: {
        story:
          "A teammate's description matched. The tooltip names them, which is the fact a reader actually wants: \"critical\" is a claim somebody made, and knowing who made it is how you decide whether to argue with it. This state and the next one are pixel-identical in the live app, which is the specific defect this component was rebuilt to fix.",
      },
    },
  },
};

export const CriticalMine: Story = {
  args: { criticalState: 'mine' },
  parameters: {
    docs: {
      description: {
        story:
          'My own description matched, shown with the danger fill. Ownership moves the fill and never the glyph, so the triangle keeps meaning "severity" while the fill means "whose". This is also the only state from which the detail pane offers "Not critical for me", since muting a teammate\'s signal would change nothing worth offering.',
      },
    },
  },
};

export const CriticalDismissed: Story = {
  args: { criticalState: 'dismissed' },
  parameters: {
    docs: {
      description: {
        story:
          'I dropped the flag for myself, and it stays visible as a dashed outline rather than reverting to the unflagged state. A decision you made should be legible as a decision: reverting to `none` would leave you re-reading an issue you had already dismissed, with nothing on the row to say so.',
      },
    },
  },
};

export const InSegment: Story = {
  args: { issue: inSegment, title: inSegment.head },
  parameters: {
    docs: {
      description: {
        story:
          'An issue found inside a saved segment rather than in full traffic, taken from the first such issue in the shared dataset. Provenance is one glyph plus a name in the meta line, and it earns the space because "found in 2% of traffic" and "found across everything" are very different claims about the same impact number.',
      },
    },
  },
};

export const LongTitle: Story = {
  args: {
    title:
      'Payment declined at checkout with a saved card on mobile Safari, and the form clears every field before the error is announced',
    criticalState: 'mine',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A title long enough to actually hit the two-line clamp, in the real 400px column, with the flag present so the head row is at its tightest. Two lines is the deliberate limit: one line truncates most agent-written titles into uselessness, and three lets a single row eat a fifth of the column and destroys the scan the grouping was built for. The flag stays on the first line and does not get pushed down by the wrap.',
      },
    },
  },
};

export const AllFields: Story = {
  args: { fields: ['impact', 'category', 'tags', 'origin', 'lastSeen', 'sessions'] },
  parameters: {
    docs: {
      description: {
        story:
          'Every optional field switched on. This is the state that tests whether the meta line is a sentence or a pile: each item is separated by a drawn dot bound to the item that follows it, so a wrapped line can never end on an orphaned separator. Six items is more than the row wants, which is why the default is four.',
      },
    },
  },
};

export const MinimalFields: Story = {
  args: { fields: ['lastSeen'] },
  parameters: {
    docs: {
      description: {
        story:
          'One field, and the impact dot gone with it. The reason a two-line row beats a table for this: turning a field off closes a gap in a sentence, where a table would leave an empty column behind. The row still reads.',
      },
    },
  },
};
