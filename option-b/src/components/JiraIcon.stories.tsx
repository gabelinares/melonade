import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@mantine/core';
import { JiraIcon } from './JiraIcon.tsx';

const meta = {
  title: 'Components/JiraIcon',
  component: JiraIcon,
  args: { size: 16 },
  parameters: {
    docs: {
      description: {
        component:
          'Geometry taken byte-for-byte from the app this replaces, ' +
          '`app/components/ui/Icons/integrations_jira.tsx`. Not redrawn, not traced: a brand mark ' +
          'that is nearly right is wrong, and there is a standing rule here against building a ' +
          'lookalike when the real thing is in the repo.\\n\\n' +
          'One thing changed, and only because the destination did. The shipped icon is ' +
          'greyscaled (#777 to #999 across two gradients) for a light integrations list; this one ' +
          'goes on a filled primary button, where a mid-grey mark on plum is muddy at 16px. The ' +
          'three fills are rebound to `currentColor` at the opacities the greyscale was ' +
          'expressing, which keeps the internal light and shade of the mark and lets it read on ' +
          'the button takes. The paths are untouched.',
      },
    },
  },
} satisfies Meta<typeof JiraIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/* On the ground it actually ships on, which is the only place worth judging it:
   16px, white, on the filled primary. */
export const OnThePrimary: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <Button size="sm" leftSection={<JiraIcon size={16} />}>
        Create Jira task
      </Button>
      <Button size="sm" variant="default" leftSection={<JiraIcon size={16} />}>
        Create Jira task
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--m-content-primary)' }}>
      {[13, 14, 16, 22, 40].map((s) => (
        <JiraIcon key={s} size={s} />
      ))}
    </div>
  ),
};
