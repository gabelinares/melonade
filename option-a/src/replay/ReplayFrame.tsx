import { MousePointer2 } from 'lucide-react';
import './replay-frame.css';

export interface ReplayFrameProps {
  /** which step of the session's walk the cursor is on; -1 is "before it began" */
  markerIndex: number;
  /** a click just landed. Ignored on `still`, which draws a held ring instead. */
  clicking?: boolean;
  /** `live` follows a playhead; `still` is a frozen frame on a card */
  variant?: 'live' | 'still';
  /** the caller owns the SIZE. See the note below. */
  className?: string;
}

/* Where the cursor sits for the nth event. A fixed ring of positions rather
   than random ones: the same session draws the same path every time, which is
   what lets two screenshots of this screen be compared - and what makes a
   session card's thumbnail match the frame the player shows when you open it. */
const CURSOR_PATH = [
  { x: 26, y: 34 }, { x: 62, y: 41 }, { x: 48, y: 63 },
  { x: 50, y: 78 }, { x: 50, y: 78 }, { x: 31, y: 55 },
  { x: 68, y: 72 }, { x: 44, y: 30 },
] as const;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE recorded viewport, drawn twice: full size inside the player, and as the
 * thumbnail on a session card.
 *
 * It exists because the card needed a screenshot and the alternative was a
 * second, smaller wireframe that looked roughly like this one. Two drawings of
 * the same thing drift, and they drift silently: the card would keep showing a
 * checkout with three fields long after the player had four.
 *
 * IT DOES NOT SET ITS OWN SIZE. The player letterboxes it against the stage,
 * the card gives it the card's width at 16:10. Everything inside is measured in
 * container units against this element, so the identical markup scales from a
 * 1500px stage down to a 280px thumbnail with no second set of rules. That is
 * the only reason one component can serve both.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ReplayFrame({
  markerIndex,
  clicking = false,
  variant = 'live',
  className,
}: ReplayFrameProps) {
  const cursor = CURSOR_PATH[Math.max(0, markerIndex) % CURSOR_PATH.length] ?? CURSOR_PATH[0];

  return (
    <div className={`m-frame m-frame--${variant}${className ? ` ${className}` : ''}`}>
      {/* An obvious wireframe. Anyone looking at this must be able to tell in
          one second that it is not a recording, at either size. */}
      <div className="m-frame__page" aria-hidden="true">
        <span className="m-wf m-wf--nav" />
        <span className="m-wf m-wf--crumb" />
        <span className="m-wf m-wf--h" />
        <span className="m-wf m-wf--line" />
        <span className="m-wf m-wf--line m-wf--short" />
        <span className="m-wf m-wf--field" />
        <span className="m-wf m-wf--row">
          <i className="m-wf m-wf--field" />
          <i className="m-wf m-wf--field" />
        </span>
        <span className="m-wf m-wf--field" />
        <span className="m-wf m-wf--cta" />
        <span className="m-wf m-wf--side">
          <i className="m-wf m-wf--srow" />
          <i className="m-wf m-wf--srow" />
          <i className="m-wf m-wf--srow" />
          <i className="m-wf m-wf--stotal" />
        </span>
      </div>

      <span
        className={`m-frame__cursor${clicking ? ' is-clicking' : ''}`}
        style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        aria-hidden="true"
      >
        <MousePointer2 size={variant === 'still' ? 12 : 16} />
        <span className="m-frame__ripple" />
      </span>
    </div>
  );
}
