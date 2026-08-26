import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { ISSUES } from '@shared/issues-data.ts';
import { SessionCard } from './SessionCard.tsx';

const ISSUE = ISSUES[0]!;

const meta = {
  title: 'Issues/SessionCard',
  component: SessionCard,
  args: { session: ISSUE.sessions[0]!, index: 0, active: false, onOpen: action('watch') },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', width: '22rem', padding: '1.5rem', background: 'var(--m-surface-sunken)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'One session at triage density. The variation gets the reading size and three lines; ' +
          'the identity drops to a quiet line beneath it. The whole card is the target - the ' +
          '"Watch" affordance says what a click does without becoming a second hit area competing ' +
          'with the card it sits in.\n\n' +
          'It sits on the sunken band on purpose. On the pane\'s own surface a card with a ' +
          'hairline border is invisible in dark mode: the border and the two grounds land within ' +
          'four Oklab points of each other. Caught on the render, not in review.',
      },
    },
  },
} satisfies Meta<typeof SessionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* The dataset holds one variation that runs past three lines and one that sits
   at exactly three: together they are the clamp test, so both ship as stories. */
export const Clamped: Story = { args: { session: ISSUE.sessions[0]! } };
export const Short: Story = { args: { session: ISSUE.sessions[2]!, index: 2 } };
export const Active: Story = { args: { active: true } };
