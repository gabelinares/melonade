import { useEffect, useRef, useState } from 'react';
import {
  MARK_ANIMATED_PROPS,
  MARK_REST,
  MARK_TURNED,
  MARK_VIEWBOX,
} from '@shared/brand-mark.ts';
import './brand-mark.css';

export interface BrandMarkProps {
  /** Rendered size in px. The nav uses 17; anything above ~14 holds. */
  size?: number;
  /** Turn the mark once shortly after mount, so the motion is seen without
   *  anyone having to guess that the logo is hoverable. Off inside Storybook
   *  grids, where several marks all flipping at once is just noise. */
  playOnMount?: boolean;
  /** Keep turning, out and back, for as long as this is true. This is the
   *  app's loader: the mark already has one honest piece of motion in it, so a
   *  spinner would be a second animation meaning the same thing. Ignored under
   *  prefers-reduced-motion, where the mark simply sits. */
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
 * In Graphite this is the only chromatic thing in the whole shell. That is not
 * a compromise of the monochrome rule, it is the strongest version of it: the
 * option's argument is that colour should be rationed until it means something,
 * and one watermelon glyph in an ink-and-paper interface means "this is
 * Melonade" and nothing else. The primary button stays ink, the accent stays
 * the one restrained teal, and the logo is neither.
 *
 * THE TURN IS NOT DECORATION AND IT IS NOT A TRANSFORM. The two rects trade
 * places - the disc becomes the small square and the square becomes the disc -
 * by animating five CSS geometry properties. The turned values arrive as custom
 * properties from `MARK_TURNED` rather than being typed into the stylesheet, so
 * the shape has exactly one definition. See the shared file for why both shapes
 * are rects and what the numbers are doing.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function BrandMark({ size = 17, playOnMount = false, loop = false, className }: BrandMarkProps) {
  const [turned, setTurned] = useState(false);
  const timers = useRef<number[]>([]);

  /* The loop drives the SAME `is-turned` state the mount flip and the hover
     use, so there is one turn in this component and three ways to ask for it. */
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
    timers.current.push(window.setTimeout(() => setTurned(false), 1120));
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [playOnMount, loop]);

  return (
    <svg
      className={`m-mark${turned ? ' is-turned' : ''}${className ? ` ${className}` : ''}`}
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={
        {
          /* Local, not tokens, despite this app's class prefix also being `m`:
             `--mark-*` keeps them clearly out of the `--m-*` token namespace. */
          '--mark-ax': `${MARK_TURNED.a.x}px`,
          '--mark-ay': `${MARK_TURNED.a.y}px`,
          '--mark-as': `${MARK_TURNED.a.size}px`,
          '--mark-ar': `${MARK_TURNED.a.rx}px`,
          '--mark-bx': `${MARK_TURNED.b.x}px`,
          '--mark-by': `${MARK_TURNED.b.y}px`,
          '--mark-bs': `${MARK_TURNED.b.size}px`,
          '--mark-br': `${MARK_TURNED.b.rx}px`,
          '--mark-props': MARK_ANIMATED_PROPS.join(', '),
        } as React.CSSProperties
      }
    >
      <g fill="currentColor">
        <rect
          className="m-mark__s m-mark__s--a"
          x={MARK_REST.a.x}
          y={MARK_REST.a.y}
          width={MARK_REST.a.size}
          height={MARK_REST.a.size}
          rx={MARK_REST.a.rx}
        />
        <rect
          className="m-mark__s m-mark__s--b"
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
