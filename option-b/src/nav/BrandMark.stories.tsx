import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandMark } from './BrandMark.tsx';

const meta = {
  title: 'Navigation/BrandMark',
  component: BrandMark,
  args: { size: 19, playOnMount: false },
  parameters: {
    docs: {
      description: {
        component:
          'The Melonade mark. Shape from `@shared/brand-mark.ts` so both options draw the ' +
          'identical geometry; colour from the `brand-mark` role, which is watermelon. It is ' +
          'the only watermelon thing in Atrium - the UI accent is plum, because watermelon ' +
          'sits 24 degrees from the danger ramp and an accent there would put the selected ' +
          'row, the suggested-fix panel and a red alarm in the same family.\n\n' +
          'The turn fires on hover or keyboard focus of whatever element carries ' +
          '`data-mark-host`, and once on mount when `playOnMount` is set. Judge it at 19px ' +
          'first: a mark that only works at 56px is not a logo.',
      },
    },
  },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/* The rail pairing, exactly as AgentRail builds it: the button carries the hover
   trigger, so hovering the target - not the glyph - turns the mark over. */
export const InTheRail: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 'var(--m-rail-width)',
        padding: 'var(--m-space-4) 0',
        background: 'var(--m-surface-nav)',
        border: '1px solid var(--m-border-subtle)',
      }}
    >
      <button
        type="button"
        data-mark-host
        aria-label="Melonade, project frontend.acme.com"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2rem',
          height: '2rem',
          background: 'none',
          border: 0,
          cursor: 'pointer',
        }}
      >
        <BrandMark size={19} />
      </button>
    </div>
  ),
};

/* Every size the mark is asked to hold, smallest first. The 19px is the shipping
   size; the rest exist so a favicon or a login screen has somewhere to start. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--m-space-7)' }}>
      {[14, 19, 22, 32, 56].map((s) => (
        <span
          key={s}
          data-mark-host
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <BrandMark size={s} />
          <span style={{ fontSize: 'var(--m-text-2xs)', color: 'var(--m-content-muted)' }}>{s}</span>
        </span>
      ))}
    </div>
  ),
};

/* The turned state, held still. Hover is the real trigger, but a screenshot
   test and a design review both need to see the far end of the animation. */
export const Turned: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--m-space-7)' }}>
      <BrandMark size={56} />
      <BrandMark size={56} className="is-turned" />
    </div>
  ),
};

export const PlaysOnMount: Story = {
  args: { size: 56, playOnMount: true },
  parameters: {
    docs: {
      description: {
        story:
          'What the shell does on load: one turn out and back, so the motion is seen ' +
          'without anyone having to discover that the logo is hoverable. Skipped entirely ' +
          'under `prefers-reduced-motion`.',
      },
    },
  },
};

export const Looping: Story = {
  args: { size: 56, loop: true },
  parameters: {
    docs: {
      description: {
        story:
          'The loader. The mark already has one honest piece of motion in it, and it is the ' +
          'only watermelon thing in this app, so it is the one element that can move without ' +
          'competing with anything - a ring spinner beside it would have been a second ' +
          'animation saying the same word. It drives the **same** turn the mount flip and the ' +
          'hover use, so there is one turn in this component and three ways to ask for it. ' +
          'Ignored under `prefers-reduced-motion`, where the mark simply sits.\n\n' +
          'See `Components/BrandLoader` for it in the place it is actually used.',
      },
    },
  },
};
