import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { catalogueNow, type CatalogueEntry } from '@shared/sessions-logic.ts';
import { PickerBody } from './FilterPicker.tsx';
import './filter-panel.css';

export interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onPick: (entry: CatalogueEntry) => void;
  /** Properties already in the search, so the filters list can disable them. */
  taken?: readonly string[];
  /** What the catalogue's search starts with. A character typed AT the trigger
   *  opens the panel and lands here, so the keystroke is not swallowed - which
   *  is the whole answer to "people type into the bar". */
  seed?: string;
  /** The bar's own query, when the bar is a field. See PickerBody: controlled
   *  query, no search row, and Enter committed from outside. */
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearch?: boolean;
  commitRef?: MutableRefObject<(() => void) | null>;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE BUTTON, ONE LIST — AND THE PANEL GROWS OUT OF THE BUTTON.
 *
 * ── WHAT THIS WAS FOR HALF A DAY, AND WHY IT IS NOT ────────────────────────
 * It was a FORK: two cards, Events and Group filters, each with a drawn glyph
 * and a sentence, and the catalogue recut behind them into production's two
 * lists. It was built on 09-04 and taken out the same day, because the 09-03
 * meeting had already settled the question and the recording had not been read
 * yet.
 *
 * ⚠ MEHDI REJECTED IT BY NAMING ITS TWO COSTS, and Gabriel agreed on the call:
 * *"What I don't like about it is you need to understand what a group filter is
 * and what an event is, PLUS IT ADDS ANOTHER CLICK."* Gabriel: *"I definitely
 * think the best option is merging them all, and the logic behind the
 * filtering, OpenReplay will do it."*
 *
 * He reached it the long way, which is why it is worth keeping the reasoning:
 * he floated two buttons himself, then walked production's two menus, noticed
 * Autocapture appears in BOTH of them, and concluded the split is redundant
 * where it is visible and useful only where it is not — *"depending on what you
 * select, because the front end can make that."*
 *
 * So: one merged catalogue, and the kind is decided by what you pick rather
 * than before you pick. The two kinds are still told apart, twice — by the
 * headings inside this list, and by the section the row lands in.
 *
 * ⚠ THE FORK'S ONE REAL DEFENCE WAS NEVER PUT TO HIM: it is only reachable on
 * an empty search, so it charges its click once per SEARCH rather than once per
 * clause. That is true, and it is not enough - he named the cost twice and the
 * designer agreed with him in the room. `git show` has the two cards and their
 * drawn glyphs if the question reopens.
 *
 * ── WHAT SURVIVED, AND IT IS THE GOOD HALF ─────────────────────────────────
 * THE MORPH. This does not fade in beside its trigger; it IS the trigger,
 * growing. The surface starts at the button's own measured box and moves to the
 * panel's, so nothing new arrives on screen - one object changes shape. A
 * popover that appears somewhere else has to be connected to its trigger by the
 * reader; a shape that grows out of one does not. It is worth more now than it
 * was under the fork, because the trigger is small: 108px becoming 528px is a
 * bigger claim than a bar widening slightly.
 *
 * `prefers-reduced-motion` gets the same panel with no interpolation.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FilterPanel({
  open,
  onClose,
  onPick,
  taken = [],
  seed,
  query,
  onQueryChange,
  hideSearch,
  commitRef,
}: FilterPanelProps) {
  const [grown, setGrown] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* ⚠ THE START SIZE IS MEASURED, NOT ASSUMED. The bar is whatever the plane's
     width leaves it, and a keyframe with a hard-coded 1400px would morph out of
     a rectangle that is not there. Read from the wrapper this sits inside,
     which IS the bar's box. */
  useLayoutEffect(() => {
    if (!open) {
      setGrown(false);
      return;
    }
    const host = box.current?.parentElement;
    if (host) {
      const r = host.getBoundingClientRect();
      box.current!.style.setProperty('--m-fpanel-w0', `${Math.round(r.width)}px`);
      box.current!.style.setProperty('--m-fpanel-h0', `${Math.round(r.height)}px`);
    }
    /* Two frames: one to paint at the bar's size, one to leave for the panel's.
       A single frame is sometimes coalesced and the morph is skipped. */
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, [open]);

  /* Escape closes, and a click anywhere else does too. Both land on the same
     `onClose`, so the bar comes back in one place. */
  useEffect(() => {
    if (!open) return undefined;
    /* ⚠ ONE ESCAPE AGAIN. Under the fork this stepped back a stage first,
       because you had opened two doors. There is one door now. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      const host = box.current?.parentElement;
      if (host && !host.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={box}
      className={`m-fpanel${grown ? ' is-grown' : ''}`}
      role="dialog"
      aria-label="Add to the filter"
    >
      <PickerBody
        /* ⚠ THE WHOLE CATALOGUE, BOTH KINDS. `searchStore.instance.filters` is
           one array with `isEvent` on each item, so this is the shape the store
           already has - and it means you never have to know whether the thing
           you want is an event before you can look for it. "Is duration an
           event?" is not a question anybody should answer to search their own
           sessions.

           The kinds are still visible: the list heads each group with its name
           when a result spans both, and the row lands in the matching section
           below. Two places, neither of them a step. */
        entries={catalogueNow()}
        taken={taken}
        onPick={onPick}
        onDone={onClose}
        seed={seed}
        query={query}
        onQueryChange={onQueryChange}
        hideSearch={hideSearch}
        commitRef={commitRef}
        placeholder="An event or a group filter"
      />
    </div>
  );
}
