import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import type { CriticalState } from '@shared/issues-logic.ts';
import { CriticalFlag } from './CriticalFlag.tsx';

const STATES: readonly { state: CriticalState; caption: string; matchedBy?: string }[] = [
  { state: 'none', caption: 'none' },
  { state: 'team', caption: 'team', matchedBy: 'Mehdi O.' },
  { state: 'mine', caption: 'mine' },
  { state: 'dismissed', caption: 'dismissed' },
];

function Row({ variant }: { variant: 'glyph' | 'labelled' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
      {STATES.map((s) => (
        <div key={s.state} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <CriticalFlag
            state={s.state}
            matchedBy={s.matchedBy}
            variant={variant}
            onClick={action(`flag clicked: ${variant}/${s.state}`)}
          />
          <span style={{ fontSize: 'var(--m-text-2xs)', color: 'var(--m-content-muted)' }}>
            {s.caption}
          </span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'Components/CriticalFlag',
  component: CriticalFlag,
  args: { state: 'mine', variant: 'glyph', onClick: action('open the critical dialog') },
  argTypes: {
    state: { control: 'inline-radio', options: ['none', 'team', 'mine', 'dismissed'] },
    variant: { control: 'inline-radio', options: ['glyph', 'labelled'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Four states, because criticality is DERIVED rather than toggled: an agent flags an issue when it matches a plain-words description somebody wrote, so this control reports whose description matched and opens the place you write one. It never sets a flag itself.',
      },
    },
  },
} satisfies Meta<typeof CriticalFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 36 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)' }}>
          glyph, the list row
        </p>
        <Row variant="glyph" />
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)' }}>
          labelled, the detail header
        </p>
        <Row variant="labelled" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Both variants, all four states, captioned, because being able to tell them apart IS the component. In the live app "a teammate flagged it" and "I flagged it" are pixel-identical, to the point that the product owner did not know the distinction existed. Here ownership moves the fill and severity keeps the glyph, so the triangle never changes shape when the owner changes: none is a bare outline, team is a neutral fill with warm ink, mine is a danger fill, and dismissed is a dashed outline rather than nothing, because an issue you muted is still a decision you made and should be visible as one. Read the two rows together and note that the labelled variant says in words exactly what the fill says in colour, which is the check that the glyph is not carrying meaning no reader can recover.',
      },
    },
  },
};

export const Glyph: Story = {
  args: { variant: 'glyph', state: 'team', matchedBy: 'Mehdi O.' },
  parameters: {
    docs: {
      description: {
        story:
          'The 22px form used in a list row, where the title has already taken the width. It carries a 44px hit target through a pseudo-element rather than through padding, so the touch target is honest without the box growing and pushing the row taller. The click stops propagating, since the row itself selects the issue.',
      },
    },
  },
};

export const Labelled: Story = {
  args: { variant: 'labelled', state: 'mine' },
  parameters: {
    docs: {
      description: {
        story:
          'The detail header form. It exists because the pane has room for words and the list does not, and because the header is where somebody decides whether to act: "Critical to you" is a sentence you can disagree with, whereas a filled triangle is something you have to learn.',
      },
    },
  },
};

export const Interactive: Story = {
  args: { state: 'none' },
  parameters: {
    docs: {
      description: {
        story:
          'A live click, logged to the Actions panel. The handler is the whole contract: this control never sets a flag, it opens the place you write the description that would set one. That is why `none` is a legitimate resting state rather than an empty slot, and why there is no "off" click to undo, because there was never a switch.',
      },
    },
  },
};
