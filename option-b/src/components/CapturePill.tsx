import { useState } from 'react';
import { Popover, Switch } from '@mantine/core';
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
  /** `icon` puts the trigger in a toolbar beside the other icon controls; the
   *  panel behind it is the same panel. The wide pill wanted a row of its own
   *  under the column title, which is 40px of height spent saying "2 segments"
   *  to somebody who set that once a month. */
  variant?: 'pill' | 'icon';
}

/**
 * What the agent is watching, and page-level rather than a filter: a filter
 * narrows what you see, this changes what gets collected at all. So it sits
 * with the column title, not in the filter row.
 *
 * The two modes REPLACE each other. Segments do not add on top of full traffic,
 * they stand in for it, and saying that in a sentence next to the switch is far
 * cheaper than having somebody work it out from a sampling anomaly.
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
  const onSegments = mode === 'segments';
  const share = eligible
    .filter((s) => activeSegmentIds.includes(s.id))
    .reduce((sum, s) => sum + s.trafficPct, 0);

  return (
    <Popover opened={open} onChange={setOpen} position="bottom-start" width={300}>
      <Popover.Target>
        {variant === 'icon' ? (
          <IconButton
            icon={onSegments ? <Split size={15} /> : <Globe size={15} />}
            label={
              onSegments
                ? `Capturing ${activeSegmentIds.length} segment${activeSegmentIds.length === 1 ? '' : 's'}, about ${share}% of traffic`
                : 'Capturing full traffic'
            }
            count={onSegments ? activeSegmentIds.length : 0}
            active={onSegments}
            open={open}
            onClick={() => setOpen((o) => !o)}
          />
        ) : (
        <button
          type="button"
          className="b-capture"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={
            onSegments
              ? `Capturing ${activeSegmentIds.length} segments, about ${share} percent of traffic. Change what is captured.`
              : 'Capturing full traffic. Change what is captured.'
          }
        >
          <span className="b-capture__icon" aria-hidden="true">
            {onSegments ? <Split size={12} /> : <Globe size={12} />}
          </span>
          <span>
            {onSegments
              ? `${activeSegmentIds.length} segment${activeSegmentIds.length === 1 ? '' : 's'}`
              : 'Full traffic'}
          </span>
          {onSegments && <span className="b-capture__share">~{share}%</span>}
        </button>
        )}
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <div className="b-capture__panel">
          <div className="b-capture__mode">
            <Switch
              size="xs"
              checked={onSegments}
              onChange={(e) => onModeChange(e.currentTarget.checked ? 'segments' : 'full')}
              aria-label="Capture selected segments instead of full traffic"
            />
            <span className="b-capture__mode-label">
              {onSegments ? 'Capturing selected segments' : 'Capturing full traffic'}
            </span>
          </div>
          <p className="b-capture__note">
            {onSegments
              ? 'Segments replace full traffic. Turn this off and the agent samples everything again.'
              : 'The agent samples across all traffic. Turn this on to watch specific segments instead.'}
          </p>
          <div className="b-capture__list">
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
      </Popover.Dropdown>
    </Popover>
  );
}
