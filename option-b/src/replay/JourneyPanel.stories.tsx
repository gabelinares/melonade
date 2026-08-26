import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import { durationSeconds } from '@shared/replay.ts';
import { JourneyPanel } from './JourneyPanel.tsx';
import { ReplayTimeline } from './ReplayTimeline.tsx';
import { failureMoment, replayMarkers } from '@shared/replay.ts';
import { useReplayClock } from './useReplayClock.ts';

/* Four journeys worth looking at, and they are the four shapes this panel has
   to hold: five steps across two pages, four with the failure in the middle,
   three that never leave one page, and one that is a single clause. */
const PICKS = [
  { label: 'Card declined, 5 steps, ends on /cart', issue: 0, session: 0 },
  { label: 'Help Center 404, three page changes', issue: 8, session: 0 },
  { label: 'Slow checkout, the failure is a stall', issue: 3, session: 0 },
  { label: 'One clause, one step', issue: 2, session: 1 },
] as const;

function Harness({ pick }: { pick: number }) {
  const chosen = PICKS[pick] ?? PICKS[0];
  const issue = ISSUES[chosen.issue]!;
  const session = issue.sessions[chosen.session]!;
  const clock = useReplayClock(durationSeconds(session.dur));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 620 }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--m-surface-sunken)',
            color: 'var(--m-content-muted)',
            fontSize: 'var(--m-text-xs)',
          }}
        >
          The player would be here.
        </div>
        <JourneyPanel issue={issue} session={session} clock={clock} />
      </div>
      {/* The real transport, because the panel's whole argument is that it
          tracks the playhead: press play and watch the thread fill. */}
      <ReplayTimeline
        clock={clock}
        markers={replayMarkers(session)}
        failure={failureMoment(session)}
      />
    </div>
  );
}

const meta = {
  title: 'Replay/JourneyPanel',
  component: Harness,
  args: { pick: 0 },
  argTypes: {
    pick: {
      control: 'inline-radio',
      options: PICKS.map((_, i) => i),
      labels: Object.fromEntries(PICKS.map((p, i) => [i, p.label])),
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'THE JOURNEY, BESIDE THE REPLAY. It stands where the issue queue used to, and that ' +
          'swap is the argument: the queue answers "which issue", and by the time a recording ' +
          'is playing you have answered that twice. What is unanswered is what this person did, ' +
          'in what order, and which second to look at.\n\n' +
          '**It is a scrubber, not a summary.** Every row seeks. Press play on the transport ' +
          'below and the thread fills in the accent behind the playhead, so the column reports ' +
          'position as well as content.\n\n' +
          'Three things earn a row and nothing else does. The **glyph** says what kind of event ' +
          'it was, from the same table the track colours its markers from. The **page** is ' +
          'printed once, on the step that arrives on it, because a path repeated down every row ' +
          'is a column of identical text that teaches nothing; printed on change it becomes the ' +
          "chapter heading of the session, and the thread runs on behind it so a page change " +
          'does not cut the journey in two. The **failure** is marked in the danger colour, and ' +
          'marked only there: the temptation is to grey out everything after it as aftermath, ' +
          'and that is wrong. What the person did after it broke is frequently the most useful ' +
          'part of the recording, the retries and the hunt for an error message and the ' +
          'abandonment. The steps that follow are ordinary steps.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ManyPages: Story = { args: { pick: 1 } };
export const StallAsFailure: Story = { args: { pick: 2 } };
export const SingleStep: Story = { args: { pick: 3 } };
