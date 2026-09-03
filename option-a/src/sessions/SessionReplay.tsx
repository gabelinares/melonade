import { useMemo } from 'react';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { displayNameOf, type SessionRow } from '@shared/sessions-data.ts';
import { replaySessionOf } from '@shared/session-replay.ts';
import { REPLAY_HOST, durationSeconds } from '@shared/replay.ts';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { seedFor } from '@shared/avatar.ts';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';
import './session-replay.css';

export interface SessionReplayProps {
  session: SessionRow;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE REPLAY, OPENED FROM THE LIST.
 *
 * Gabriel, 2026-09-04: clicking a row opens *"the same session replay we have
 * in issues"*.
 *
 * ── IT IS THE SAME PLAYER, AND THAT IS THE ENTIRE POINT ────────────────────
 * `ReplayPlayer` with its timeline and its frame, unchanged, fed by an adapter
 * in `shared/session-replay.ts`. The alternative - a second player built for
 * this list - is two components drifting apart over one design, and the replay
 * is explicitly a PLACEHOLDER this week (BACKLOG §22.5.5: "drop in the existing
 * issue-replay page"). So what is new here is a header and a back, and nothing
 * else.
 *
 * ── IT REPLACES THE PLANE RATHER THAN FLOATING OVER IT ─────────────────────
 * A drawer would have been less work and it would have been wrong. Production
 * opens `/session/:id` as a page; a replay is where you go, not something you
 * peek at over the list you left - it takes a viewport and holds attention for
 * minutes. A drawer over a table promises you are still in the table.
 *
 * The way back is a BACK ARROW naming the list, not a close X. The two look
 * alike and mean different things: an X dismisses something that interrupted
 * you, an arrow returns you to where you were, with the search and the page you
 * had still in place. That is what actually happens here.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SessionReplay({ session, onClose, onToggleBookmark }: SessionReplayProps) {
  /* ⚠ Keyed on the session id by the caller, so the clock restarts when you
     open a different row. Without it the head keeps whatever position it had. */
  const played = useMemo(() => replaySessionOf(session), [session]);
  const clock = useReplayClock(durationSeconds(played.dur));

  return (
    <div className="m-sreplay">
      <header className="m-sreplay__head">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeft size={15} />}
          onClick={onClose}
          className="m-sreplay__back"
        >
          Sessions
        </Button>

        {/* WHO, AND THE SAME ROBOT THE ROW WORE. An avatar that changed between
            the list and the page you opened from it would read as a different
            person - it is seeded on the identity, so it cannot. */}
        <SessionAvatar key={seedFor(session)} seed={seedFor(session)} size={22} />
        <span className="m-sreplay__who m-truncate">{displayNameOf(session)}</span>

        {/* The row's own facts, in the row's own order, so the header reads as
            the line you clicked rather than as a new description of it. */}
        <span className="m-sreplay__meta">
          {session.browser} on {session.os} · {session.city}, {session.country}
        </span>
        <span className="m-sreplay__meta">
          <RelativeTime minutesAgo={session.startedAgoMin} />
        </span>

        <span className="m-sreplay__spacer" />

        <Tooltip title={session.favorite ? 'Remove bookmark' : 'Bookmark this session'}>
          <IconButton
            icon={<Bookmark size={15} fill={session.favorite ? 'currentColor' : 'none'} />}
            label={session.favorite ? 'Remove bookmark' : 'Bookmark this session'}
            variant="ghost"
            onClick={() => onToggleBookmark(session.sessionId)}
          />
        </Tooltip>
        <Tooltip title="Copy link to this session">
          <IconButton icon={<Share2 size={15} />} label="Copy link" variant="ghost" />
        </Tooltip>
      </header>

      <div className="m-sreplay__body">
        <ReplayPlayer
          /* No issue: this row belongs to no issue, which is why the player
             takes a URL directly now. */
          url={`${REPLAY_HOST}/`}
          session={played}
          clock={clock}
        />
      </div>
    </div>
  );
}
