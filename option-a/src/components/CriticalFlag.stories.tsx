import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { CriticalFlag, type CriticalState } from './CriticalFlag.tsx';

const STATES: readonly { state: CriticalState; caption: string; matchedBy?: string }[] = [
  { state: 'none', caption: 'none' },
  { state: 'team', caption: 'team', matchedBy: 'Mehdi O.' },
  { state: 'mine', caption: 'mine' },
  { state: 'dismissed', caption: 'dismissed' },
];

const meta = {
  title: 'Components/CriticalFlag',
  component: CriticalFlag,
  args: { state: 'mine', onClick: action('open the critical dialog') },
  argTypes: {
    state: { control: 'inline-radio', options: ['none', 'team', 'mine', 'dismissed'] },
  },
} satisfies Meta<typeof CriticalFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 28 }}>
      {STATES.map((s) => (
        <div key={s.state} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <CriticalFlag
            state={s.state}
            matchedBy={s.matchedBy}
            onClick={action(`flag clicked: ${s.state}`)}
          />
          <span style={{ fontSize: 'var(--m-text-2xs)', color: 'var(--m-content-muted)' }}>
            {s.caption}
          </span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The four states together, which is the only arrangement that answers the question this component was rebuilt for. In the live app "a teammate flagged it" and "I flagged it" are pixel-identical, to the point that the product owner did not know the distinction existed. Here ownership moves the fill and severity keeps the glyph, so the triangle never changes shape when the owner changes. Read left to right: no description matches, a teammate\'s matches, mine matches, and I dropped it for myself, which stays legible as a dashed outline rather than disappearing.',
      },
    },
  },
};

export const Interactive: Story = {
  args: { state: 'team', matchedBy: 'Mehdi O.' },
  parameters: {
    docs: {
      description: {
        story:
          'A live click, logged to the Actions panel. The handler is the whole contract: this control never sets a flag, it opens the place you write the description that would set one, because criticality here is derived from words somebody wrote rather than toggled per issue. The click also stops propagation, since in the table the same row opens the write-up.',
      },
    },
  },
};
