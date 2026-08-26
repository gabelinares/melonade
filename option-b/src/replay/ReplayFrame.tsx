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
    <div className={`b-frame b-frame--${variant}${className ? ` ${className}` : ''}`}>
      {/* An obvious wireframe. Anyone looking at this must be able to tell in
          one second that it is not a recording, at either size. */}
      <div className="b-frame__page" aria-hidden="true">
        <span className="b-wf b-wf--nav" />
        <span className="b-wf b-wf--crumb" />
        <span className="b-wf b-wf--h" />
        <span className="b-wf b-wf--line" />
        <span className="b-wf b-wf--line b-wf--short" />
        <span className="b-wf b-wf--field" />
        <span className="b-wf b-wf--row">
          <i className="b-wf b-wf--field" />
          <i className="b-wf b-wf--field" />
        </span>
        <span className="b-wf b-wf--field" />
        <span className="b-wf b-wf--cta" />
        <span className="b-wf b-wf--side">
          <i className="b-wf b-wf--srow" />
          <i className="b-wf b-wf--srow" />
          <i className="b-wf b-wf--srow" />
          <i className="b-wf b-wf--stotal" />
        </span>
      </div>

      <span
        className={`b-frame__cursor${clicking ? ' is-clicking' : ''}`}
        style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        aria-hidden="true"
      >
        <MousePointer2 size={variant === 'still' ? 12 : 16} />
        <span className="b-frame__ripple" />
      </span>
    </div>
  );
}
