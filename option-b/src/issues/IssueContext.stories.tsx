import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import { IssueContext, type ContextSize } from './IssueContext.tsx';

const ISSUE = ISSUES[0]!;

function Harness({ size }: { size: ContextSize }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 700, background: 'var(--m-surface-sunken)' }}>
      <IssueContext
        issue={ISSUE}
        title={ISSUE.head}
        size={size}
      />
      {size === 'half' && (
        <p style={{ padding: '1rem', color: 'var(--m-content-muted)', fontSize: 'var(--m-text-xs)' }}>
          The player would be here, still playing. That is the whole point of the peek.
        </p>
      )}
    </div>
  );
}

const meta = {
  title: 'Issues/IssueContext',
  component: Harness,
  args: { size: 'full' as const },
  argTypes: { size: { control: 'inline-radio', options: ['full', 'half'] } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "THE WRITE-UP, AT TWO SIZES. This is where the flow's one rule lives: **every step " +
          'takes its space from the step you just finished.** You read the write-up in order to ' +
          'pick a session; the moment you pick one it has done its job, so it gives its height ' +
          'to the player.\n\n' +
          '`full` triage, the whole article with the fix pinned under it · `half` peeked while a ' +
          'replay runs, same article, half the height, player still going underneath. That is ' +
          'the answer to "I need to re-read the fix without losing my place".\n\n' +
          'It carries **no header of its own** and no fix banner either: the header belongs ' +
          'to the pane (see ' +
          '`IssueHeader`), because the journey panel on the right has to begin under the same ' +
          'top edge this does. Collapsing the write-up is now literally this component not ' +
          'rendering, so there is no second smaller copy of a header to keep in agreement with ' +
          'the real one.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = { args: { size: 'full' } };
export const Peeked: Story = { args: { size: 'half' } };
