import { useMemo, useState } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { App, Tooltip } from 'antd';
import { displayNameOf, type SessionRow } from '@shared/sessions-data.ts';
import { replaySessionOf } from '@shared/session-replay.ts';
import { REPLAY_HOST, durationSeconds, replayMarkers } from '@shared/replay.ts';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { seedFor } from '@shared/avatar.ts';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { ReplayIdentity, ReplayScreen } from '../replay/ReplayScreen.tsx';
import { MarkersPanel } from '../replay/MarkersPanel.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';

export interface SessionReplayProps {
  session: SessionRow;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
}

/**
 * A SESSION, OPENED FROM A LIST - Recordings, a person's page, an activity
 * row, a card's drill-down. ⚠ ONE SCREEN (2026-09-14): this renders
 * `ReplayScreen` with the session's own lead and verbs, exactly as the issue
 * pane, the spot and the live visitor do. The lead is the row's avatar on the
 * SAME seed, so the person you clicked is the person you land on; the panel
 * holds the session's activity as a list you can seek from.
 */
export function SessionReplay({ session, onClose, onToggleBookmark }: SessionReplayProps) {
  const { message } = App.useApp();
  const played = useMemo(() => replaySessionOf(session), [session]);
  const markers = useMemo(() => replayMarkers(played), [played]);
  const clock = useReplayClock(durationSeconds(played.dur));
  const [panel, setPanel] = useState<string | null>(null);

  return (
    <ReplayScreen
      className="m-sreplay"
      back={{ label: 'Sessions', onClick: onClose }}
      lead={
        <ReplayIdentity
          seed={seedFor(session)}
          name={displayNameOf(session)}
          meta={
            <>
              <span>
                {session.browser} on {session.os} · {session.city}, {session.country}
              </span>
              <span>·</span>
              <RelativeTime minutesAgo={session.startedAgoMin} />
            </>
          }
        />
      }
      actions={
        <>
          <Tooltip title={session.favorite ? 'Remove bookmark' : 'Bookmark this session'}>
            <span>
              <IconButton
                icon={<Bookmark size={15} fill={session.favorite ? 'currentColor' : 'none'} />}
                label={session.favorite ? 'Remove bookmark' : 'Bookmark this session'}
                variant="ghost"
                onClick={() => onToggleBookmark(session.sessionId)}
              />
            </span>
          </Tooltip>
          <Tooltip title="Copy link to this session">
            <span>
              <IconButton icon={<Share2 size={15} />} label="Copy link" variant="ghost" onClick={() => message.success('Link copied')} />
            </span>
          </Tooltip>
        </>
      }
      panels={[{ key: 'activity', label: 'Activity', count: markers.length, hint: 'What happened, in order' }]}
      panel={panel}
      onPanel={setPanel}
      renderPanel={() => <MarkersPanel markers={markers} clock={clock} startLabel="Session start" />}
    >
      <ReplayPlayer url={`${REPLAY_HOST}/`} session={played} clock={clock} />
    </ReplayScreen>
  );
}
