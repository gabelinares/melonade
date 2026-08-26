import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import { durationSeconds } from '@shared/replay.ts';
import { ReplayPlayer } from './ReplayPlayer.tsx';
import { useReplayClock } from './useReplayClock.ts';

const ISSUE = ISSUES[0]!;

function Harness({ sessionIndex }: { sessionIndex: number }) {
  const session = ISSUE.sessions[sessionIndex] ?? ISSUE.sessions[0]!;
  /* The app hands the player a playhead it shares with the journey panel, so
     the story has to own one too rather than let the player make its own. */
  const clock = useReplayClock(durationSeconds(session.dur));
  return (
    <div style={{ display: 'flex', height: 640 }}>
      <ReplayPlayer issue={ISSUE} session={session} clock={clock} />
    </div>
  );
}

const meta = {
  title: 'Replay/ReplayPlayer',
  component: Harness,
  args: { sessionIndex: 0 },
  argTypes: { sessionIndex: { control: { type: 'range', min: 0, max: 2, step: 1 } } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The content is a mock. The CLOCK is not: play, pause, scrub, speed, the marker jumps ' +
          'and "jump to the failure" all move a real number that everything else reads from.\n\n' +
          'That split is the only honest way to prototype this. Faking a recording of a real page ' +
          'would produce a screenshot with buttons drawn on it, and would quietly claim the ' +
          'product can already do something it cannot. What is actually being designed is the ' +
          'FRAME: how much room the replay gets, what stays on screen beside it, how you move ' +
          'between the sessions of one issue, and how you get back. None of that needs real pixels.\n\n' +
          'So the viewport is an obvious wireframe, and it earns its place by being informative ' +
          "rather than pretty: **the timeline's markers are the session's own journey string, " +
          'split on its clauses.** Hover one and it names what the person did; the caption under ' +
          'the cursor tracks the clause the playhead is inside. Scrub the track and you read the ' +
          'story - and it is guaranteed to agree with the write-up, because it is the same sentence.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/* The shortest session in the set: three journey clauses instead of five, which
   is what the marker spread has to hold at. */
export const ShortSession: Story = { args: { sessionIndex: 2 } };
