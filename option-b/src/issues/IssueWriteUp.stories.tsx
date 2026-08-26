import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import { IssueWriteUp } from './IssueWriteUp.tsx';

const meta = {
  title: 'Issues/IssueWriteUp',
  component: IssueWriteUp,
  args: { issue: ISSUES[0]!, title: ISSUES[0]!.head, variant: 'full' as const },
  argTypes: { variant: { control: 'inline-radio', options: ['full', 'peek'] } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'THIRD structure, and the first one that is calm. The verdict on the second was ' +
          '"everything is so cluttered", and it was right for a reason worth recording: the round ' +
          'before it asked for the whole article to fit on one screen without scrolling, and the ' +
          'way I got there was to pack it into two columns. **Fitting and breathing are opposites ' +
          'when the amount of content is fixed.** The only way to have both is to put less on ' +
          'screen at once, which is what tabs are for.\\n\\n' +
          'Header (title and one row of facts, always there), then two tabs with one block each. ' +
          'The suggested fix is deliberately NOT a third tab - it is pinned below this article by ' +
          '`IssueContext`, outside the scroll, because a deliverable behind a tab is a deliverable ' +
          'someone might not find. See `SuggestedFix`.\\n\\n' +
          'Everything also stepped down one size: title 26 to 20, prose 17 to 15, steps 15 to 14. ' +
          'That is about a fifth of the vertical space on its own, and most of why the tabs can ' +
          'afford to be generous rather than merely shorter.\\n\\n' +
          'Nothing here was ever reworded. The dataset is shared with option A and rewriting it ' +
          'would make the two options incomparable, so every change across all three structures ' +
          'has been structural.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--m-surface-default)', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IssueWriteUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/* The long-title issue, which is what the balance rule on the display serif is
   for, and a six-clause journey, which is what the track has to hold at. */
export const LongTitle: Story = {
  args: { issue: ISSUES[4]!, title: ISSUES[4]!.head },
};

/* What the peek renders: no title, because the bar it grew out of is already
   carrying it. Straight to the tabs. */
export const Peek: Story = { args: { variant: 'peek' } };
