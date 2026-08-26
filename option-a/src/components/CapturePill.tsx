import { Popover, Switch } from 'antd';
import { useState } from 'react';
import { Globe, Split } from 'lucide-react';
import { SEGMENTS } from '@shared/issues-data.ts';
import type { CaptureMode } from '@shared/issues-logic.ts';
import { CheckRow } from './CheckRow.tsx';
import { IconButton } from './IconButton.tsx';
import './capture-pill.css';

export interface CapturePillProps {
  mode: CaptureMode;
  onModeChange: (m: CaptureMode) => void;
  activeSegmentIds: number[];
  onToggleSegment: (id: number) => void;
  /** `icon` puts the trigger in the toolbar beside the filter and display
   *  controls; the panel behind it is the same panel. The wide pill wanted a
   *  line of its own under the title, which is height spent saying "2 segments"
   *  to somebody who sets that once a month - and it read as a filter chip while
   *  being the opposite of one. */
  variant?: 'pill' | 'icon';
}

/**
 * What the agent is watching. This is page-level state, not a filter, so it
 * sits with the title rather than in the filter row: a filter narrows what you
 * see, this changes what gets collected at all.
 *
 * The two modes REPLACE each other: segments do not add on top of full traffic,
 * they stand in for it. Saying that in words next to the switch is cheaper than
 * having somebody discover it from a sampling anomaly.
 */
export function CapturePill({
  mode,
  onModeChange,
  activeSegmentIds,
  onToggleSegment,
  variant = 'pill',
}: CapturePillProps) {
  const [open, setOpen] = useState(false);
  const eligible = SEGMENTS.filter((s) => s.isPublic);
  const activeCount = activeSegmentIds.length;
  const onSegments = mode === 'segments';
  const share = eligible
    .filter((s) => activeSegmentIds.includes(s.id))
    .reduce((sum, s) => sum + s.trafficPct, 0);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      content={
        <div className="m-capture__panel">
          <div className="m-capture__mode">
            <Switch
              size="small"
              checked={onSegments}
              onChange={(v) => onModeChange(v ? 'segments' : 'full')}
              aria-label="Capture selected segments instead of full traffic"
            />
            <span className="m-capture__mode-label">
              {onSegments ? 'Capturing selected segments' : 'Capturing full traffic'}
            </span>
          </div>
          <p className="m-capture__note">
            {onSegments
              ? 'Segments replace full traffic. Turn this off and the agent samples everything again.'
              : 'The agent samples across all traffic. Turn this on to watch specific segments instead.'}
          </p>
          <div className="m-capture__list">
            {eligible.map((s) => (
              <CheckRow
                key={s.id}
                on={onSegments && activeSegmentIds.includes(s.id)}
                onToggle={() => onToggleSegment(s.id)}
                meta={`${s.trafficPct}%`}
              >
                {s.name}
              </CheckRow>
            ))}
          </div>
        </div>
      }
    >
      {variant === 'icon' ? (
        /* The SAME IconButton the filter and display triggers use, so a group of
           three is one height, one radius and one badge treatment. What the
           glyph carries is the mode - a globe for everything, a split for
           segments - and the badge carries how many, which is the pill's whole
           text in the space of an icon. */
        <IconButton
          icon={onSegments ? <Split size={15} /> : <Globe size={15} />}
          label={
            onSegments
              ? `Capturing ${activeCount} segment${activeCount === 1 ? '' : 's'}, about ${share}% of traffic`
              : 'Capturing full traffic'
          }
          count={onSegments ? activeCount : 0}
          active={onSegments}
          open={open}
        />
      ) : (
      <button
        type="button"
        className="m-capture"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          onSegments
            ? `Capturing ${activeCount} segments, about ${share} percent of traffic. Change what is captured.`
            : 'Capturing full traffic. Change what is captured.'
        }
      >
        <span className="m-capture__icon" aria-hidden="true">
          {onSegments ? <Split size={12} /> : <Globe size={12} />}
        </span>
        <span>
          {onSegments ? `${activeCount} segment${activeCount === 1 ? '' : 's'}` : 'Full traffic'}
        </span>
        {onSegments && <span className="m-capture__share">~{share}%</span>}
      </button>
      )}
    </Popover>
  );
}
