import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { DEFAULT_ACTIVE_SEGMENTS, type CaptureMode } from '@shared/issues-logic.ts';
import { CapturePill } from './CapturePill.tsx';

/** The pill owns the popover but none of the data, so a story has to hold both
 *  the mode and the active set. Real state is not optional here: the rule this
 *  component exists to communicate is that the two modes REPLACE each other, and
 *  that only shows up when the switch and the rows actually move. */
function Harness({ initialMode }: { initialMode: CaptureMode }) {
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [active, setActive] = useState<number[]>(DEFAULT_ACTIVE_SEGMENTS);

  return (
    <CapturePill
      mode={mode}
      onModeChange={(m) => {
        action('mode change')(m);
        setMode(m);
      }}
      activeSegmentIds={active}
      onToggleSegment={(id) => {
        action('toggle segment')(id);
        setActive((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
      }}
    />
  );
}

const meta = {
  title: 'Components/CapturePill',
  component: CapturePill,
  /* `mode` seeds the harness; the two handlers are here so the props table is
     complete, and the harness wraps them around real state setters. */
  args: {
    mode: 'segments',
    activeSegmentIds: DEFAULT_ACTIVE_SEGMENTS,
    onModeChange: action('mode change'),
    onToggleSegment: action('toggle segment'),
  },
  argTypes: { mode: { control: 'inline-radio', options: ['full', 'segments'] } },
  parameters: {
    docs: {
      description: {
        component:
          'What the agent is watching. It sits with the column title rather than in the filter row, and that placement is load-bearing: a filter narrows what you see, this changes what gets collected at all, so putting it among the filters would invite somebody to "just clear it" and quietly stop the data. Open it in either story below; the popover is live.',
      },
    },
  },
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
          'The agent is sampling everything, and the pill says so in two words rather than showing an empty selector. Open it and read the note under the switch: it describes what turning the switch ON would do, in a sentence, because the alternative is somebody working out the sampling model from an anomaly three weeks later. The globe glyph is the other half of that: the two modes have to be distinguishable while the popover is shut.',
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
          'Segments mode, showing the count and the approximate share of traffic those segments add up to. The share is the whole reason the number is on the pill: two segments could be 4% of the day or 60% of it, and the reader has to be able to answer that without opening anything. Toggle a few rows and watch it move. Two rules are visible in here and nowhere else: the modes REPLACE each other rather than stack, which is why the note says so beside the switch instead of leaving it to be discovered, and only team-visible segments are offered, since a private saved search cannot be allowed to drive what the whole project captures.',
      },
    },
  },
};
