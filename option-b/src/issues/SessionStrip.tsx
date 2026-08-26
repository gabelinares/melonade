import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, TextInput } from '@mantine/core';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Monitor,
  PlayCircle,
  Plus,
  Search,
  Tag,
  X,
} from 'lucide-react';
import type { IssueSession } from '@shared/issues-data.ts';
import {
  TOP_SESSIONS,
  activeSessionFilterCount as countFilters,
  sessionDimensions,
  type SessionFilterKey,
  type SessionFilters,
} from '@shared/issues-logic.ts';
import { BrandLoader } from '../components/BrandLoader.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { SessionCard } from './SessionCard.tsx';
import { SessionSkeleton } from './SessionSkeleton.tsx';
import './session-strip.css';

/* This band's own vocabulary. `Globe` for browser and `Monitor` for device are
   the two that could be swapped and read the same either way; the tie-break is
   that a browser is the thing that talks to the network. */
const SESSION_ICONS: Partial<Record<SessionFilterKey, typeof Tag>> = {
  plan: CreditCard,
  browser: Globe,
  os: Monitor,
  tags: Tag,
};

export interface SessionStripProps {
  /** every session on the issue, for the counts and for turning a shortlist
   *  entry back into the index the player speaks */
  sessions: readonly IssueSession[];
  /** the whole ranked, filtered list. The strip draws the front of it. */
  shortlist: readonly IssueSession[];
  /** how many of it the strip draws. The cards band always takes three. */
  visible: number;
  onShowMore: () => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  /** null while nothing is open, which is what triage density means */
  activeIndex: number | null;
  onOpen: (index: number) => void;
  onStep: (delta: number) => void;
  /** `cards` at triage, `strip` once a replay is running */
  density: 'cards' | 'strip';
  filters: SessionFilters;
  query: string;
  onQuery: (value: string) => void;
  onToggleFilter: (key: SessionFilterKey, value: string) => void;
  onClearFilters: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE CONSTANT.
 *
 * Everything else in this flow either collapses or appears. This does neither:
 * it is on screen at every depth, in the same slot, and it is what carries you
 * from "which session" to "watching one" and back. That is why it is one
 * component with two densities rather than a list and, separately, a tab bar
 * that happen to hold the same data.
 *
 * It does not MOVE between depths either. It sits directly under the issue, and
 * when the issue collapses from a write-up to a two-line bar the strip simply
 * rides up with it. Nothing jumps; the space above it is what changed. That is
 * the whole trick of this layout, stated in one component.
 *
 * `cards`  triage. Three cards in a fixed three-column grid, the variation at
 *          reading size. You are choosing.
 *
 *          THREE, ALWAYS. The band is a shortlist, not a session list: nobody
 *          watches eleven recordings of one bug, they watch the two or three
 *          that show it clearest and then go and fix it. See `rankSessions` for
 *          what "clearest" means. The cap is also what lets the grid have a
 *          fixed number of columns, which is what stops a card growing from
 *          17rem to 24rem the moment a filter leaves one of them on its own.
 * `strip`  watching. One row of chips, each labelled with the SAME variation
 *          the card was labelled with, plus how long the session ran and where
 *          you are in the set. You are hopping.
 *
 *          The chips used to be labelled with the person: `daniel 12m1s`. That
 *          is an identifier for somebody you have never met, so it sorts three
 *          tabs without telling you a thing about which one to open next, and
 *          it silently changed the subject between the card ("pay button reset
 *          on mobile") and the tab for the same session ("amara"). The label a
 *          tab needs is what is IN the recording. Identity is still one hover
 *          away, and it is on the card you chose from.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SessionStrip({
  sessions,
  shortlist,
  visible,
  onShowMore,
  autoplay,
  onToggleAutoplay,
  activeIndex,
  onOpen,
  onStep,
  density,
  filters,
  query,
  onQuery,
  onToggleFilter,
  onClearFilters,
}: SessionStripProps) {
  const n = sessions.length;
  /* The cards band takes three and stays one row; the strip takes whatever
     "show more" has grown it to. Same list, same order, different window,
     because a card costs a third of the pane and a chip costs 200px. */
  const shown = density === 'cards' ? shortlist.slice(0, TOP_SESSIONS) : shortlist.slice(0, visible);

  /* Whether the search FIELD is on screen, which is the one piece of state that
     really is band-local: it is about this reader's hands, not about the issue.
     It closes when the sessions change, because the controller clears the query
     at the same moment and an open, empty field on a list you have not searched
     is a control asking a question nobody asked it. */
  const [searching, setSearching] = useState(false);
  useEffect(() => setSearching(false), [sessions]);

  /* WHETHER THE CHIPS ACTUALLY OVERFLOW, and which way, measured rather than
     guessed from a count: the pane narrows when a side panel opens and a chip
     is as wide as its variation, so a threshold on the number of them would be
     wrong at both ends.

     They drive the fade at whichever end has more behind it. A row of chips cut
     off dead straight at the pane edge reads as a rendering fault rather than
     as "there is more", which is the same rule this codebase applies to the
     write-up's scrollbar. */
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () =>
      setEdges({
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [density, shown.length]);

  /* Keep the chip that is playing on screen. Stepping with the pager or with
     J and K past the right-hand edge would otherwise move the selection
     somewhere the reader cannot see, which makes the control worse than not
     having it - the same reason the queue column scrolls its own selection into
     view. */
  useEffect(() => {
    railRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeIndex, shown.length]);

  const dimensions = useMemo(() => sessionDimensions(sessions, filters), [sessions, filters]);
  const activeCount = countFilters(filters);

  /* ── the wait ─────────────────────────────────────────────────────────────
     Re-ranking a shortlist is real work in the product this is a prototype of:
     the agent scores the sessions against the query, and that is a round trip.
     Pretending it is instant would design a band that cannot exist, so the
     prototype spends the time and shows what the reader would see - skeletons
     in the exact three slots, and the mark turning on the header line.

     It is keyed on the QUERY AND THE FILTERS, not on a click, so it also covers
     typing. The first render is not a change, so the band does not flash a
     loader at somebody who has not asked for anything yet. */
  const [pending, setPending] = useState(false);
  const criteria = `${query}|${JSON.stringify(filters)}`;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPending(true);
    /* Long enough to be read rather than glimpsed. A 200ms loader is a flash
       that reads as a glitch; this is the length of the thing it is standing in
       for, which is an agent re-scoring a hundred and thirty sessions. */
    const id = window.setTimeout(() => setPending(false), 900);
    return () => window.clearTimeout(id);
  }, [criteria]);

  const clear = () => {
    onClearFilters();
    setSearching(false);
  };

  if (density === 'cards') {
    return (
      <section className="b-strip b-strip--cards" aria-label="Sessions that hit this issue">
        {/* The same header grammar the queue column uses: a label with its
            count on the left, the tools on the right. Two lists in one app
            cannot introduce themselves two different ways. */}
        <header className="b-strip__head">
          <h2 className="m-label">
            Sessions that hit it
            {/* `x of n` whenever the band is showing fewer than the issue has,
                whether that is a filter or the cap doing it. Printing a bare
                "3" on an issue with eight sessions would be the band lying
                about the issue to keep its own label short. */}
            <span className="m-label__count">
              {shown.length === n ? n : `${shown.length} of ${n}`}
            </span>
          </h2>
          {!searching && <p className="b-strip__hint">Pick the one you want to watch.</p>}

          <div className="b-strip__tools">
            {searching ? (
              <TextInput
                data-autofocus
                autoFocus
                variant="unstyled"
                size="sm"
                className="b-strip__search"
                placeholder="Search these sessions"
                value={query}
                aria-label="Search these sessions"
                leftSection={<Search size={14} />}
                onChange={(e) => onQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    onQuery('');
                    setSearching(false);
                  }
                }}
                rightSection={
                  <IconButton
                    icon={<X size={14} />}
                    label="Close the search"
                    variant="ghost"
                    onClick={() => { onQuery(''); setSearching(false); }}
                  />
                }
              />
            ) : (
              <IconButton
                icon={<Search size={15} />}
                label="Search these sessions"
                onClick={() => setSearching(true)}
              />
            )}
            {/* The SAME menu the queue uses, over this band's vocabulary. It was
                made generic in its key rather than copied, because two filter
                menus that look alike drift the day one of them gains a feature. */}
            <FilterMenu<SessionFilterKey>
              dimensions={dimensions}
              icons={SESSION_ICONS}
              label="Filter these sessions"
              isActive={(key, value) => filters[key].includes(value)}
              onToggle={onToggleFilter}
              activeCount={activeCount}
            />
          </div>
        </header>

        {pending ? (
          /* THE SKELETONS STAY VISIBLE THROUGH IT. The scrim is a couple of
             pixels of blur and a breath of the pane's own surface, not a
             curtain: what is arriving is three cards in three known slots, and
             hiding that to show a loader would be replacing the useful half of
             the answer with the decorative one. The mark sits in the middle
             because that is where the eye already is. */
          <div className="b-strip__loading">
            <div className="b-strip__rail" aria-hidden="true">
              {Array.from({ length: Math.min(n, TOP_SESSIONS) }, (_, i) => (
                <SessionSkeleton key={i} index={i} />
              ))}
            </div>
            <div className="b-strip__scrim">
              <BrandLoader label="Finding the best sessions" size={22} />
            </div>
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No session matches that"
            hint="Every session on this issue is filtered out."
            action={
              <Button variant="default" size="xs" onClick={clear}>
                Clear
              </Button>
            }
          />
        ) : (
          <div className="b-strip__rail">
            {shown.map((s) => {
              const i = sessions.indexOf(s);
              return (
                <SessionCard
                  key={s.email}
                  session={s}
                  index={i}
                  active={activeIndex === i}
                  onOpen={() => onOpen(i)}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  }

  /* THE SAME SHORTLIST the cards were, in the same order, just a longer window
     of it. The chips are not a second list of the same data, they are the cards
     at another density, so they cannot be ranked or filtered differently from
     the thing you chose from. `at` is the position IN the window; `onOpen`
     still speaks the issue's own indices, because that is what the player
     reads. */
  const at = Math.max(0, shown.findIndex((s) => sessions.indexOf(s) === activeIndex));
  const more = shortlist.length - shown.length;

  return (
    <section className="b-strip b-strip--row" aria-label="Sessions that hit this issue">
      {/* WHAT IS ON THE STRIP, not where the playhead is. The playhead is
          already reported by the chip that is lit and by the clock under the
          player; what a strip showing three of a hundred and thirty needs to
          say is that there are a hundred and thirty. */}
      <span className="b-strip__position">
        {shown.length} of {n}
      </span>

      <div
        className={`b-strip__chips${edges.left ? ' has-left' : ''}${edges.right ? ' has-right' : ''}`}
        ref={railRef}
      >
        {shown.map((s, i) => (
          <button
            key={`${s.email}-${i}`}
            type="button"
            className={`b-schip${i === at ? ' is-on' : ''}`}
            aria-current={i === at ? 'true' : undefined}
            onClick={() => onOpen(sessions.indexOf(s))}
            title={`${s.variation} (${s.email})`}
            aria-label={`Session ${i + 1} of ${shown.length}: ${s.variation}`}
          >
            <span className="m-truncate">{s.variation}</span>
            <span className="b-schip__dur m-mono">{s.dur}</span>
          </button>
        ))}
      </div>

      {/* ── the controls, all of them, on the right ──────────────────────────
          The arrows used to sit one at each end with the chips between them,
          which is a pager wrapped around a list you can already click. Here
          they are a pair, in a group, where a pager goes.

          ALL FOUR ARE ALWAYS DRAWN, and go quiet rather than disappearing when
          they have nothing to do. This is the one place in the app that breaks
          the "controls are simply not part of this depth" rule, and it earns
          it: this bar is beside a running replay, the reader is watching rather
          than reading, and a control group that changes width every time the
          list grows or the selection reaches an end is movement in the corner
          of the eye of somebody trying to watch something else. A steady bar of
          four is quieter than a correct bar of one to four. */}
      <div className="b-strip__controls">
        <IconButton
          icon={<Plus size={15} />}
          label={
            more > 0
              ? `Show ${Math.min(more, TOP_SESSIONS)} more (${Math.min(shown.length + TOP_SESSIONS, n)} of ${n})`
              : 'Every session is already on the strip'
          }
          variant="ghost"
          disabled={more <= 0}
          onClick={onShowMore}
        />
        <IconButton
          icon={<PlayCircle size={15} />}
          label={autoplay ? 'Stop playing through the sessions' : 'Play through the sessions'}
          variant="ghost"
          pressed={autoplay}
          onClick={onToggleAutoplay}
        />
        <div className="b-strip__pager">
          <IconButton
            icon={<ChevronLeft size={14} />}
            label="Previous session"
            variant="ghost"
            disabled={at <= 0}
            onClick={() => onStep(-1)}
          />
          <IconButton
            icon={<ChevronRight size={14} />}
            label="Next session"
            variant="ghost"
            disabled={at >= shown.length - 1}
            onClick={() => onStep(1)}
          />
        </div>
      </div>
    </section>
  );
}
