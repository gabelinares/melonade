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
   play, and the two halves can move independently.

   ⚠ THE TWO SUBPATHS ARE SPLIT OUT AND RECOMBINED rather than kept as one
   string. `OR_OUTLINE` is `OR_HOLE` and `OR_OUTER` joined, so it is the same
   glyph it always was - but the hole is now addressable on its own, which is
   what the swap needs: a clip that says *the frame's interior*.
   ══════════════════════════════════════════════════════════════════════════ */

export const OR_VIEWBOX = '0 0 52 59';

/** The triangle cut out of the outer one - so, the frame's interior. Sharp
 *  corners: the rounding is on the silhouette only. Doubles as the clip the
 *  teal fill is cut to. */
export const OR_HOLE =
  'M44.2286654,29.5 L6.50039175,7.42000842 L6.50039175,51.5799916 L44.2286654,29.5 Z';

/** The silhouette: the outer rounded play, alone. */
export const OR_OUTER =
  'M49.3769757,24.9357962 C50.9991976,25.8727671 52,27.6142173 52,29.5 ' +
  'C52,31.3857827 50.9991976,33.1272329 49.3769757,34.0642038 ' +
  'L8.01498302,58.2754687 C4.63477932,60.2559134 0,57.9934848 0,53.7112649 ' +
  'L0,5.2887351 C0,1.00651517 4.63477932,-1.25591343 8.01498302,0.724531317 ' +
  'L49.3769757,24.9357962 Z';

/** The outer play with the inner triangle cut out of it, exactly as the file
 *  carries it. ⚠ Hole first, then silhouette - `fill-rule: nonzero` needs the
 *  two subpaths wound the way the original wound them. */
export const OR_OUTLINE = `${OR_HOLE} ${OR_OUTER}`;

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

/* ── THE NUMBERS THE SWAP RUNS ON ─────────────────────────────────────────
   ⚠ MEASURED, NOT ESTIMATED. Read off `getBBox()` in a browser rather than
   eyeballed from the path data, because the rounded tip bulges about half a
   unit past its last on-curve point - the inner play is 17.02 wide, not the
   16.42 the coordinates suggest. Getting that wrong puts the pivot half a
   unit off and the growth reads as a drift.

     hole    x 6.5004  w 37.7283  h 44.1600  centre (25.3645, 29.5)
     inner   x 13      w 17.0228  h 19.0231  centre (21.5114, 29.5)

   Both are centred on y 29.5 - the glyph is symmetric about its own midline,
   so the whole swap is one horizontal shift and one scale, with no vertical
   correction at all. */

/** The inner play's own centre, in viewBox units, so a transform pivots on the
 *  glyph rather than on the box. It sits 3.85 units left of the hole's centre;
 *  scaling about the box would drag it sideways. */
export const OR_INNER_ORIGIN = '21.5114px 29.5px';

/** How far right the inner play travels to land concentric with the hole. */
export const OR_FILL_SHIFT = 3.8531;

/** ⚠ DELIBERATELY MORE THAN ENOUGH. Filling the hole exactly would need 2.216
 *  across and 2.321 down - two different numbers, so a uniform scale leaves a
 *  gap on one axis and a rounded triangle can never meet a sharp one's corners
 *  anyway. So it overshoots and a clip does the fitting: the end state is the
 *  hole's own shape, sharp corners and all, rather than an approximation of
 *  it. 2.5 covers all three vertices with room to spare (checked against each
 *  corner arc), and the last tenth of the growth reads as the shape locking
 *  into the frame. */
export const OR_FILL_SCALE = 2.5;
