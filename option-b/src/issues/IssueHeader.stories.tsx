import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { ISSUES } from '@shared/issues-data.ts';
import { issueMarkdown } from '@shared/issue-markdown.ts';
import type { CriticalState } from '@shared/issues-logic.ts';
import type { SidePanel } from '../state/useIssues.ts';
import { IssueHeader } from './IssueHeader.tsx';

const ISSUE = ISSUES[0]!;

type Place = 'triage' | 'watching' | 'peeked';

function Harness({
  place,
  criticalState,
  filed,
}: {
  place: Place;
  criticalState: CriticalState;
  filed: boolean;
}) {
  const [open, setOpen] = useState(place !== 'watching');
  const [sidePanel, setSidePanel] = useState<SidePanel | null>('journey');
  const watching = place !== 'triage';

  return (
    <div style={{ background: 'var(--m-surface-canvas)', paddingBottom: '1.5rem' }}>
      <IssueHeader
        issue={ISSUE}
        title={ISSUE.head}
        open={open}
        showTitle={watching}
        criticalState={criticalState}
        matchedBy="Mehdi"
        hidden={false}
        onToggle={() => setOpen((o) => !o)}
        onBack={watching ? action('leave the session') : undefined}
        sidePanel={watching ? sidePanel : undefined}
        onToggleSidePanel={
          watching ? (p) => setSidePanel((cur) => (cur === p ? null : p)) : undefined
        }
        markdown={() => issueMarkdown(ISSUE, { title: ISSUE.head, shortlist: ISSUE.sessions })}
        taskKey={filed ? 'MEL-482' : undefined}
        onCreateTask={action('create a Jira task')}
        onOpenCritical={action('open the critical dialog')}
        onOpenRename={action('open rename')}
        onOpenHide={action('open hide')}
        onUnhide={action('unhide')}
        onDropCritical={action('drop critical')}
        onRestoreCritical={action('restore critical')}
      />
      <p style={{ padding: '1rem', color: 'var(--m-content-muted)', fontSize: 'var(--m-text-xs)' }}>
        {watching
          ? 'The player and the journey panel would be under here, both starting at this edge.'
          : 'The article would be under here, leading with its own serif title.'}
      </p>
    </div>
  );
}

const meta = {
  title: 'Issues/IssueHeader',
  component: Harness,
  args: { place: 'watching' as const, criticalState: 'mine' as CriticalState, filed: false },
  argTypes: {
    place: { control: 'inline-radio', options: ['triage', 'watching', 'peeked'] },
    criticalState: { control: 'inline-radio', options: ['mine', 'team', 'dismissed', 'none'] },
    filed: { control: 'boolean' },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'THE HEADER, ACROSS THE WHOLE PANE. It used to be the lid on the write-up, which meant ' +
          'it stopped where the write-up stopped and the journey panel started at the very top of ' +
          'the window beside it: two pieces of chrome on two different top edges. It is now the ' +
          "pane's own header, and everything else hangs below it.\n\n" +
          'That is not tidying. It is what makes the side panels a **set** rather than one ' +
          'special case: the right-hand column is a region under a header, and the control that ' +
          'opens each panel lives in the header the same way. Adding a second panel is adding a ' +
          "glyph to the group behind the hairline at the end of this row and a value to " +
          '`SidePanel`. Nothing about the layout has to move.\n\n' +
          'The row is **one piece of markup at every depth** - same height, same back button on ' +
          'the same pixel, same labelled critical flag, same overflow menu, whether the write-up ' +
          'under it is open, peeked or closed. Only the caret turns over.\n\n' +
          'Two targets that must not blur: the chevron on the left **leaves the session**, the ' +
          'rest of the row **expands the write-up**. So the chevron is a real button with its own ' +
          'label, and the expander is the title itself, which is what you would reach for anyway.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Watching: Story = {};
export const Triage: Story = { args: { place: 'triage' } };
export const CriticalForTheTeam: Story = { args: { criticalState: 'team' } };
export const Dismissed: Story = { args: { criticalState: 'dismissed' } };

/* Once a task exists the primary stops offering to make another one and reports
   the key instead. A CTA that stays primary after it has been used invites the
   second duplicate ticket. */
export const TaskAlreadyFiled: Story = { args: { filed: true } };
