import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES, type Issue } from '@shared/issues-data.ts';
import { IssueDetailPanel } from './IssueDetailPanel.tsx';

function issueAt(index: number): Issue {
  const issue = ISSUES[index];
  if (!issue) throw new Error(`ISSUES[${index}] is missing from the shared dataset`);
  return issue;
}

const meta = {
  title: 'Issues/IssueDetailPanel',
  component: IssueDetailPanel,
  args: { issue: issueAt(0) },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The agent\'s write-up, opened in place. The write-up IS the product: everything else on the Issues screen is a way of deciding which one to read, so sending the reader to a separate page to read one and back to pick the next is the wrong shape for the job. Expanding keeps the queue. The prose column and the sessions column are separate because they answer different questions, what is happening and who it happened to, and a reader normally wants one of them.',
      },
    },
  },
  decorators: [
    (Story) => (
      /* the panel is a table row in the app, so it is given the table's measure
         rather than the whole window */
      <div
        style={{
          maxWidth: 'var(--m-content-max)',
          margin: '0 auto',
          padding: 'var(--m-space-6)',
          background: 'var(--m-surface-default)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeSessions: Story = {
  args: { issue: issueAt(0) },
  parameters: {
    docs: {
      description: {
        story:
          'The checkout issue, with three sessions and deliberately uneven variation lengths: the first runs past three lines and clamps, the second sits at about three lines untruncated. That pair is the real test of the session card, because a clamp that only ever sees short text is a clamp nobody has checked. The plan sits in a neutral chip rather than a green one, since a green chip here would read as "this session succeeded", the opposite of what the row is reporting.',
      },
    },
  },
};

export const TwoSessions: Story = {
  args: { issue: issueAt(1) },
  parameters: {
    docs: {
      description: {
        story:
          'Two sessions, both around two lines, so the sessions column is shorter than the prose beside it. Worth having as its own story: the two columns are independent, and this is the shape that reveals whether the panel keeps its bottom edge honest when one side runs out first. The count beside the heading comes from the session list itself, so it can never disagree with the rows under it.',
      },
    },
  },
};
