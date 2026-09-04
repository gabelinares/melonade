import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactElement, type ReactNode } from 'react';
import { Button, Input, Popover } from 'antd';
import {
  ALargeSmall,
  ChevronLeft,
  Flag,
  Hash,
  List,
  MousePointerClick,
  Split,
  Timer,
  ToggleLeft,
  Wand2,
} from 'lucide-react';
import {
  catalogueNow,
  categoryLabel,
  groupCatalogue,
  searchCatalogue,
  translate,
  type CatalogueEntry,
  type SearchFilter,
} from '@shared/sessions-logic.ts';
import { EVENTS_HEAD, GROUP_HEAD, GROUP_SCOPE } from './vocabulary.ts';
import './filter-picker.css';

/** An entry's glyph, chosen from what it IS rather than from its name. Events
 *  all share one, because the distinction that matters at a glance is
 *  event-or-property; between properties it is the data type, which is what
 *  tells you whether you are about to type a word or a number. Production uses
 *  the same three for the same reason; the other four are the categories it
 *  special-cases and draws with nothing. */
function entryIcon(e: CatalogueEntry): ReactNode {
  if (e.category === 'segments') return <Split size={13} />;
  if (e.category === 'features') return <Flag size={13} />;
  if (e.isEvent) return <MousePointerClick size={13} />;
  switch (e.dataType) {
    case 'number':
      return <Hash size={13} />;
    case 'boolean':
      return <ToggleLeft size={13} />;
    case 'duration':
      return <Timer size={13} />;
    case 'array':
      return <List size={13} />;
    default:
      return <ALargeSmall size={13} />;
  }
}

const ALL = '__all';

export interface FilterPickerProps {
  /** What can be added. The whole catalogue for the search's own button, an
   *  event's property set for the row-level one. */
  entries?: readonly CatalogueEntry[];
  /** Entries already in the search. Properties are one-per-search in
   *  production, so an added one is drawn struck through rather than removed -
   *  a list that shrinks as you use it is harder to learn than one with a
   *  disabled row in it. Events are repeatable and never disabled. */
  taken?: readonly string[];
  onPick: (entry: CatalogueEntry) => void;
  /** Accepts the whole translated search at once. Omit and the sentence path is
   *  not offered - which is right for the row-level picker, where a sentence
   *  has nowhere to go. */
  onTranslate?: (filters: SearchFilter[]) => void;
  /** Opens straight into this category. The production picker does this when
   *  you re-pick an existing row's subject, so you land where that row's
   *  subject came from instead of at the top of everything. */
  initialCategory?: string;
  placeholder?: string;
  /** One line above the results saying what the picked thing will narrow. The
   *  main picker needs none - its two headings already say it, one per kind.
   *  The EVENT-LEVEL picker does: everything in it is one kind, so no heading
   *  appears, and "Applied to this event only" is the entire difference between
   *  this list and the identical-looking rows in the group filters below. */
  note?: string;
  /** What the search starts with, when something typed its way in here. */
  seed?: string;
  children: ReactElement;
}

