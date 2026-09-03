import {
  OR_INNER,
  OR_OUTLINE,
  OR_VIEWBOX,
} from '@shared/openreplay-mark.ts';
import './openreplay-mark.css';

export interface OpenReplayMarkProps {
  /** Rendered height in px. The nav uses 17. */
  size?: number;
  className?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE OPENREPLAY MARK.
 *
 * Mehdi, 2026-09-02: use the OpenReplay logo, keep the blue or shift it
 * slightly, keep it as a play button, *"slightly lift it up a little bit."*
 *
 * Geometry from `shared/openreplay-mark.ts`, which is the product's own
 * `logo-small.svg` copied verbatim. ⚠ Not redrawn: a logo is the one asset
 * where "close enough" is worth nothing, because it is the thing every reader
 * already knows the shape of.
 *
 * ── THE LIFT IS THE ANIMATION, NOT A NEW SHAPE ─────────────────────────────
 * The mark is already **a play button inside a play button** - the outer
 * triangle has the inner one cut out of it, and a small solid play sits in the
 * hole. Nothing had to be added to make it move; the two halves were always
 * separable, and that is the whole trick here.
 *
 * On hover the inner play **advances**: it slides a little along the direction
 * it points and grows slightly, as though the thing had been pressed and
 * started. The outline holds still, because it is the frame - a logo whose
 * silhouette changes on hover reads as a different logo.
 *
 * Three rules keep it from being a toy:
 *
 * 1. **ONE MOVE, AND IT ENDS.** No loop, no pulse, no spin. It travels once on
 *    enter and returns on leave, both on the app's own easing. A logo that
 *    animates forever is a logo you learn to ignore, and this one is beside a
 *    control (the collapse) that people are actually aiming at.
 * 2. **IT MOVES ALONG ITS OWN AXIS.** A play glyph has a direction, so the
 *    only motion that does not fight the shape is forward. Scaling it from the
 *    centre would make it a bubble; rotating it would make it a spinner.
 * 3. **THE PIVOT IS THE INNER PLAY'S OWN CENTRE**, not the box's. Off by the
 *    8px the glyph sits left of centre, the growth reads as a drift.
 *
 * `prefers-reduced-motion` gets the resting mark and no transition - see the
 * stylesheet. There is nothing to lose: the logo is a logo either way.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function OpenReplayMark({ size = 17, className }: OpenReplayMarkProps) {
  return (
    <svg
      className={`m-ormark${className ? ` ${className}` : ''}`}
      viewBox={OR_VIEWBOX}
      height={size}
      /* The mark is taller than it is wide (52x59), so height is the input and
         the width follows - a logo pinned by width would be a different size
         from every 15px glyph in the column beside it. */
      width={(size * 52) / 59}
      role="img"
      aria-label="OpenReplay"
    >
      {/* ⚠ `nonzero`, which is what cuts the inner triangle out of the outer
          one. With `evenodd` the two subpaths would swap and the mark would
          come out as a solid blue triangle with a blue hole - the shape reads
          correctly only under the rule the original file uses. */}
      <path className="m-ormark__outline" d={OR_OUTLINE} fillRule="nonzero" />
      <path className="m-ormark__play" d={OR_INNER} fillRule="nonzero" />
    </svg>
  );
}
