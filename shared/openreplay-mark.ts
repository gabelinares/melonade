/* ══════════════════════════════════════════════════════════════════════════
   THE OPENREPLAY MARK, taken from the app rather than redrawn.

   Source: `openreplay-repo/frontend/app/svg/logo-small.svg`, verbatim. Two
   paths and one viewBox, and both fill colours are the real ones - the outline
   is `#394EFF`, which is the brand blue the whole product is built on, and the
   inner play is `#27A2A8`.

   ⚠ IT IS COPIED, NOT APPROXIMATED. A logo an agent redrew "close enough" is
   the one asset in a design system where close enough is worthless: it is the
   thing every reader already knows the shape of.

   ── WHAT THE SHAPE IS, because the animation depends on reading it right ───
   A play button whose outline is itself a play button. The outer path is a
   triangle with a hole in it - one `<path>` with two subpaths and
   `fill-rule: nonzero`, so the inner triangle is cut out of the outer one -
   and the small solid play sits inside that hole. So it is a play inside a
   play, which is why Mehdi's "keep it as a play button" and "slightly lift it"
   can both be satisfied without touching the geometry: the two halves can
   move independently.
   ══════════════════════════════════════════════════════════════════════════ */

export const OR_VIEWBOX = '0 0 52 59';

/** The outer play, with the inner triangle cut out of it. Brand blue. */
export const OR_OUTLINE =
  'M44.2286654,29.5 L6.50039175,7.42000842 L6.50039175,51.5799916 L44.2286654,29.5 Z ' +
  'M49.3769757,24.9357962 C50.9991976,25.8727671 52,27.6142173 52,29.5 ' +
  'C52,31.3857827 50.9991976,33.1272329 49.3769757,34.0642038 ' +
  'L8.01498302,58.2754687 C4.63477932,60.2559134 0,57.9934848 0,53.7112649 ' +
  'L0,5.2887351 C0,1.00651517 4.63477932,-1.25591343 8.01498302,0.724531317 ' +
  'L49.3769757,24.9357962 Z';

/** The small play in the middle. Teal. */
export const OR_INNER =
  'M29.4155818,28.4568548 L14.7929806,20.1454193 ' +
  'C14.2168086,19.8179252 13.4842425,20.0195184 13.1567483,20.5956904 ' +
  'C13.0540138,20.7764349 13,20.9807697 13,21.188671 L13,37.8115419 ' +
  'C13,38.4742836 13.5372583,39.0115419 14.2,39.0115419 ' +
  'C14.4079013,39.0115419 14.6122361,38.9575281 14.7929806,38.8547936 ' +
  'L29.4155818,30.5433581 C29.9917538,30.215864 30.193347,29.4832978 29.8658528,28.9071259 ' +
  'C29.7590506,28.7192249 29.6034827,28.563657 29.4155818,28.4568548 Z';

/** The brand's own two colours, as the SVG carries them. */
export const OR_BLUE = '#394EFF';
export const OR_TEAL = '#27A2A8';

/** The inner play's own centre in viewBox units, so a transform can pivot on
 *  it rather than on the box. Measured off the path: it spans x 13→29.4,
 *  y 20.1→39.0. */
export const OR_INNER_ORIGIN = '21px 29.5px';
