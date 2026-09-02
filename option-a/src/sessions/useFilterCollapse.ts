import { useCallback, useEffect, useRef, useState } from 'react';

/** Above this many rows the filter is worth getting out of the way. One or two
 *  clauses cost less height than the control that would hide them. */
const WORTH_COLLAPSING = 2;

/** Enough scroll to mean "I am reading the results now" rather than "I nudged
 *  the wheel". */
const READING_AT = 28;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * OPEN OR COLLAPSED, AND WHO GETS TO DECIDE.
 *
 * Gabriel, 2026-09-02: "as the list grows, I can't collapse the list to show
 * the result." A sticky filter that grows with its own rows eats the page it is
 * filtering, and the taller it gets the more you want it gone.
 *
 * ── THE RULE IS ONE SENTENCE, and it is the app's own ──────────────────────
 * SCROLLING COLLAPSES IT, AND YOU OVERRIDE THAT UNTIL THE FILTER CHANGES.
 *
 * Which is `useNavCollapse` again, deliberately: there the window decides when
 * it crosses 1080 and you override until the next crossing. Same shape, same
 * reason. Two moments matter and they are different intents - building a filter
 * (you want every row) and reading results (you want the filter out of the way
 * but you still want to know what it says) - and SCROLLING IS THE MOMENT YOUR
 * INTENT CHANGES. So nobody has to click anything in the common case, and the
 * one click there is always wins.
 *
 * "Until the filter changes" is the important half. Adding a clause is you going
 * back to building, so the override lapses and the card opens to show you what
 * you just added. An override that outlived the thing it was about would leave
 * you editing a filter you cannot see.
 *
 * ── AND IT DOES NOTHING BELOW THREE ROWS ───────────────────────────────────
 * A one-clause filter is shorter than the summary line that would replace it.
 * Collapsing it would be the control costing more than the thing it hides.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function useFilterCollapse(rowCount: number) {
  const [collapsed, setCollapsed] = useState(false);
  /* Set the moment you touch the caret, cleared when the filter changes. While
     it is set the scroll listener reports nothing. */
  const overridden = useRef(false);
  /* The scroll container, which is the plane's body. Found rather than passed:
     PageCard owns it and does not hand out a ref, and walking up to the nearest
     scrollable ancestor is both shorter and more honest than threading one
     through two components to reach a listener. */
  const anchor = useRef<HTMLElement | null>(null);

  const toggle = useCallback(() => {
    overridden.current = true;
    setCollapsed((c) => !c);
  }, []);

  /* A change to the filter is you going back to building it. */
  useEffect(() => {
    overridden.current = false;
    if (rowCount <= WORTH_COLLAPSING) setCollapsed(false);
  }, [rowCount]);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return undefined;
    const scroller = findScroller(el);
    if (!scroller) return undefined;

    const onScroll = () => {
      if (overridden.current) return;
      if (rowCount <= WORTH_COLLAPSING) return;
      setCollapsed(scroller.scrollTop > READING_AT);
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [rowCount]);

  return { collapsed, toggle, anchor, canCollapse: rowCount > WORTH_COLLAPSING };
}

/** The nearest ancestor that actually scrolls. `overflow-y` is read from the
 *  computed style rather than guessed from a class, so this keeps working if
 *  the plane's body moves. */
function findScroller(from: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from.parentElement;
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}
