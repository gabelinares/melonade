/**
 * THE WORDS THE FILTER USES FOR ITS OWN TWO KINDS.
 *
 * ⚠ ITS OWN MODULE FOR ONE REASON: four components have to say the same thing,
 * and three of them are inside the fourth. `SearchRow` importing this from
 * `SearchCard` would be a cycle, and a cycle is how one of the four ends up
 * with its own private copy of a word.
 */
/* ── THE TWO KINDS, NAMED ─────────────────────────────────────────────────────
   ⚠ ONE VOCABULARY, IN FOUR PLACES: these headings, the picker's two groups,
   the event row's funnel, and the screen-reader sentence. The words were the
   thing Mehdi asked to change and the thing the build kept inventing - the
   picker said "Conditions on the session", the card said nothing at all, and
   production said "Filters", which is the word he rejected.

   "Group filters" is HIS word (2026-09-02): "not filters - we'll call them
   something else, like group filters". It is worth keeping exactly because it
   is slightly awkward: "filters" is a word a reader already thinks they
   understand, and getting it wrong here costs them a search that returns the
   wrong sessions. A name that makes you look once is better than a name that
   makes you assume.
   ──────────────────────────────────────────────────────────────────────────── */
export const EVENTS_HEAD = 'Events';
export const GROUP_HEAD = 'Group filters';
export const GROUP_SCOPE = 'Applied to every event above';
/** The event row's funnel, and the exact opposite sentence. */
export const EVENT_SCOPE = 'Applied to this event only';

/* ── THE FORK CARDS' OWN SENTENCES ────────────────────────────────────────────
   Longer than the section hints because they are read BEFORE you know what you
   are choosing between, not after. Each one says the scope in the smallest
   number of words that still distinguishes it from the other: an order versus
   a reach.

   ⚠ NEITHER SENTENCE USES THE WORD "FILTER", which is the point. Mehdi's
   complaint was that "people don't know right away what an event is, what a
   filter is" - so the card that teaches the distinction cannot lean on the word
   that failed to teach it. */
export const EVENTS_BLURB = 'Something that happened, in the order it happened';
export const GROUP_BLURB = 'One condition, held across every event';