export interface PickerBodyProps extends Omit<FilterPickerProps, 'children'> {
  /** Called when the body has finished - a pick, a sentence, or Escape. The
   *  Popover form closes itself; the FORK form morphs back to the bar. */
  onDone?: () => void;
  /** Drawn as a back arrow beside the search field. Only the fork passes one:
   *  in a Popover there is nothing to go back TO. */
  onBack?: () => void;
  /** What the back arrow returns to, named. */
  backLabel?: string;
  /** ⚠ THE QUERY CAN LIVE OUTSIDE THIS COMPONENT (2026-09-04). When the filter
   *  bar is a real field, what you type into it IS the catalogue's query, and
   *  this list has no search row of its own - Mehdi: *"if I can search in it,
   *  instead of having a second line below it, then it might have a purpose."*
   *  Both props together make the query controlled; `hideSearch` drops the row.
   *  Uncontrolled, the picker keeps its own row and its own state, which is
   *  what the button shape and the segment drawer still use. */
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearch?: boolean;
  /** Enter, pressed in a field that is not ours. The owner of the field cannot
   *  know what the first match is, so it asks this to commit whatever the list
   *  would commit - the sentence if one is on offer, else the first row. */
  commitRef?: MutableRefObject<(() => void) | null>;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE ONE PICKER — Mehdi, 2026-09-02: "add the event and filter button as a
 * single button, but the core functioning should be exactly the same."
 *
 * WHY THIS IS A SMALL CHANGE, which is the part that has to be true before it
 * is a good one. `searchStore.instance.filters` is ONE array where every item
 * carries `isEvent`; today's two "+ Add" buttons open the SAME `FilterModal`
 * with the same props, differing only in which half of the catalogue they were
 * handed. So this is not a new control - it is the existing control, opened
 * once, with the filter on its input removed. The picker still calls
 * `addFilter` with one catalogue entry, and where the row lands is decided by
 * the entry's own `isEvent`, exactly as before.
 *
 * FOUR THINGS IT KEEPS from production, because each one is load-bearing:
 *
 * 1. **The category rail.** Forty-five entries in nine categories is not a
 *    list you scroll. The rail is also the only place the four special
 *    categories are visible AS categories - Autocapture, Events, Features,
 *    Segments - and a segment behaves differently from an event, so the
 *    grouping is information rather than tidiness.
 * 2. **Search spans every category.** Typing "rage" finds the autocapture
 *    event and the saved segment together. This is what makes the rail
 *    optional rather than a maze.
 * 3. **`initialCategory`.** Re-picking a row's subject opens where that
 *    subject lives.
 * 4. **A property already in the search is disabled, an event is not.** Two
 *    Clicks in a sequence is the normal case; two Country filters is a
 *    contradiction.
 *
 * ── AND ONE THING IT ADDS ──────────────────────────────────────────────────
 * THE SAME FIELD TAKES A SENTENCE. `aiFiltersStore` has existed in production
 * for as long as the string "Translating your query into search steps…" has,
 * and nothing on the sessions bar ever opened it. Type two or more words and
 * the picker offers to read them as a search - and the offer SHOWS ITS WORK:
 * the steps it understood, and the words it could not use. What comes back is
 * ordinary filter rows you can then edit, not a result set. A translator whose
 * output you cannot correct is a search box you cannot trust.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function PickerBody({
  entries = catalogueNow(),
  taken = [],
  onPick,
  onTranslate,
  initialCategory,
  placeholder = 'An event, a property, or a sentence',
  note,
  seed,
  onDone,
  onBack,
  backLabel,
  query: controlledQuery,
  onQueryChange,
  hideSearch = false,
  commitRef,
}: PickerBodyProps) {
  const [ownQuery, setOwnQuery] = useState(seed ?? '');
  const query = controlledQuery ?? ownQuery;
  const setQuery = onQueryChange ?? setOwnQuery;
  const [cat, setCat] = useState<string>(initialCategory ?? ALL);
  const bodyRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupCatalogue(entries), [entries]);
  const matches = useMemo(() => searchCatalogue(query, entries), [query, entries]);

  /* Searching flattens the rail: while there is a query the body is one list
     across every category, each row saying which category it came from. The
     rail stays visible and its counts follow the query, so it never disagrees
     with what is on the right. */
  const q = query.trim();
  const shown = q ? matches : cat === ALL ? [...entries] : entries.filter((e) => e.category === cat);

  const words = q.split(/\s+/).filter(Boolean).length;
  const nl = useMemo(() => (onTranslate && words >= 2 ? translate(q) : null), [onTranslate, q, words]);

