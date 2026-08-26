import { useEffect, useRef, useState } from 'react';
import {
  MARK_ANIMATED_PROPS,
  MARK_REST,
  MARK_TURNED,
  MARK_VIEWBOX,
} from '@shared/brand-mark.ts';
import './brand-mark.css';

export interface BrandMarkProps {
  /** Rendered size in px. The rail uses 18; anything above ~14 holds. */
  size?: number;
  /** Turn the mark once shortly after mount, so the motion is seen without
   *  anyone having to guess that the logo is hoverable. Off inside Storybook
   *  grids, where nine marks all flipping at once is just noise. */
  playOnMount?: boolean;
  /** Keep turning, out and back, for as long as this is true. This is the app's
   *  loader: the mark already has one honest piece of motion in it, so a
   *  spinner would have been a second, unrelated animation meaning the same
   *  thing. Ignored under prefers-reduced-motion, where the mark simply sits. */
  loop?: boolean;
  className?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE MELONADE MARK.
 *
 * Shape from `@shared/brand-mark.ts`, colour from the `brand-mark` role, and
 * that split is the point: the geometry is the same in both options because
 * there is one Melonade, and the colour is a token because the two options
 * disagree about everything else.
 *
 * It is watermelon, and it is the only watermelon thing in this app. The UI
 * accent here is plum, deliberately: watermelon sits 24 degrees from the danger
 * ramp, so an accent at that hue would put the selected row, the suggested-fix
 * panel and a red alarm in the same family and the impact signal would stop
 * meaning anything. A logo is identity rather than an accent, so it gets to
 * keep the brand hue while nothing else does.
 *
 * THE TURN IS NOT DECORATION AND IT IS NOT A TRANSFORM. The two rects trade
 * places - the disc becomes the small square and the square becomes the disc -
 * by animating five CSS geometry properties. The turned values arrive as custom
 * properties from `MARK_TURNED` rather than being typed into the stylesheet, so
 * the shape has exactly one definition. See the shared file for why both shapes
 * are rects and what the numbers are doing.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function BrandMark({ size = 18, playOnMount = false, loop = false, className }: BrandMarkProps) {
  const [turned, setTurned] = useState(false);
  const timers = useRef<number[]>([]);

  /* The loop drives the SAME `is-turned` state the mount flip and the hover
     use, so there is one turn in this component and three ways to ask for it.
     The interval is the transition duration plus a beat, so the mark arrives
     before it is asked to leave again and the motion reads as a turn rather
     than as a wobble. */
  useEffect(() => {
    if (!loop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setTurned(true);
    const id = window.setInterval(() => setTurned((t) => !t), 560);
    return () => {
      window.clearInterval(id);
      setTurned(false);
    };
  }, [loop]);

  useEffect(() => {
    if (loop) return;
    if (!playOnMount) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    /* out and back: one flip, then it settles. Long enough after mount that it
       does not collide with the shell's own first paint. */
    timers.current.push(window.setTimeout(() => setTurned(true), 420));
    timers.current.push(window.setTimeout(() => setTurned(false), 1180));
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [playOnMount, loop]);

  return (
    <svg
      className={`b-mark${turned ? ' is-turned' : ''}${className ? ` ${className}` : ''}`}
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={
        {
          '--b-mark-ax': `${MARK_TURNED.a.x}px`,
          '--b-mark-ay': `${MARK_TURNED.a.y}px`,
          '--b-mark-as': `${MARK_TURNED.a.size}px`,
          '--b-mark-ar': `${MARK_TURNED.a.rx}px`,
          '--b-mark-bx': `${MARK_TURNED.b.x}px`,
          '--b-mark-by': `${MARK_TURNED.b.y}px`,
          '--b-mark-bs': `${MARK_TURNED.b.size}px`,
          '--b-mark-br': `${MARK_TURNED.b.rx}px`,
          '--b-mark-props': MARK_ANIMATED_PROPS.join(', '),
        } as React.CSSProperties
      }
    >
      <g fill="currentColor">
        <rect
          className="b-mark__s b-mark__s--a"
          x={MARK_REST.a.x}
          y={MARK_REST.a.y}
          width={MARK_REST.a.size}
          height={MARK_REST.a.size}
          rx={MARK_REST.a.rx}
        />
        <rect
          className="b-mark__s b-mark__s--b"
          x={MARK_REST.b.x}
          y={MARK_REST.b.y}
          width={MARK_REST.b.size}
          height={MARK_REST.b.size}
          rx={MARK_REST.b.rx}
        />
      </g>
    </svg>
  );
}
