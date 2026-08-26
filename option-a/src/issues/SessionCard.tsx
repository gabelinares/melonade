import { Play } from 'lucide-react';
import type { IssueSession } from '@shared/issues-data.ts';
import { failureIndex, failureMoment } from '@shared/replay.ts';
import { Chip } from '../components/Chip.tsx';
import { ReplayFrame } from '../replay/ReplayFrame.tsx';
import './session-card.css';

export interface SessionCardProps {
  session: IssueSession;
  index: number;
  active: boolean;
  onOpen: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * One session, at triage density: the card you choose from.
 *
 * IT LEADS WITH THE FRAME. A picker for recordings without a still is a list of
 * filenames, and this card spent its first version being exactly that. The
 * thumbnail is now the largest thing on it.
 *
 * And it is not frame zero. Every session of one issue starts on the same page
 * and looks identical at 0:00, so the opening frame would give three identical
 * thumbnails and teach nothing. It is the FAILURE MOMENT: the cursor sits where
 * the click that broke this session landed, with the ring held on it. Three
 * sessions of one issue then look different from each other, which is the only
 * thing a thumbnail is here to do.
 *
 * It is the same `ReplayFrame` the player draws, at the card's width. Not a
 * smaller lookalike: two drawings of one page drift, and they drift silently.
 *
 * Below it, the VARIATION is the load-bearing line, not the email. Three
 * sessions of the same issue are not interchangeable - one person retried
 * twice, one gave up instantly, one was on a phone - and choosing between those
 * is the whole reason to pick a session rather than take the first.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SessionCard({ session, index, active, onOpen }: SessionCardProps) {
  const at = failureIndex(session);
  const moment = failureMoment(session);

  return (
    <button
      type="button"
      className={`m-scard${active ? ' is-active' : ''}`}
      onClick={onOpen}
      aria-label={`Watch session ${index + 1}: ${session.email}`}
    >
      <span className="m-scard__shot">
        <ReplayFrame className="m-scard__frame" variant="still" markerIndex={at} />

        {/* Duration where a video puts it. It comes off the meta line below,
            which was three facts in a row with no ranking between them. */}
        <span className="m-scard__dur m-mono">{session.dur}</span>

        {/* What this still IS, so the frame is evidence rather than decoration.
            Truncated hard: it is a label on a thumbnail, not a second variation. */}
        {moment && (
          <span className="m-scard__moment m-truncate" title={moment.label}>
            {moment.label}
          </span>
        )}

        <span className="m-scard__play" aria-hidden="true">
          <Play size={14} />
        </span>
      </span>

      <span className="m-scard__variation">{session.variation}</span>

      <span className="m-scard__foot">
        <span className="m-scard__who m-truncate">{session.email}</span>
        <Chip tone="neutral">{session.plan}</Chip>
      </span>

      {/* Device and place on ONE line with the identity above it rather than a
          third row. Every 20px this band gives back is 20px the write-up above
          it gets, and the write-up is the thing that has to fit on a laptop. */}
      <span className="m-scard__meta m-truncate">
        {session.browser} on {session.os}, {session.loc}
      </span>
    </button>
  );
}
