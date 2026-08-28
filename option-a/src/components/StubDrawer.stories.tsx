import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'antd';
import { StubDrawer } from './StubDrawer.tsx';
import { TestStatusChip } from './TestStatusChip.tsx';

const meta = {
  title: 'Components/StubDrawer',
  component: StubDrawer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'What a row opens while the panel behind it is still being built. A row that does nothing when clicked reads as broken rather than unfinished, so the row opens and what it opens says plainly which piece is next — with a real header carrying the row’s name and the facts the table already knows, so the click is visibly on the right test before the drawer admits there is nothing else in here yet.',
      },
    },
  },
} satisfies Meta<typeof StubDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { open: false, onClose: () => {}, title: '', note: '' },
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open a test</Button>
        <StubDrawer
          open={open}
          onClose={() => setOpen(false)}
          title="Checkout flow"
          meta={
            <>
              <TestStatusChip status="needs_review" />
              <span>5 steps</span>
              <span>v1</span>
            </>
          }
          note="The test panel — steps, run settings, schedule, versions and the review of a proposed change — is the next piece. This round is the list."
        />
      </>
    );
  },
};