  /* ⚠ SPLIT, IN THE CATALOGUE'S OWN ORDER within each half - so a category the
     rail is showing keeps the order the rail implies, and only the kind is a
     new axis. An empty half is not rendered at all, which is what makes the
     headings disappear when there is nothing to disambiguate. */
  const kinds = useMemo(() => {
    const events = shown.filter((e) => e.isEvent);
    const filters = shown.filter((e) => !e.isEvent);
    return [
      {
        key: 'events',
        name: EVENTS_HEAD,
        hint: 'Something that happened, in order',
        rows: events,
      },
      {
        key: 'filters',
        name: GROUP_HEAD,
        hint: GROUP_SCOPE.toLowerCase(),
        rows: filters,
      },
    ].filter((g) => g.rows.length > 0);
  }, [shown]);
  const offerNL = nl != null;

  const close = () => {
    setQuery('');
    setCat(initialCategory ?? ALL);
    onDone?.();
  };

  const pick = (e: CatalogueEntry) => {
    onPick(e);
    close();
  };

  const accept = () => {
    if (!nl || !onTranslate || nl.filters.length === 0) return;
    onTranslate(nl.filters);
    close();
  };

  /* What Enter does, whichever field it was pressed in: the sentence if one is
     on offer, otherwise the first match. Handed out through `commitRef` on
     every render so it always closes over the current list. */
  const commit = () => {
    if (offerNL && nl!.filters.length) return accept();
    if (shown.length) pick(shown[0]!);
  };
  useEffect(() => {
    if (!commitRef) return undefined;
    commitRef.current = commit;
    return () => {
      commitRef.current = null;
    };
  });

