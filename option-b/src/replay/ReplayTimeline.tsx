import { useCallback, useRef } from 'react';
import { Tooltip } from '@mantine/core';
import { Pause, Play, Zap } from 'lucide-react';
import { formatClock, type ReplayMarker } from '@shared/replay.ts';
import { IconButton } from '../components/IconButton.tsx';
import { REPLAY_SPEEDS, type ReplayClock } from './useReplayClock.ts';
import './replay-timeline.css';

export interface ReplayTimelineProps {
  clock: ReplayClock;
  markers: readonly ReplayMarker[];
  /** the moment the issue bit, offered as one button rather than a hunt */
  failure: ReplayMarker | null;
  /** rendered at the right end of the bar, after the speed strip */
  trailing?: React.ReactNode;
}

/**
 * The transport, the track and the markers, as one control bar.
 *
 * ONE IDEA: the markers are the session's own journey, so the track is a
 * sentence rather than a scrubber with dots on it. Hovering a marker names the
 * thing the person did; clicking it goes there. That is why this is worth
 * having in a design prototype at all - a generic timeline would prove nothing
 * except that a timeline fits.
 *
 * "Jump to the failure" is a first-class control and not a marker like the
 * others. Someone arriving here already knows what went wrong: they read it
 * one collapse ago. What they want is the eight seconds where it happened, and
 * making them find it on a track is the small indignity this whole flow exists
 * to remove.
 */
export function ReplayTimeline({ clock, markers, failure, trailing }: ReplayTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = clock.duration > 0 ? (clock.at / clock.duration) * 100 : 0;

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      clock.seek(ratio * clock.duration);
    },
    [clock],
  );

  /* Pointer capture rather than window listeners: the drag keeps working when
     the cursor leaves the 6px track, and it cleans itself up on release without
     a effect that has to remember to unsubscribe. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromEvent(e.clientX);
  };

  return (
    <div className="b-tl">
      <IconButton
        icon={clock.playing ? <Pause size={15} /> : <Play size={15} />}
        label={clock.playing ? 'Pause (Space)' : 'Play (Space)'}
        variant="ghost"
        onClick={clock.toggle}
      />

      <span className="b-tl__clock m-mono">{formatClock(clock.at)}</span>

      {/* The track is a slider for assistive tech and a div for the pointer.
          A native range input cannot carry the markers, and the markers are the
          whole point of this track. */}
      <div
        className="b-tl__track"
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Session position"
        aria-valuemin={0}
        aria-valuemax={Math.round(clock.duration)}
        aria-valuenow={Math.round(clock.at)}
        aria-valuetext={formatClock(clock.at)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); clock.seek(clock.at + 5); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); clock.seek(clock.at - 5); }
        }}
      >
        <span className="b-tl__rail" aria-hidden="true" />
        <span className="b-tl__fill" style={{ width: `${pct}%` }} aria-hidden="true" />

        {markers.map((m, i) => (
          <Tooltip
            key={`${m.at}-${i}`}
            label={`${formatClock(m.at)}  ${m.label}`}
            position="top"
            multiline
            w={260}
            withArrow
          >
            <button
              type="button"
              className={`b-tl__mark b-tl__mark--${m.kind}${clock.at >= m.at ? ' is-past' : ''}`}
              style={{ left: `${(m.at / clock.duration) * 100}%` }}
              aria-label={`Jump to ${formatClock(m.at)}: ${m.label}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => clock.seek(m.at)}
            />
          </Tooltip>
        ))}

        <span className="b-tl__head" style={{ left: `${pct}%` }} aria-hidden="true" />
      </div>

      <span className="b-tl__clock b-tl__clock--total m-mono">{formatClock(clock.duration)}</span>

      {failure && (
        <button
          type="button"
          className="b-tl__jump"
          onClick={() => { clock.seek(Math.max(0, failure.at - 4)); clock.play(); }}
          title={failure.label}
        >
          <Zap size={12} aria-hidden="true" />
          Jump to the failure
        </button>
      )}

      <div className="b-tl__speeds" role="group" aria-label="Playback speed">
        {REPLAY_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`b-tl__speed${clock.speed === s ? ' is-on' : ''}`}
            aria-pressed={clock.speed === s}
            onClick={() => clock.setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      {trailing}
    </div>
  );
}
