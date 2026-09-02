import { useMemo, useState } from 'react';
import { Input, Popover } from 'antd';
import { CornerDownLeft } from 'lucide-react';
import {
  hasValueOptions,
  valueOptions,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { CheckRow } from '../components/CheckRow.tsx';
import './value-picker.css';

export interface ValuePickerProps {
  entryId: string;
  /** The values already chosen. */
  value: readonly string[];
  onChange: (values: string[]) => void;
  /** The sessions the counts are computed against — narrowed by the date range
   *  and by every OTHER filter, so the numbers answer "how many would this
   *  leave me" rather than "how many exist somewhere". */
  rows: readonly SessionRow[];
  /** Reads on the row: "Country", so the trigger and the menu agree. */
  name: string;
  /** A closed set takes no typed values. An open one does. */
  freeText: boolean;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE VALUE FIELD, WITH THE SHARE OF TRAFFIC EACH VALUE HOLDS.
 *
 * Mehdi, 2026-09-02: "there are some filters that you see the proportions of
 * the results with a bar, make sure you have mock data to show everything."
 *
 * This is the best control in the production app and the easiest one to lose in
 * a redesign, because it looks like an ordinary multi-select until you notice
 * the bar. What the bar does: it tells you whether a filter is WORTH APPLYING
 * BEFORE YOU APPLY IT. "France 41" turns picking a value from a guess into a
 * decision, and a value with a sliver of a bar tells you the filter will empty
 * the list before you watch it happen.
 *
 * FOUR DECISIONS.
 *
 * 1. THE COUNTS ARE LIVE, and computed against what the OTHER filters already
 *    left. So they narrow as you build, and the menu can never disagree with
 *    the table. A count computed against the whole project would be a different
 *    and much less useful number.
 * 2. THE BAR IS RELATIVE TO THE WIDEST CANDIDATE, not to the total. Sessions
 *    spread across nine countries put every share under 20%, and nine slivers
 *    compare to nothing; a full bar beside a three-quarter one is readable.
 * 3. IT IS `CheckRow`, the same row every other menu in this app uses - the
 *    filter tree, the display menu, the capture popover. The bar rides its
 *    `meta` slot rather than being a fifth kind of option row.
 * 4. AN OPEN FIELD TAKES TYPED VALUES TOO. A URL you have not seen yet is a
 *    URL you still have to be able to filter on, and production's autocomplete
 *    allows it. Enter commits what you typed.
 *
 * Production draws its bar as a short blue underline beneath each row, hard
 * against the left edge and clipped by the row's own padding. Here it is the
 * app's own `m-bar` track, right-aligned in the meta column with the figure
 * above it, so the numbers stay in a column you can read down.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ValuePicker({
  entryId,
  value,
  onChange,
  rows,
  name,
  freeText,
}: ValuePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => valueOptions(entryId, rows, query), [entryId, rows, query]);
  const offers = hasValueOptions(entryId);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const commitTyped = () => {
    const v = query.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setQuery('');
  };

  /* THE TRIGGER SAYS WHAT IS CHOSEN, not "3 selected". A filter you cannot read
     off the row is a filter you have to open to understand, and the row is the
     one place the whole search is supposed to be legible. Past two values it
     names the first and counts the rest, because a row is a clause and not a
     list. */
  const label =
    value.length === 0
      ? 'value'
      : value.length <= 2
        ? value.join(', ')
        : `${value[0]} +${value.length - 1}`;

  const content = (
    <div className="m-vp">
      <div className="m-vp__search">
        <Input
          autoFocus
          variant="borderless"
          size="small"
          placeholder={freeText ? `Find or type a ${name.toLowerCase()}` : `Find a ${name.toLowerCase()}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setOpen(false);
            if (e.key !== 'Enter') return;
            /* Enter takes the obvious thing: the one match if there is exactly
               one, otherwise what you typed. */
            if (options.length === 1) return toggle(options[0]!.value);
            if (freeText) commitTyped();
          }}
          aria-label={`Values for ${name}`}
        />
        {freeText && query.trim() && (
          <button type="button" className="m-vp__commit" onClick={commitTyped}>
            <CornerDownLeft size={12} aria-hidden="true" />
            use “{query.trim()}”
          </button>
        )}
      </div>

      <div className="m-vp__body">
        {/* Chosen values that are not in the candidate list - typed by hand, or
            no longer present in the current range - still have to be visible
            and removable, or a filter becomes impossible to undo from here. */}
        {value
          .filter((v) => !options.some((o) => o.value === v))
          .map((v) => (
            <CheckRow key={`extra:${v}`} on onToggle={() => toggle(v)} meta={<span className="m-vp__typed">typed</span>}>
              {v}
            </CheckRow>
          ))}

        {options.length === 0 && (
          <p className="m-vp__none">
            {offers ? 'Nothing matches that.' : `Type a ${name.toLowerCase()} to filter by it.`}
          </p>
        )}

        {options.map((o) => (
          <CheckRow
            key={o.value}
            on={value.includes(o.value)}
            onToggle={() => toggle(o.value)}
            meta={
              <span className="m-vp__share">
                <span className="m-vp__n">{o.count > 0 ? o.count : '—'}</span>
                {/* The bar is drawn and the figure is printed, so the row can be
                    read either way - scanned as a shape, or read as a number. */}
                <span className="m-bar m-vp__bar" aria-hidden="true">
                  <span className="m-bar__fill" style={{ width: `${Math.round(o.share * 100)}%` }} />
                </span>
              </span>
            }
          >
            {o.value}
          </CheckRow>
        ))}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      arrow={false}
      rootClassName="m-vp-root"
      destroyOnHidden
      align={{ offset: [0, 5] }}
    >
      <button
        type="button"
        className={`m-vp__trigger${value.length ? ' is-set' : ''}`}
        aria-label={`Values for ${name}`}
      >
        <span className="m-truncate">{label}</span>
      </button>
    </Popover>
  );
}
