import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CountSuffix } from './CountSuffix.tsx';
import './filter-strip.css';

export interface StripItem {
  key: string;
  label: string;
  /** The faded number after the label. Omit where a count would be noise. */
  count?: number;
  icon?: ReactNode;
}

export interface FilterStripProps {
  items: readonly StripItem[];
  /** Every key currently on. A single-select caller passes one; a multi-select
   *  caller passes as many as it likes. The strip does not care which it is -
   *  it draws state and reports clicks. */
  selected: readonly string[];
  onSelect: (key: string) => void;
  /** Names the group for a screen reader: "Filter by category", "Status". */
  label: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE STRIP OF TOGGLES that stands in for antd's Segmented.
 *
 * It looks like Segmented on purpose - the toolbar should not change shape
 * between pages - but Segmented is single-select by construction, and the issue
 * queue needs category to be a normal multi-select dimension like every other
 * one. Rather than keep two controls that differ by a pixel, there is one
 * control that draws pressed state and lets the CALLER decide what pressing
 * means: exclusive tabs on Tests and Audits, independent toggles on Issues.
 *
 * Which is also why "All" is not special in here. On Issues it is the empty
 * selection; on Tests it is a fifth status. Both are just an item whose key the
 * caller happens to treat differently.
 *
 * ── THE THUMB MOVES ────────────────────────────────────────────────────────
 * When exactly one item is on, the selected surface is a single element that
 * SLIDES to it rather than disappearing from one item and appearing on another.
 * Two reasons, and neither is decoration: it says the two tabs are views of one
 * list rather than two separate things, and it carries the eye from where it
 * was to where the change happened, which is the one job a transition has.
 *
 * It is measured, not guessed: the strip wraps on a narrow toolbar and the items
 * are as wide as their labels, so the thumb reads the real box. Three states it
 * has to get right, all of them the difference between a nice touch and a
 * glitch - it does not animate into place on FIRST paint, it does not animate
 * when the strip reflows under it (a resize, or a count changing width), and it
 * is not there at all when the selection is multiple or empty, where a single
 * sliding surface would be a lie about what is on.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FilterStrip({ items, selected, onSelect, label }: FilterStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  /* First placement jumps, every later one glides. Without this the thumb
     slides in from the strip's left edge on every mount - including the one
     that happens when you switch pages, where nothing moved at all. It is state
     rather than a ref because the class it drives has to reach the render. */
  const [live, setLive] = useState(false);

  const one = selected.length === 1 ? selected[0] : null;

  useLayoutEffect(() => {
    const strip = ref.current;
    if (!strip || one == null) {
      setThumb(null);
      setLive(false);
      return undefined;
    }
    const measure = () => {
      const el = strip.querySelector<HTMLElement>(`[data-key="${CSS.escape(one)}"]`);
      if (!el) return setThumb(null);
      setThumb({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    /* A reflow is not a selection change, so it must not look like one: the
       observer repositions with the transition suppressed. */
    const ro = new ResizeObserver(() => {
      setLive(false);
      measure();
      requestAnimationFrame(() => setLive(true));
    });
    ro.observe(strip);
    const id = requestAnimationFrame(() => setLive(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [one, items]);

  return (
    <div className="m-seg" role="group" aria-label={label} ref={ref}>
      {thumb && (
        <span
          className={`m-seg__thumb${live ? ' is-live' : ''}`}
          aria-hidden="true"
          style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }}
        />
      )}
      {items.map((it) => {
        const on = selected.includes(it.key);
        return (
          <button
            key={it.key}
            type="button"
            data-key={it.key}
            aria-pressed={on}
            className={`m-seg__item${on ? ' is-on' : ''}${thumb ? ' has-thumb' : ''}`}
            onClick={() => onSelect(it.key)}
          >
            {it.icon}
            {it.label}
            {it.count != null && <CountSuffix n={it.count} />}
          </button>
        );
      })}
    </div>
  );
}
