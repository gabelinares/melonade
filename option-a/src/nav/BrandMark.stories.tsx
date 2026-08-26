import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandMark } from './BrandMark.tsx';

const meta = {
  title: 'Navigation/BrandMark',
  component: BrandMark,
  args: { size: 17, playOnMount: false },
  parameters: {
    docs: {
      description: {
        component:
          'The Melonade mark. Shape from `@shared/brand-mark.ts` so both options draw the ' +
          'identical geometry; colour from the `brand-mark` role, which is watermelon in ' +
          'both. In Graphite it is the only chromatic element in the interface.\n\n' +
          'The turn fires on hover or keyboard focus of whatever element carries ' +
          '`data-mark-host`, and once on mount when `playOnMount` is set. Judge it at 17px ' +
          'first: a mark that only works at 56px is not a logo.',
      },
    },
  },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/* The nav pairing, exactly as SideNav builds it: the host element carries the
   hover trigger, so hovering the row - not the glyph - turns the mark over. */
export const InTheNav: Story = {
  render: () => (
    <div
      data-mark-host
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--m-space-4)',
        width: 'var(--m-nav-width)',
        height: '2.75rem',
        paddingInline: 'var(--m-space-4)',
        background: 'var(--m-surface-nav)',
        border: '1px solid var(--m-border-subtle)',
      }}
    >
      <BrandMark size={17} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: 'var(--m-text-xs)', fontWeight: 500 }}>frontend.acme.com</span>
        <span style={{ fontSize: 'var(--m-text-2xs)', color: 'var(--m-content-muted)' }}>
          Project
        </span>
      </span>
    </div>
  ),
};

/* Every size the mark is asked to hold, smallest first. The 17px is the shipping
   size; the rest exist so a favicon or a login screen has somewhere to start. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--m-space-7)' }}>
      {[14, 17, 22, 32, 56].map((s) => (
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
