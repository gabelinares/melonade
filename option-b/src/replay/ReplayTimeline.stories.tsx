import type { Meta, StoryObj } from '@storybook/react-vite';
import { ISSUES } from '@shared/issues-data.ts';
import { durationSeconds, failureMoment, replayMarkers } from '@shared/replay.ts';
import { ReplayTimeline } from './ReplayTimeline.tsx';
import { useReplayClock } from './useReplayClock.ts';

const SESSION = ISSUES[0]!.sessions[0]!;

function Harness() {
  const clock = useReplayClock(durationSeconds(SESSION.dur));
  return (
    <div style={{ background: 'var(--m-surface-default)' }}>
      <ReplayTimeline
        clock={clock}
        markers={replayMarkers(SESSION)}
        failure={failureMoment(SESSION)}
      />
    </div>
  );
}

const meta = {
  title: 'Replay/ReplayTimeline',
  component: Harness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "The transport, the track and the markers as one control bar. **The markers are the " +
          "session's own journey**, split on its clauses, so the track is a sentence rather than " +
          'a scrubber with dots on it. Hover one and it names what the person did; click it and ' +
          'you go there. A generic timeline would have proved nothing except that a timeline fits.\n\n' +
          'Colour carries kind, and only three kinds are allowed to be loud: an error, a rage ' +
          'burst and a stall are the three things worth scrubbing to. Everything else is a quiet ' +
          'tick, present so the loud ones have a rhythm to stand out from.\n\n' +
          '"Jump to the failure" is a first-class labelled control, not a marker like the others. ' +
          'Someone arriving here already knows what went wrong - they read it one collapse ago. ' +
          'What they want is the eight seconds where it happened, and making them hunt for it on ' +
          'a track is the small indignity this whole flow exists to remove.\n\n' +
          'Everything on this bar is live, including the drag.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
