import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Space } from 'antd';
import { ISSUES, type Issue } from '@shared/issues-data.ts';
import { useIssues } from '../state/useIssues.ts';
import { useIssueDialogs } from './useIssueDialogs.tsx';

/** `useIssueDialogs` is a hook, so the story subject has to be a component that
 *  calls it. Indexing the shared dataset is checked rather than cast, because
 *  a missing fixture should say so instead of failing inside a dialog. */
function issueAt(index: number): Issue {
  const issue = ISSUES[index];
  if (!issue) throw new Error(`ISSUES[${index}] is missing from the shared dataset`);
  return issue;
}

/* 'none' exists for the docs page only: autodocs renders all three stories at
   once, and three portalled modals would stack on top of each other and cover
   the buttons. In the story view each one opens on mount, as intended. */
type Which = 'hide' | 'rename' | 'critical' | 'none';

function DialogHarness({ autoOpen }: { autoOpen: Which }) {
  /* the real controller, so the dialogs write to real state: renaming here
     genuinely changes the title the next dialog reads back */
  const model = useIssues();
  const dialogs = useIssueDialogs(model);
  const issue = issueAt(0);

  /* mount-only: the openers are recreated with the controller on every render,
     so anything in the dependency list would reopen the dialog forever. */
  useEffect(() => {
    if (autoOpen === 'hide') dialogs.openHide(issue);
    else if (autoOpen === 'rename') dialogs.openRename(issue);
    else if (autoOpen === 'critical') dialogs.openCritical(issue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 'var(--m-space-6)' }}>
      <p
        style={{
          marginBottom: 'var(--m-space-5)',
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
        }}
      >
        Subject: {model.titleOf(issue)}
      </p>
      <Space>
        <Button onClick={() => dialogs.openHide(issue)}>Hide</Button>
        <Button onClick={() => dialogs.openRename(issue)}>Rename</Button>
        <Button onClick={() => dialogs.openCritical(issue)}>Critical</Button>
      </Space>
      {dialogs.elements}
    </div>
  );
}

const meta = {
  title: 'Dialogs/IssueDialogs',
  component: DialogHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'All three issue dialogs come from one hook, and the rule it enforces is that no callsite writes modal markup. The list, the row menu and the detail page call the same openers, so the corner radius, the footer order and the copy cannot drift between them, which is exactly how the live app ended up with dialogs that disagree. antd\'s static `Modal.confirm()` is banned here: statics mount outside ConfigProvider and silently drop every token, radius, font and colour included, so these are real `<Modal>` elements rendered inside the provider tree. The three buttons reopen each dialog after you close it.',
      },
    },
  },
  args: { autoOpen: 'hide' },
  argTypes: {
    autoOpen: { control: 'inline-radio', options: ['hide', 'rename', 'critical', 'none'] },
  },
} satisfies Meta<typeof DialogHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hide: Story = {
  args: { autoOpen: 'hide' },
  render: (args, { viewMode }) => (
    <DialogHarness
      key={`${args.autoOpen}-${viewMode}`}
      autoOpen={viewMode === 'docs' ? 'none' : args.autoOpen}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Asks why, because the answer is what trains the agent not to find this again. The reason chips and the note are both optional and the copy says so rather than implying a required field, since hiding is reversible from the row menu and a mandatory form would just teach people to type a full stop.',
      },
    },
  },
};

export const Rename: Story = {
  args: { autoOpen: 'rename' },
  render: (args, { viewMode }) => (
    <DialogHarness
      key={`${args.autoOpen}-${viewMode}`}
      autoOpen={viewMode === 'docs' ? 'none' : args.autoOpen}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The field arrives pre-filled with the current title through the controller, not with a placeholder, so renaming is an edit rather than a re-type. The lede states the consequence that a text field cannot: the agent wrote this title, and yours replaces it everywhere, for everyone on the project.',
      },
    },
  },
};

export const Critical: Story = {
  args: { autoOpen: 'critical' },
  render: (args, { viewMode }) => (
    <DialogHarness
      key={`${args.autoOpen}-${viewMode}`}
      autoOpen={viewMode === 'docs' ? 'none' : args.autoOpen}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The intermediary, and the reason the critical flag is not a toggle. Nothing here jumps to a settings page: the question "why is this critical?" is answered in place by showing which descriptions matched, and the descriptions that answer it are editable in the same dialog. Only your own descriptions carry a delete control, and the footer offers "Not critical for me" only when your own description is what flagged it, because muting a teammate\'s signal would change nothing worth offering.',
      },
    },
  },
};
