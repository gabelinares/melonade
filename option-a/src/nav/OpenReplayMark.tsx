import { useId, type CSSProperties } from 'react';
import {
  OR_FILL_SCALE,
  OR_FILL_SHIFT,
  OR_HOLE,
  OR_INNER,
  OR_INNER_ORIGIN,
  OR_OUTLINE,
  OR_VIEWBOX,
} from '@shared/openreplay-mark.ts';
import './openreplay-mark.css';

export interface OpenReplayMarkProps {
  /** Rendered height in px. The nav uses 16. */
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
 * ── THE TWO TRIANGLES TRADE PLACES ─────────────────────────────────────────
 * Gabriel, 2026-09-03: *"the teal triangle inside increases and becomes the
 * outer triangle, and when the mouse leaves the darker triangle goes back to
 * its place, like a shape shifting thing."*
 *
 * The mark is a play button inside a play button, so there was nothing to
 * invent - the shift is already latent in the shape. At rest the BLUE is the
 * triangle with a play cut out of it, and the teal play sits in the cut. On
 * hover the teal **grows until it is the triangle**, and the cut-out passes to
 * it: a play opens in the middle of the teal, in the exact place the teal just
 * left. Same silhouette, and the two halves have traded which one is the
 * negative space.
 *
 * ⚠ THE OPENING IS A HOLE, NOT A BLUE PLAY. The obvious version paints the
 * middle with the frame's own blue, so the logo reads as its two colours
 * swapped - and it was built that way first, then measured:
 *
 *                     against the teal      L* apart
 *     a blue play          1.84:1             17.3
 *     a hole, light        2.76:1             34.8
 *     a hole, dark         6.63:1             59.6
 *
 * The glyph is 14px wide, so the whole payoff of the animation is about 5px of
 * detail. At 1.84:1 that is a smudge you cannot resolve - the blue and the
 * teal are nearly the same weight, which is exactly why they work side by side
 * in the logo and exactly why one cannot sit inside the other. A hole is not
 * WCAG-clean either (a logotype is exempt from 1.4.11 anyway, so the threshold
 * is not the argument) but it separates on lightness rather than on hue, by
 * twice as much in light and by three and a half times in dark. It also needs
 * no colour that is not already in the mark, and cutting a play out of a
 * triangle is what this mark does.
 *
 * Five things make it a shape shift rather than a hover state:
 *
 * 1. **THE SILHOUETTE NEVER MOVES.** The outer frame is the constant. A logo
 *    whose outline changes on hover reads as a different logo, and this one
 *    sits beside a control people are actually aiming at (the collapse).
 * 2. **A CLIP DOES THE FITTING, NOT A MATCHED SCALE.** The teal overshoots the
 *    hole and is cut to it, so the end state is the frame's interior exactly -
 *    sharp corners included. Scaling a rounded triangle to meet a sharp one
 *    leaves a hairline of daylight on two edges and a gap at each vertex; you
 *    would see it at 16px as a fuzzy fill. See `OR_FILL_SCALE` for the
 *    numbers, which are measured off `getBBox()` rather than read off the path.
 * 3. **THE PIVOT IS THE GLYPH'S OWN CENTRE.** The inner play sits 3.85 units
 *    left of the hole's, so it scales about itself and then travels that far
 *    right. Scaling about the box would make the growth read as a drift.
 * 4. **THE BLUE ARRIVES INWARD AND LEAVES OUTWARD.** It cannot travel from the
 *    frame - it would be a solid blue triangle on the way - so it contracts
 *    slightly as it fades in, and expands as it fades out. The two halves
 *    cross in opposite directions, which is what sells the trade.
 *
 * The order is deliberate: **frame first, fill on top.** They are disjoint, so
 * the pixels are the same either way except at the boundary, where the teal's
 * antialiased edge composites over solid blue instead of over the background.
 * The other order leaves a pale seam tracing the inside of the frame.
 *
 * `prefers-reduced-motion` gets the resting mark and no transition - see the
 * stylesheet. There is nothing to lose: the logo is a logo either way.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function OpenReplayMark({ size = 17, className }: OpenReplayMarkProps) {
  /* ⚠ Two marks render at once (the wide nav's and the collapsed one's), so the
     clip needs an id per instance or the second `url(#...)` resolves to the
     first one's node. `useId` returns `:r3:`, and the colons are legal in an
     HTML id but not in a CSS url() fragment without escaping - so they go. */
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clip = `or-hole-${uid}`;
  const mask = `or-cut-${uid}`;

  return (
    <svg
      className={`m-ormark${className ? ` ${className}` : ''}`}
      viewBox={OR_VIEWBOX}
      height={size}
      /* The mark is taller than it is wide (52x59), so height is the input and
         the width follows - a logo pinned by width would be a different size
         from every 15px glyph in the column beside it. */
      width={(size * 52) / 59}
      /* The measured geometry travels with the component rather than being
         retyped in the stylesheet, so the pivot and the scale can only ever be
         wrong in one place. */
      style={
        {
          '--m-ormark-origin': OR_INNER_ORIGIN,
          '--m-ormark-shift': `${OR_FILL_SHIFT}px`,
          '--m-ormark-scale': OR_FILL_SCALE,
        } as CSSProperties
      }
      role="img"
      aria-label="OpenReplay"
    >
      <defs>
        {/* The frame's interior, which is the outline's own hole subpath - not
            a second copy of it. Whatever grows inside this is the logo's
            inside, by construction. */}
        <clipPath id={clip}>
          <path d={OR_HOLE} />
        </clipPath>

        {/* The cut-out. White keeps, black punches, and the punch is the inner
            play at its resting size - so what opens in the teal is the shape
            the teal used to be, in the place it used to be.

            ⚠ `maskUnits="userSpaceOnUse"` with the whole viewBox as the region.
            The default region is 120% of the masked path's own bounding box,
            measured BEFORE its transform, so the grown teal would be cropped
            back to roughly its resting size and the animation would appear to
            do nothing. */}
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="52" height="59">
          <rect x="0" y="0" width="52" height="59" fill="#fff" />
          <path className="m-ormark__eye" d={OR_INNER} fill="#000" />
        </mask>
      </defs>

      {/* ⚠ `nonzero`, which is what cuts the inner triangle out of the outer
          one. With `evenodd` the two subpaths would swap and the mark would
          come out as a solid blue triangle with a blue hole - the shape reads
          correctly only under the rule the original file uses. */}
      <path className="m-ormark__outline" d={OR_OUTLINE} fillRule="nonzero" />

      {/* One path, two jobs: the resting teal play, and the teal fill it
          becomes. Nothing crossfades - it is the same glyph the whole way,
          which is why the growth reads as one object moving rather than as one
          thing replacing another. */}
      <g clipPath={`url(#${clip})`}>
        {/* ⚠ THE MASK GOES ON A WRAPPER, NOT ON THE PATH THAT MOVES. A `mask`
            resolves in the coordinate system its own element establishes, so
            hanging it on the scaling path scales the punch too - at 2.5x the
            hole covers the whole fill and hovering turns the logo's interior
            blank. It was built that way first and that is exactly what it did.
            The wrapper never transforms, so the punch stays put in viewBox
            units while the fill grows underneath it. (The clip above is on this
            same untransformed level for the same reason.) */}
        <g mask={`url(#${mask})`}>
          <path className="m-ormark__fill" d={OR_INNER} />
        </g>
      </g>
    </svg>
  );
}
