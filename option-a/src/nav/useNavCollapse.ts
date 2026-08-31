import { useCallback, useEffect, useState } from 'react';

/** Below this the menu costs more than it gives back: at 1080 the plane is
 *  under 800px wide with the menu open, which is where the tables start
 *  dropping columns. */
const NARROW = 1080;

const query = `(max-width: ${NARROW - 1}px)`;

/** ⌘\ on a Mac, Ctrl+\ everywhere else. Printed in the tooltip rather than
 *  left for people to find. */
export const COLLAPSE_KEY =
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? '⌘\\' : 'Ctrl+\\';

/**
 * Open or collapsed, and who gets to decide.
 *
 * THE RULE IS ONE SENTENCE: the window sets it when it CROSSES 1080, and you
 * override it until the next crossing. That is what `matchMedia`'s change event
 * already means - it fires on the crossing and never in between - so there is
 * no stored preference to go stale and no resize handler fighting the person
 * using it. Drag the window narrow and the menu closes; open it again and it
 * stays open, because you said so and nothing has changed its mind since.
 *
 * A CSS media query cannot do this. It would re-decide on every frame of the
 * drag and it could never be overridden, which is exactly the "structural
 * responsiveness has to come from React" note in DESIGN.md.
 */
export function useNavCollapse() {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onCross = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', onCross);
    return () => mq.removeEventListener('change', onCross);
  }, []);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Not a typing shortcut in any field, so it does not need the usual
         "is the caret in an input" guard. */
      if (e.key !== '\\' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return { collapsed, toggle };
}
