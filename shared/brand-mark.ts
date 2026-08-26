/* ═══════════════════════════════════════════════════════════════════════════
   THE MELONADE MARK, as geometry.

   Lives in shared/ for the same reason the issue data does: it is not a design
   decision either option gets to make. The two options own their own component
   libraries and their own colour, but there is one Melonade and it has one
   shape, so the shape is data here and each app renders it with its own CSS.
   The colour comes from each app's `brand-mark` role, not from this file.

   ── what the shape is, and why ──────────────────────────────────────────────
   A disc with one small square sitting outside it. Two readings of the same
   idea rather than two decorations:

     · a disc is one of many; a square is the one that matters. That is the
       product: everything shipped, and the one thing misbehaving in it.
     · nothing is sharp at rest, so the mark hardens when you touch it.

   Taken verbatim from the live landing page (branding/melonade-landing,
   candidate C in logo-lab.html). Two earlier attempts were rejected there and
   are worth not repeating: a detached square floating off a button's corner
   read as a rendering fault, and a 2x2 "found cell" grid is every app icon
   ever drawn.

   ── the turn ────────────────────────────────────────────────────────────────
   On hover, focus, and once on mount, the disc becomes the small square and the
   square becomes the disc: the same mark rotated half a turn with the two
   shapes trading places.

   Both shapes are RECTS, never a circle plus a rect. A rect whose rx is half
   its width IS a circle, which is what lets one become the other with nothing
   to morph and no path interpolation. The geometry lives in SVG attributes, so
   a browser without CSS geometry-property animation still draws the mark
   correctly and simply does not animate it.

   Both rects travel the same distance - a is -4.4 and b is +4.1 - so it reads
   as one move rather than two shapes fidgeting, and the clearance between them
   lands at 1.3 units in both states.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface MarkRect {
  x: number;
  y: number;
  size: number;
  rx: number;
}

export const MARK_VIEWBOX = '0 0 16 16';

/** At rest: `a` is the disc, `b` is the small square. */
export const MARK_REST: { a: MarkRect; b: MarkRect } = {
  a: { x: 1.1, y: 3.5, size: 11.4, rx: 5.7 },
  b: { x: 11.9, y: 1, size: 3.4, rx: 0.9 },
};

/** Turned: they have swapped roles. `a` is now the square, `b` the disc. */
export const MARK_TURNED: { a: MarkRect; b: MarkRect } = {
  a: { x: 0.7, y: 11.6, size: 3.4, rx: 0.9 },
  b: { x: 3.5, y: 1.1, size: 11.4, rx: 5.7 },
};

/** The CSS geometry properties the turn animates. Both apps transition exactly
 *  these five and nothing else; anything more (opacity, transform) makes the
 *  two shapes look like they are being replaced rather than trading places. */
export const MARK_ANIMATED_PROPS = ['x', 'y', 'width', 'height', 'rx'] as const;
