import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { catalogueNow, type CatalogueEntry } from '@shared/sessions-logic.ts';
import { PickerBody } from './FilterPicker.tsx';
import { EVENTS_HEAD, EVENTS_BLURB, GROUP_HEAD, GROUP_BLURB } from './vocabulary.ts';
import './filter-fork.css';

type Stage = 'fork' | 'events' | 'filters';

export interface FilterForkProps {
  open: boolean;
  onClose: () => void;
  onPick: (entry: CatalogueEntry) => void;
  /** Properties already in the search, so the filters list can disable them. */
  taken?: readonly string[];
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE ENTRY POINT, TWO CATALOGUES — AND THE SURFACE IS THE SAME OBJECT ALL THE
 * WAY DOWN.
 *
 * ── WHAT THIS REPLACES, AND WHY THE MERGE WAS THE WRONG UNDO ───────────────
 * Mehdi asked for one button, not two (2026-09-02): "have event and filters
 * within a single button." The 09-02 build read that as one button AND ONE
 * LIST, and merged the two catalogues into a single scroll. That was a step too
 * far: production's two lists are the lists people know, and the ask was about
 * the ENTRY POINT, not the catalogue. Gabriel, 09-04: "separate filter from
 * events in a way that doesn't compromise the unified filter field... the list
 * in the picker should stay exactly the same as it is currently in OpenReplay."
 *
 * So the catalogue is recut back into production's two, and the single entry
 * point survives by putting the choice BEFORE the list instead of inside it.
 *
 * ── THE COST OF A FORK, AND WHY THIS ONE DOES NOT PAY IT ───────────────────
 * The standing objection to a fork step is that it charges a click on every
 * filter you ever add, forever, to teach a distinction an expert learned on day
 * one. THIS FORK IS ONLY REACHABLE WHEN THE SEARCH IS EMPTY. The moment there
 * is one rule the bar retires and each section carries its own Add (see
 * `SearchCard`), so the fork appears once per search - exactly when a reader is
 * least oriented - and never gets in the way again.
 *
 * ── THE MORPH IS THE ARGUMENT ──────────────────────────────────────────────
 * It does not fade in over the bar; it IS the bar, growing. The surface starts
 * at the bar's own width and height and moves to the panel's, so nothing new
 * arrives on screen - one object changes shape, and choosing a kind changes it
 * again into the catalogue. A popover that appears somewhere else has to be
 * connected to its trigger by the reader; a shape that grows out of it does not.
 *
 * `prefers-reduced-motion` gets the same three stages with no interpolation.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FilterFork({ open, onClose, onPick, taken = [] }: FilterForkProps) {
  const [stage, setStage] = useState<Stage>('fork');
  const [grown, setGrown] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* ⚠ THE START SIZE IS MEASURED, NOT ASSUMED. The bar is whatever the plane's
     width leaves it, and a keyframe with a hard-coded 1400px would morph out of
     a rectangle that is not there. Read from the wrapper this sits inside,
     which IS the bar's box. */
  useLayoutEffect(() => {
    if (!open) {
      setStage('fork');
      setGrown(false);
      return;
    }
    const host = box.current?.parentElement;
    if (host) {
      const r = host.getBoundingClientRect();
      box.current!.style.setProperty('--m-fork-w0', `${Math.round(r.width)}px`);
      box.current!.style.setProperty('--m-fork-h0', `${Math.round(r.height)}px`);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      /* Escape steps BACK from a catalogue before it closes the whole thing:
         you opened two doors, so one Escape should shut one of them. */
      if (stage !== 'fork') return setStage('fork');
      onClose();
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
  }, [open, stage, onClose]);

  if (!open) return null;

  const entries = catalogueNow();
  const kind = stage === 'events' ? 'events' : 'filters';

  return (
    <div
      ref={box}
      className={`m-fork is-${stage}${grown ? ' is-grown' : ''}`}
      role="dialog"
      aria-label="Add to the filter"
    >
      {stage === 'fork' ? (
        <div className="m-fork__cards">
          <ForkCard
            head={EVENTS_HEAD}
            blurb={EVENTS_BLURB}
            icon={<SequenceGlyph />}
            onClick={() => setStage('events')}
          />
          <ForkCard
            head={GROUP_HEAD}
            blurb={GROUP_BLURB}
            icon={<GroupGlyph />}
            onClick={() => setStage('filters')}
          />
        </div>
      ) : (
        <PickerBody
          /* ⚠ THE CATALOGUE, RECUT. One kind per list, which is production's
             own split (`eventOptions` / `propertyOptions` in SessionFilters) -
             so the list a reader sees here is the list they already know. With
             one kind in it the body draws no kind heading, because there is
             nothing left to disambiguate. */
          entries={entries.filter((e) => (kind === 'events' ? e.isEvent : !e.isEvent))}
          taken={taken}
          onPick={onPick}
          onDone={onClose}
          onBack={() => setStage('fork')}
          backLabel="events or group filters"
          placeholder={kind === 'events' ? 'Search events' : 'Search group filters'}
        />
      )}
    </div>
  );
}

function ForkCard({
  head,
  blurb,
  icon,
  onClick,
}: {
  head: string;
  blurb: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="m-fork__card" onClick={onClick}>
      <span className="m-fork__glyph" aria-hidden="true">
        {icon}
      </span>
      <span className="m-fork__head">{head}</span>
      <span className="m-fork__blurb">{blurb}</span>
    </button>
  );
}

/* ── THE TWO GLYPHS ───────────────────────────────────────────────────────────
   DRAWN HERE RATHER THAN TAKEN FROM LUCIDE, and it is the one place in this app
   where that is the right call. Lucide has a funnel and a mouse pointer; both
   name the CONTROL and neither says the thing these two cards exist to say,
   which is a difference in SCOPE. So each glyph draws its own scope:

     the sequence — three steps on a rising stair, joined, the first one solid:
       things that happened, in an order, one after another
     the group — a brace gathering three lines: one condition, held across all
       of them

   Same 24-box, same 1.6 stroke, same round joins as the icon set they sit
   beside, so they read as members of it rather than as illustrations.
   ──────────────────────────────────────────────────────────────────────────── */
const GLYPH = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function SequenceGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M4 18h4.5v-6H14V6h6" />
      <circle cx="4" cy="18" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="11.25" cy="12" r="1.9" />
      <circle cx="20" cy="6" r="1.9" />
    </svg>
  );
}

function GroupGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M8 4a2.5 2.5 0 0 0-2.5 2.5v3A2.5 2.5 0 0 1 3 12a2.5 2.5 0 0 1 2.5 2.5v3A2.5 2.5 0 0 0 8 20" />
      <path d="M11.5 8h9M11.5 12h9M11.5 16h5" />
    </svg>
  );
}
