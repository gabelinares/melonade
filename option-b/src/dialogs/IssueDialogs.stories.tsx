import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Group } from '@mantine/core';
import { ISSUES, type Issue } from '@shared/issues-data.ts';
import { useIssues } from '../state/useIssues.ts';
import { useIssueDialogs } from './useIssueDialogs.tsx';

/** Indexing the shared dataset is checked rather than cast, because a missing
 *  fixture should say so instead of failing inside a dialog. */
function issueAt(index: number): Issue {
  const issue = ISSUES[index];
  if (!issue) throw new Error(`ISSUES[${index}] is missing from the shared dataset`);
  return issue;
}

/* 'none' exists for the docs page only: autodocs renders all three stories at
   once, and three portalled modals would stack on top of each other and cover
   the buttons underneath. In the story view each one opens on mount, as
   intended. */
type Which = 'hide' | 'rename' | 'critical' | 'none';

function DialogHarness({ autoOpen }: { autoOpen: Which }) {
  /* the real controller, so the dialogs write to real state: renaming here
     genuinely changes the title the next dialog reads back, and adding a
     description genuinely changes what the critical dialog says matched */
  const model = useIssues();
  const dialogs = useIssueDialogs(model);
  const issue = issueAt(0);

  /* mount-only: the openers are recreated with the controller on every render,
     so anything in the dependency list would reopen the dialog forever. */
  useEffect(() => {
    if (autoOpen === 'hide') dialogs.openHide(issue.id);
    else if (autoOpen === 'rename') dialogs.openRename(issue.id);
    else if (autoOpen === 'critical') dialogs.openCritical(issue.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 'var(--m-space-7)' }}>
      <p
        style={{
          marginBottom: 'var(--m-space-5)',
          fontSize: 'var(--m-text-sm)',
          color: 'var(--m-content-muted)',
        }}
      >
        Subject: {model.titleOf(issue)}
      </p>
      <Group gap="xs">
        <Button variant="default" onClick={() => dialogs.openHide(issue.id)}>
          Hide
        </Button>
        <Button variant="default" onClick={() => dialogs.openRename(issue.id)}>
          Rename
        </Button>
        <Button variant="default" onClick={() => dialogs.openCritical(issue.id)}>
          Critical
        </Button>
      </Group>
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
          'All three issue dialogs come from one hook, and the rule it enforces is that no callsite writes modal markup. The list row, the detail header and the command palette call the same three openers, so the radius, the footer order and the copy cannot drift between them, which is exactly how the live app ended up with dialogs that disagree with each other. The openers take an ID rather than an Issue, because the callers that need them most (a keyboard shortcut, a palette action) hold an id and not an object. Every dialog here is a real Mantine `<Modal>` rendered inside the provider tree: a static imperative confirm helper mounts outside the provider and silently loses every token, radius, font and colour with it. The three buttons reopen each dialog after you close it, and the state is shared, so a rename in one is visible in the next.',
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
      autoOpen={viewMode === 'story' ? args.autoOpen : 'none'}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Asks why, because the answer is what trains the agent not to find this again. The reason chips and the note are both optional and the copy says so rather than implying a required field: hiding is reversible from the detail menu, and a mandatory form would only teach people to type a full stop. The subject is named in the lede in its own weight, so "hide this issue" is never ambiguous about which issue when the dialog was opened from a keyboard shortcut.',
      },
    },
  },
};

export const Rename: Story = {
  args: { autoOpen: 'rename' },
  render: (args, { viewMode }) => (
    <DialogHarness
      key={`${args.autoOpen}-${viewMode}`}
      autoOpen={viewMode === 'story' ? args.autoOpen : 'none'}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The field arrives pre-filled with the current title through the controller, not with a placeholder, so renaming is an edit rather than a re-type. Enter commits and an empty value is a no-op rather than an error, because the useful failure here is silence, not a validation message about a field somebody decided to clear. The lede states the consequence a text field cannot: the agent wrote this title, and yours replaces it everywhere, for everyone on the project.',
      },
    },
  },
};

export const Critical: Story = {
  args: { autoOpen: 'critical' },
  render: (args, { viewMode }) => (
    <DialogHarness
      key={`${args.autoOpen}-${viewMode}`}
      autoOpen={viewMode === 'story' ? args.autoOpen : 'none'}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The intermediary, and the reason the critical flag is not a toggle. Nothing here jumps to a settings page: "why is this critical" is answered in place by showing which descriptions matched, and the descriptions that answer it are editable in the same dialog. Only your own descriptions carry a delete control, and the footer offers "Not critical for me" only when your own description is what flagged it, because muting a teammate\'s signal would change nothing worth offering. Add a description and close it, then reopen: the match list is derived, so it updates without anything being toggled.',
      },
    },
  },
};
