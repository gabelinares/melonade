import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { DEFAULT_ACTIVE_SEGMENTS, type CaptureMode } from '@shared/issues-logic.ts';
import { CapturePill } from './CapturePill.tsx';

/** The pill owns no state, so a story has to hold it: the two modes replace
 *  each other, and that rule only shows up when the switch really moves. */
function Harness({ initialMode }: { initialMode: CaptureMode }) {
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [active, setActive] = useState<number[]>(DEFAULT_ACTIVE_SEGMENTS);

  return (
    <CapturePill
      mode={mode}
      onModeChange={setMode}
      activeSegmentIds={active}
      onToggleSegment={(id) =>
        setActive((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
      }
    />
  );
}

const meta = {
  title: 'Components/CapturePill',
  component: CapturePill,
  /* `mode` seeds the harness; the two handlers are here so the props table is
     complete, and the harness replaces them with real state setters. */
  args: {
    mode: 'segments',
    activeSegmentIds: DEFAULT_ACTIVE_SEGMENTS,
    onModeChange: action('mode change'),
    onToggleSegment: action('toggle segment'),
  },
  argTypes: { mode: { control: 'inline-radio', options: ['full', 'segments'] } },
} satisfies Meta<typeof CapturePill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullTraffic: Story = {
  args: { mode: 'full' },
  render: (args) => <Harness key={args.mode} initialMode={args.mode} />,
  parameters: {
    docs: {
      description: {
        story:
          'The agent is sampling everything. This pill sits beside the page title rather than in the filter row, and the distinction is load-bearing: a filter narrows what you see, this changes what gets collected at all, so putting it among the filters would invite someone to "just clear it" and quietly stop the data. Open it and the note under the switch says what turning it on would do, in words.',
      },
    },
  },
};

export const Segments: Story = {
  args: { mode: 'segments' },
  render: (args) => <Harness key={args.mode} initialMode={args.mode} />,
  parameters: {
    docs: {
      description: {
        story:
          'Segments mode, showing the count and the approximate share of traffic it adds up to. The share is the whole reason the number is here: two segments could be 4% or 60% of the day, and the pill has to answer that without being opened. The two modes REPLACE each other, segments do not stack on top of full traffic, and saying so next to the switch is cheaper than having someone discover it from a sampling anomaly weeks later. Only team-visible segments are offered, since a private query cannot drive what the whole project captures.',
      },
    },
  },
};