  const content = (
    <div className="m-pick" role="menu">
      {/* ⚠ NO SEARCH ROW WHEN THE FIELD IS THE BAR: one place to type, not two
          stacked. See `hideSearch`. */}
      {!hideSearch && <div className="m-pick__search">
        {onBack && (
          <button
            type="button"
            className="m-pick__back"
            onClick={onBack}
            aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
        )}
        <Input
          autoFocus
          variant="borderless"
          size="small"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return close();
            /* Enter takes the obvious thing: the sentence if one is on offer,
               otherwise the first match. A picker where Enter does nothing is a
               picker you have to reach for the mouse to finish. */
            if (e.key !== 'Enter') return;
            commit();
          }}
          aria-label="Events, properties and sentences"
        />
      </div>}

      {note && <p className="m-pick__note">{note}</p>}

      <div className="m-pick__body">
        {/* ── the rail ── */}
        <div className="m-pick__rail" role="tablist" aria-label="Categories">
          <button
            type="button"
            role="tab"
            aria-selected={cat === ALL && !q}
            className={`m-pick__cat${cat === ALL && !q ? ' is-on' : ''}`}
            onClick={() => {
              setCat(ALL);
              setQuery('');
            }}
          >
            <span className="m-truncate">All</span>
            <span className="m-pick__n">{entries.length}</span>
          </button>
          {groups.map((g) => {
            const n = q ? matches.filter((e) => e.category === g.key).length : g.entries.length;
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={cat === g.key && !q}
                /* A category the query emptied goes quiet rather than
                   disappearing: a rail that changes length as you type is
                   harder to learn than one with a zero in it. */
                className={`m-pick__cat${cat === g.key && !q ? ' is-on' : ''}${n === 0 ? ' is-empty' : ''}`}
                onClick={() => {
                  setCat(g.key);
                  setQuery('');
                }}
              >
                <span className="m-truncate">{g.label}</span>
                <span className="m-pick__n">{n}</span>
              </button>
            );
          })}
        </div>

        {/* ── the list ── */}
        <div className="m-pick__list" ref={bodyRef}>
          {/* THE SENTENCE, above the matches and never instead of them: what you
              typed might be both a filter name and half a sentence, and the
              picker does not get to decide which you meant. */}
          {offerNL && (
            <div className={`m-pick__nl${nl!.filters.length === 0 ? ' is-blank' : ''}`}>
              <p className="m-pick__nl-head">
                <Wand2 size={13} aria-hidden="true" />
                {nl!.filters.length ? 'Read this as a filter' : 'Could not read that as a filter'}
              </p>
              {nl!.filters.length > 0 ? (
                <>
                  <ol className="m-pick__steps">
                    {nl!.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {nl!.ignored.length > 0 && (
                    <p className="m-pick__ignored">
                      Ignored: {nl!.ignored.join(', ')}
                    </p>
                  )}
                  <Button type="primary" size="small" onClick={accept}>
                    Add {nl!.filters.length} {nl!.filters.length === 1 ? 'filter' : 'filters'}
                  </Button>
                </>
              ) : (
                <p className="m-pick__ignored">
                  Try naming an event, a property, or something like “paid users who hit an error”.
                </p>
              )}
            </div>
          )}

          {shown.length === 0 && !offerNL && <p className="m-pick__none">Nothing matches that.</p>}

          {/* ⚠ THE TWO KINDS ARE SEPARATED, AND ONLY WHEN BOTH ARE THERE
              (Mehdi, 2026-09-02: keep one button, but "if it's a filter maybe
              it shows up slightly different").

              Production splits them into two BUTTONS, which is the thing this
              deletes: you had to know whether what you wanted was an event or
              a property before you could start looking for it. What production
              is right about is that they are genuinely two kinds, and the
              picker had stopped saying so at all.

              So: one search across both, and a heading appears only when the
              result actually spans them. Type "country" and it is a filter -
              one group, no heading, nothing to disambiguate. Type "error" and
              it is both, and the headings earn their two rows.

              ── WHAT THE HEADINGS SAY ────────────────────────────────────────
              ⚠ THE SAME TWO WORDS THE ROWS WILL LAND UNDER, and until 09-04
              they were not. The picker said "Things that happened" and
              "Conditions on the session"; the card said nothing; production
              says "Events" and "Filters". Three vocabularies for two kinds, so
              picking a thing here taught you a name you would never see again.

              Now it is `vocabulary.ts` in both places: EVENTS and GROUP FILTERS,
              which are Mehdi's own words ("not filters - we'll call them
              something else, like group filters"), with the behaviour as the
              hint beside each. The name is what he asked for; the hint is what
              makes the name learnable the first time. */}
          {kinds.map((g) => (
            <div key={g.key} className="m-pick__kind">
              {kinds.length > 1 && (
                <p className="m-pick__kind-head">
                  <span className="m-pick__kind-name">{g.name}</span>
                  <span className="m-pick__kind-hint">{g.hint}</span>
                </p>
              )}
              {g.rows.map((e) => {
            /* An event is repeatable, a property is not: two Clicks in a
               sequence is the normal case, two Country filters is a
               contradiction. */
            const dead = !e.isEvent && taken.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                role="menuitem"
                disabled={dead}
                className={`m-pick__row${dead ? ' is-taken' : ''}`}
                onClick={() => pick(e)}
              >
                <span className="m-pick__icon" aria-hidden="true">
                  {entryIcon(e)}
                </span>
                <span className="m-pick__name m-truncate">{e.displayName}</span>
                {/* The category rides the row while the list is flat, so a
                    search result never leaves you guessing where it came from.
                    Inside a category it would be repeating the rail. */}
                {(q || cat === ALL) && <span className="m-pick__cat-tag">{categoryLabel(e.category)}</span>}
                {dead && <span className="m-pick__cat-tag">added</span>}
              </button>
            );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return content;
}

/**
 * THE SAME BODY IN A POPOVER, which is how the EVENT ROW uses it - the funnel
 * and the subject both hang a small menu off a control in a row.
 *
 * ⚠ THE FILTER BUTTON NO LONGER USES THIS. It opens `FilterPanel`, which hosts
 * the same `PickerBody` on a surface that morphs out of the button itself, so
 * the button and the catalogue are one object changing shape rather than two
 * overlapping panels. Two hosts, one body: the alternative was a lookalike, and
 * a lookalike is how the row's picker and the button's picker drift apart.
 */
export function FilterPicker({ children, ...rest }: FilterPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      content={<PickerBody {...rest} onDone={() => setOpen(false)} />}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
      rootClassName="m-pick-root"
      destroyOnHidden
      align={{ offset: [0, 5] }}
    >
      {children}
    </Popover>
  );
}
