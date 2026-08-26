import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReplayFrame } from './ReplayFrame.tsx';

const meta = {
  title: 'Replay/ReplayFrame',
  component: ReplayFrame,
  args: { markerIndex: 2, variant: 'live' as const, clicking: false },
  argTypes: {
    markerIndex: { control: { type: 'range', min: -1, max: 7, step: 1 } },
    variant: { control: 'inline-radio', options: ['live', 'still'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'ONE recorded viewport, drawn twice: full size inside the player, and as the thumbnail ' +
          'on a session card. It exists because the card needed a screenshot and the alternative ' +
          'was a second, smaller wireframe that looked roughly like this one. Two drawings of the ' +
          'same thing drift, and they drift silently - the card would keep showing a checkout ' +
          'with three fields long after the player had four.\\n\\n' +
          '**It does not set its own size.** The player letterboxes it against the stage; the card ' +
          'gives it the card width at 16:10. Everything inside is measured in container units ' +
          'against this element, so identical markup scales from a 1500px stage to a 280px ' +
          'thumbnail with no second set of rules. That is the only reason one component can serve ' +
          'both.',
      },
    },
  },
} satisfies Meta<typeof ReplayFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Both sizes side by side, which is the thing to check: the wireframe has to be
   legible as a diagram at 280px and still not mistakable for a recording at
   full size. */
export const BothSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
      <ReplayFrame {...args} variant="still" markerIndex={3} />
      <ReplayFrame {...args} variant="live" markerIndex={3} />
    </div>
  ),
  decorators: [
    (Story) => (
      <div
        style={{ padding: '1.5rem', background: 'var(--m-surface-sunken)' }}
        /* the two frames get their sizes the way their real callers give them:
           a card width, and a letterbox */
      >
        <style>{`
          .sb-frames > :first-child { width: 17rem; aspect-ratio: 16/10; }
          .sb-frames > :last-child { width: 34rem; aspect-ratio: 16/10; }
        `}</style>
        <div className="sb-frames" style={{ display: 'contents' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Still: Story = {
  args: { variant: 'still', markerIndex: 3 },
  decorators: [
    (Story) => (
      <div style={{ width: '17rem', aspectRatio: '16 / 10' }}>
        <Story />
      </div>
    ),
  ],
};
