import type { Meta, StoryObj } from '@storybook/react-vite';
import { SkeletonRows } from './SkeletonRows.tsx';

/* The real Issues table, as shares of its width: caret, Impact, Issue, Tags,
   Last seen, and the row-menu column. */
const ISSUES_COLUMNS = [3, 9, 58, 15, 8, 3] as const;

const meta = {
  title: 'Components/SkeletonRows',
  component: SkeletonRows,
  args: { rows: 6 },
  argTypes: { rows: { control: { type: 'number', min: 1, max: 20 } } },
  decorators: [
    (Story) => (
      <div style={{ width: 760 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SkeletonRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { rows: 6 },
  parameters: {
    docs: {
      description: {
        story:
          'Six rows at the table\'s own row height, which is the number that fills the body without implying a page size the data may not have. The fill inside the title cell varies per row so the block reads as text arriving rather than as a progress bar, and the height matching the real row is what stops the layout jumping when the data lands.',
      },
    },
  },
};

export const FewRows: Story = {
  args: { rows: 2 },
  parameters: {
    docs: {
      description: {
        story:
          'Two rows, for a surface that is known to be short such as a filtered result or a panel. A skeleton longer than the list it precedes is a small lie about how much is coming, and the reader notices when the page shrinks.',
      },
    },
  },
};

export const IssuesColumns: Story = {
  args: { rows: 7, columns: ISSUES_COLUMNS },
  parameters: {
    docs: {
      description: {
        story:
          'The column widths of the actual Issues table, caret and row menu included. This is the argument for the whole component: a centred spinner tells the reader to wait, whereas a skeleton with the right rhythm tells them what is arriving and where to look when it does. The array is passed in rather than baked in because the shape belongs to the table, not to the loading state.',
      },
    },
  },
};
