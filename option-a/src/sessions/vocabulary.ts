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

/* ⚠ THE FORK'S TWO CARD SENTENCES LIVED HERE and went out with the fork on
   2026-09-04 - Mehdi rejected the two-step ("it adds another click") and the
   cards that carried them. `git show` has them if it reopens. The four words
   above survived because they are not the fork's: they name the two kinds
   wherever the two kinds are named, which is now the picker's group headings
   and the two sections of the rule list. */

/* ── WHAT AN EMPTY SECTION SAYS ───────────────────────────────────────────────
   ⚠ BOTH SECTIONS EXIST WHENEVER THE FILTER DOES, so one of them is routinely
   a heading over nothing - and a heading over nothing reads as a section that
   failed to load rather than as one you have not used.

   ⚠ AND IT IS PLAIN. The first version tried to say what the absence MEANT -
   "Nothing has to have happened", "No condition held across them" - which is
   accurate, reads as a riddle, and is the wrong register for a line that
   appears in the corner of a card you are in the middle of using. An empty
   section only has to say it is empty; the heading above it already says what
   the section is for. */
export const EVENTS_EMPTY = 'No events yet';
export const GROUP_EMPTY = 'No group filters yet';
