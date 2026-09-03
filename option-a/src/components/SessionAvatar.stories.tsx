import type { Meta, StoryObj } from '@storybook/react-vite';
import { SESSIONS } from '@shared/sessions-logic.ts';
import { seedFor } from '@shared/avatar.ts';
import { displayNameOf } from '@shared/sessions-data.ts';
import { SessionAvatar } from './SessionAvatar.tsx';

const meta = {
  title: 'Components/SessionAvatar',
  component: SessionAvatar,
  parameters: {
    docs: {
      description: {
        component:
          'A DiceBear **pixelbot** seeded on the row’s identity. Mehdi asked for the ' +
          'avatar back and smaller, but *“not a face at 16px”* — a generated face at ' +
          'that size is a smear that claims to be a photograph of nobody, while a pixel ' +
          'robot is legibly a token standing for an identity. Pixel art is also the one ' +
          'illustration style that reads BETTER small, because it was drawn on a grid. ' +
          'The reasoning, and the measurements behind choosing the HTTP API over the ' +
          'package, are in `shared/avatar.ts`.',
      },
    },
  },
} satisfies Meta<typeof SessionAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The size the sessions list uses. */
export const InTheList: Story = { args: { seed: 'u-4021', size: 20 } };

/** ⚠ THE WHOLE REQUIREMENT, in one row: the same seed is the same robot, every
 *  time, with no cache and no id map — DiceBear is a pure function of its seed,
 *  so "the same user gets the same avatar" reduces to seeding on the identity
 *  rather than on the session. */
export const TheSameUserIsTheSameRobot: Story = {
  args: { seed: 'u-4021' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--m-space-4)', alignItems: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <SessionAvatar key={i} {...args} />
      ))}
      <span style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-muted)' }}>
        four renders, one seed
      </span>
    </div>
  ),
};

/** Twelve identities off the real fixture, so the grounds can be judged as a
 *  column rather than one at a time. The tint repeats down a long list on
 *  purpose: it is what makes a row cohere across a wide table, not what
 *  identifies the person. */
export const AsAColumn: Story = {
  args: { seed: 'u-4021' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--m-space-2)' }}>
      {SESSIONS.slice(0, 12).map((s) => (
        <div key={s.sessionId} style={{ display: 'flex', gap: 'var(--m-space-3)', alignItems: 'center' }}>
          <SessionAvatar seed={seedFor(s)} />
          <span style={{ fontSize: 'var(--m-text-sm)' }}>{displayNameOf(s)}</span>
        </div>
      ))}
    </div>
  ),
};

/** Bigger, to judge the art itself rather than the chip. Nothing in the product
 *  draws it at this size — a session row is the only place it appears. */
export const Large: Story = { args: { seed: 'u-4021', size: 72 } };

/** ⚠ WHAT A FAILED REQUEST LOOKS LIKE. This is the only thing in the prototype
 *  that fetches from a third party at render time, so the ground is drawn first
 *  and stays drawn: an unreachable DiceBear leaves a coloured chip where an
 *  avatar goes, and because the tint is seeded too it is still the same chip for
 *  the same person. */
export const WhenTheRequestFails: Story = {
  args: { seed: 'u-4021' },
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--m-space-4)', alignItems: 'center' }}>
      {['u-4021', 'u-1187', 'a-4f2a'].map((seed) => (
        <span
          key={seed}
          className="m-savatar"
          style={{ ['--m-avatar-i']: seed.length * 5 % 12, width: 20, height: 20 } as never}
        />
      ))}
      <span style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-muted)' }}>
        the ground alone, no robot
      </span>
    </div>
  ),
};
