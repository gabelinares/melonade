import { useEffect, useRef } from 'react';

/** How far away the field starts noticing you, in pixels from its own box. */
const NOTICE_AT = 220;
/** The reveal at its widest, once the pointer is on the control. */
const FULL_RADIUS = 130;
/** Per-frame approach to the target radius. Low enough to swell rather than
 *  snap, high enough that it is never behind your hand. */
const EASE = 0.18;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE FIELD NOTICES YOU BEFORE YOU ARRIVE.
 *
 * Gabriel, 2026-09-04, choosing between the torch and the torch with a lead-in:
 * the ring is masked to a radius around the pointer, and the radius opens as
 * you APPROACH rather than when you land.
 *
 * ── WHY DISTANCE AND NOT :HOVER ────────────────────────────────────────────
 * Hover reports where the pointer IS. A control that lights on hover is telling
 * you something you already know, at the moment you no longer need it - your
 * hand is on it. Distance reports where the pointer is GOING, so the rim is
 * already lit when you get there and the control reads as having been ready
 * rather than as having reacted. That beat is the entire difference between
 * the two variants, and it costs one listener.
 *
 * ── THE LISTENER IS AT THE DOCUMENT, WHICH IS THE PART TO BE CAREFUL WITH ──
 * A pointermove handler on the document runs on every mouse movement anywhere
 * on the page, so this one does the least it can:
 *
 *   - it stores the event's coordinates and nothing else; no reads, no writes
 *   - one rAF loop does the geometry, and it PARKS ITSELF once the light is out
 *     and the pointer is far away, so an idle page runs no frames at all
 *   - the field's box is measured once per wake and on resize, never per move,
 *     because `getBoundingClientRect` in a move handler is a layout read on
 *     every pixel of travel
 *   - the result is written as three custom properties, which the compositor
 *     can take without a style recalc of anything else
 *
 * ⚠ `passive: true`. This never calls `preventDefault`, and a non-passive move
 * listener on the document is a scroll-jank bug waiting for a touch device.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function useTorch(enabled = true) {
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !enabled) return undefined;
    /* A device with no hover has no pointer to follow, and on a phone the
       "distance to the field" is wherever you last tapped. Nothing to do. */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    let px = -1e4;
    let py = -1e4;
    let radius = 0;
    let box: DOMRect | null = null;
    let frame = 0;
    let running = false;

    const measure = () => {
      box = el.getBoundingClientRect();
    };

    const step = () => {
      if (!box) measure();
      const r = box!;
      /* Distance from the pointer to the RECTANGLE, not to its centre - a
         1400px-wide bar has a centre 700px from its own left end, and a
         centre-distance falloff would leave the ends dark while you stand on
         them. Zero anywhere inside. */
      const dx = Math.max(r.left - px, 0, px - r.right);
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      const away = Math.hypot(dx, dy);
      const want = away > NOTICE_AT ? 0 : FULL_RADIUS * (1 - away / NOTICE_AT);

      radius += (want - radius) * EASE;
      if (radius < 0.4 && want === 0) {
        radius = 0;
        running = false;
      }

      el.style.setProperty('--m-torch-x', `${Math.round(px - r.left)}px`);
      el.style.setProperty('--m-torch-y', `${Math.round(py - r.top)}px`);
      el.style.setProperty('--m-torch-r', `${radius.toFixed(1)}px`);

      /* ⚠ PARKS ITSELF. The loop only exists while there is light to draw or a
         pointer near enough to make some. Without this the page runs sixty
         frames a second forever to write the same three zeroes. */
      if (running) frame = requestAnimationFrame(step);
      else frame = 0;
    };

    const wake = () => {
      if (running) return;
      running = true;
      measure();
      frame = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      wake();
    };
    /* The pointer leaving the window is not a move, so nothing would ever put
       the light out. */
    const onLeave = () => {
      px = -1e4;
      py = -1e4;
      wake();
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    /* ⚠ OBSERVE THE ELEMENT ITSELF, not only the document. The box is measured
       on wake and then cached, which is right for a control that only moves
       when the window does - and wrong the moment the control can CHANGE SHAPE
       under you. Switching the trigger between bar and button resizes it by
       more than a thousand pixels while the pointer is already inside it, so
       the loop never wakes, never re-measures, and lights a rectangle that is
       no longer there. Watching the document alone missed it because the
       document did not resize. */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.documentElement);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', measure);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      running = false;
    };
  }, [enabled]);

  return host;
}
