import { useMemo } from 'react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { REPLAY_HOST, failureMoment, replayMarkers, replayUrl } from '@shared/replay.ts';
import { ReplayFrame } from './ReplayFrame.tsx';
import { ReplayTimeline } from './ReplayTimeline.tsx';
import type { ReplayClock } from './useReplayClock.ts';
import './replay-player.css';

export interface ReplayPlayerProps {
  /** ⚠ OPTIONAL SINCE 2026-09-04, and the only thing it was ever read for is
   *  the URL in the chrome. The sessions list opens this same player on a row
   *  that belongs to no issue, so the URL comes in directly there. Nothing else
   *  in here touches the issue. */
  issue?: Issue;
  /** Overrides `replayUrl(issue)`. Exactly one of the two has to be given. */
  url?: string;
  session: IssueSession;
  /* The playhead is owned by the work pane, not by the player, because the
     journey panel beside it drives the same head and reads the same position.
     Two clocks would be two recordings. */
  clock: ReplayClock;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE PLAYER. The content is a mock; the CLOCK, the track and every control on
 * it are real.
 *
 * That split is deliberate and it is the only honest way to prototype this.
 * Faking a recording of a real page would produce a screenshot with buttons
 * drawn on it - nothing to judge, and it would quietly claim the product can
 * do something it cannot do yet. What IS being designed here is the frame: how
 * much room the replay gets, what stays on screen beside it, how you move
 * between the sessions of one issue, and how you get back. All of that is
 * judgeable against a wireframe and none of it needs real pixels.
 *
 * So the viewport is drawn as an obvious wireframe rather than a convincing
 * fake, and it earns its place by being INFORMATIVE: the cursor walks the
 * session's own journey, and the caption under it names the clause the
 * playhead is currently inside. Scrub the track and you read the story. A
 * pretty fake page would have said less.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ReplayPlayer({ issue, url, session, clock }: ReplayPlayerProps) {
  const markers = useMemo(() => replayMarkers(session), [session]);
  const failure = useMemo(() => failureMoment(session), [session]);

  /* The last marker the head has passed: what is happening right now. */
  const activeIndex = useMemo(() => {
    let i = -1;
    markers.forEach((m, n) => { if (clock.at >= m.at) i = n; });
    return i;
  }, [markers, clock.at]);

  const active = activeIndex >= 0 ? markers[activeIndex] : null;
  /* a click lands within a second of a marker, and rage clicks repeat */
  const justClicked = active != null && clock.at - active.at < 1;

  return (
    <section className="m-player" aria-label="Session replay">
      <div className="m-player__chrome">
        <span className="m-player__lights" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="m-player__url m-mono m-truncate">{url ?? (issue ? replayUrl(issue) : REPLAY_HOST)}</span>
        <span className="m-player__env">
          {session.browser} on {session.os} · {session.loc}
        </span>
      </div>

      <div className="m-player__stage">
        {/* Letterboxed: a 16:10 viewport centred in whatever room the pane has,
            which is how a recording of a wider screen sits inside a narrower
            pane. It also gives the cursor a stable coordinate space - positioned
            against the stage instead, the same session would put the pointer
            somewhere different at every window size.
            The frame itself is the SAME component a session card uses for its
            thumbnail, so the still you clicked and the frame you land on are
            drawn by one set of rules. */}
        <ReplayFrame
          className="m-player__viewport"
          markerIndex={activeIndex}
          clicking={justClicked}
        />

        {/* The caption is the point of the wireframe: it says what the person is
            doing at this instant, in the words of the write-up upstairs. */}
        <p className="m-player__caption" aria-live="polite">
          {active ? active.label : 'Session start'}
        </p>
      </div>

      {/* No width toggle down here. Widening the player means collapsing the
          panel beside it, and that control lives in the pane header with the
          other panel toggles - one action, one button, one place to look. */}
      <ReplayTimeline clock={clock} markers={markers} failure={failure} />
    </section>
  );
}
