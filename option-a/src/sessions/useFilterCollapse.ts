import { useCallback, useEffect, useRef, useState } from 'react';

/** ⚠ ONE. The caret is on the strip whenever there is a filter at all.
 *
 *  It used to be two - a one-clause filter is shorter than the summary line
 *  that replaces it, so collapsing it saves nothing - and that reasoning was
 *  about HEIGHT and wrong about the control. Mehdi, 2026-09-02: "what happened
 *  with the collapse search, I can't see it anymore." He had two clauses. An
 *  affordance that comes and goes on a threshold nobody is counting does not
 *  read as an optimisation, it reads as a control that has broken - and then
 *  the one time it is missing is the time you go looking for it.
 *
 *  Below the threshold the collapse saves a few pixels and costs nothing. Being
 *  in the same place every time is worth more than either. */
const WORTH_COLLAPSING = 0;

/** And the number of rows it takes before the page collapses it FOR you. */
const WORTH_COLLAPSING_ON_SCROLL = 2;

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
 * ── AND THE CARET IS ALWAYS THERE ──────────────────────────────────────────
 * It was hidden below three rows, on the argument that collapsing a one-clause
 * filter saves less height than the summary line costs. True, and beside the
 * point: see WORTH_COLLAPSING. What SCROLL does is still thresholded - nothing
 * collapses itself under you until there is enough of it to be in the way.
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
    setCollapsed(false);
  }, [rowCount]);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return undefined;
    const scroller = findScroller(el);
    if (!scroller) return undefined;

    const onScroll = () => {
      if (overridden.current) return;
      /* ⚠ SCROLL keeps the old threshold. Collapsing yourself is a thing the
         page does without being asked, so it waits until the filter is
         actually in the way; offering the caret is not, so it does not. */
      if (rowCount <= WORTH_COLLAPSING_ON_SCROLL) return;
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
