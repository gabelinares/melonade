import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReplayClock {
  /** current position, seconds */
  at: number;
  playing: boolean;
  speed: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setSpeed: (x: number) => void;
}

const SPEEDS = [1, 2, 4, 8] as const;

/**
 * The playhead, and only the playhead.
 *
 * The player's content is a mock. Its CLOCK is not: play, pause, scrub, speed
 * and the marker jumps all move a real number that everything else reads from.
 * That is the difference between a prototype you can judge and a screenshot
 * with buttons drawn on it - and this codebase already has the rule that
 * nothing which looks like a button may be unclickable.
 *
 * requestAnimationFrame rather than setInterval, because a 100ms interval
 * visibly stutters against a 60Hz repaint and the scrubber is the one element
 * where that is obvious. The elapsed time is measured from the frame timestamp
 * the browser hands us, so a backgrounded tab resumes at the right position
 * instead of fast-forwarding through the frames it missed.
 */
export interface ReplayClockOptions {
  /** Called once when the head reaches the end. The one event on this screen
   *  that can move the reader without them asking, which is why it is a
   *  callback the caller opts into rather than something the hook does. */
  onEnded?: () => void;
}

export function useReplayClock(duration: number, options: ReplayClockOptions = {}): ReplayClock {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const frame = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  /* read inside the rAF loop, which must not re-subscribe on every tick */
  const speedRef = useRef(speed);
  speedRef.current = speed;

  /* The head, mirrored. The loop advances THIS and pushes it into state, rather
     than advancing state with a functional updater, for one reason: reaching
     the end has to call `onEnded`, and calling out of an updater is a side
     effect in the render phase, which React is allowed to run twice. From the
     rAF callback it is an ordinary event handler and it fires exactly once.

     The first attempt put the check in an effect on `at >= duration` instead.
     That looked safe and was not: switching sessions changes `duration` a
     render before the reset effect zeroes `at`, so for one render an old
     position sat past a new, shorter duration and the callback fired again -
     autoplay advanced two sessions per recording, which is precisely the class
     of bug this comment now exists to prevent a third time. */
  const atRef = useRef(0);

  const onEnded = useRef(options.onEnded);
  onEnded.current = options.onEnded;

  useEffect(() => {
    if (!playing) return;
    last.current = null;

    const tick = (now: number) => {
      if (last.current != null) {
        const next = atRef.current + ((now - last.current) / 1000) * speedRef.current;
        if (next >= duration) {
          atRef.current = duration;
          setAt(duration);
          setPlaying(false);
          onEnded.current?.();
          return;
        }
        atRef.current = next;
        setAt(next);
      }
      last.current = now;
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
      last.current = null;
    };
  }, [playing, duration]);

  /* A new session is a new recording: the head goes home and playback stops.
     Leaving it running would start the next session mid-way through, which is
     the kind of thing that reads as a bug rather than as a feature. */
  useEffect(() => {
    atRef.current = 0;
    setAt(0);
    setPlaying(false);
  }, [duration]);

  const seek = useCallback(
    (seconds: number) => {
      const to = Math.min(duration, Math.max(0, seconds));
      atRef.current = to;
      setAt(to);
    },
    [duration],
  );

  return {
    at,
    playing,
    speed,
    duration,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    toggle: useCallback(() => setPlaying((p) => !p), []),
    seek,
    setSpeed: useCallback(
      (x: number) => setSpeed(SPEEDS.includes(x as (typeof SPEEDS)[number]) ? x : 1),
      [],
    ),
  };
}

export const REPLAY_SPEEDS = SPEEDS;
