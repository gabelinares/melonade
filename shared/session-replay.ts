/* ══════════════════════════════════════════════════════════════════════════
   A SESSION ROW, AS SOMETHING THE REPLAY PLAYER CAN PLAY.

   Gabriel, 2026-09-04: *"clicking on the sessions row (except the session name
   and the metadata pills) will open a session replay, same session replay we
   have in issues."*

   ⚠ SAME PLAYER, NOT A SECOND ONE. `ReplayPlayer`, `ReplayTimeline` and
   `ReplayFrame` are already built, already reviewed and already the thing the
   issue queue opens. Building a sessions player beside them would be two
   components drifting apart over one design, and the backlog says this page is
   a PLACEHOLDER this week ("drop in the existing issue-replay page"). So the
   work here is an adapter, and all of it is in this file.

   ── THE PLAYER READS A JOURNEY, AND A SESSION ROW HAS NONE ────────────────
   The whole replay - the markers on the track, the caption under the frame, the
   panel beside it - is derived from ONE STRING: `session.journey`, a plain-words
   account of what the person did, in order. The issues fixture has those
   because somebody wrote them for a demo. A `SessionRow` has no prose at all;
   what it has is `sessionEvents()`, a deterministic ordered list of event ids.

   So the journey is written FROM the events, one clause each. That keeps three
   things true at once, which is the reason to do it here rather than to bolt a
   second data path onto the player:

   1. the timeline's markers are the session's own events, in the session's own
      order - scrub the track and you are reading the event list
   2. the same session always produces the same journey, because `sessionEvents`
      is a pure function of the row
   3. an event that is REAL on the row - an error, a crash, rage - is real in
      the replay too, because `sessionEvents` already forces those in

   ⚠ THE PHRASES ARE WRITTEN TO BE CLASSIFIED. `kindOf` in replay.ts matches
   keywords to decide whether a marker is an error, a rage, a slow moment, an
   input or a navigation - so "clicked the same thing again and again" has to
   contain a rage word or a rage click draws as an ordinary click. The map below
   is checked against `KIND_RULES`; changing a phrase means checking it again.
   ══════════════════════════════════════════════════════════════════════════ */

import type { IssueSession } from './issues-data.ts';
import { displayNameOf, type SessionRow } from './sessions-data.ts';
import { sessionEvents } from './sessions-logic.ts';

/** One clause per event id. ⚠ The wording carries the marker kind - see the
 *  note above. The words that matter are marked. */
const CLAUSE: Record<string, string> = {
  /* nav */
  location: 'Reached another page',
  /* input */
  input: 'Filled in a field',
  signup_submitted: 'Submitted the sign-up form',
  /* rage */
  rageclick: 'Clicked the same thing again and again',
  taprage: 'Tapped the same thing again and again',
  /* error */
  error: 'Hit an error',
  crash: 'The page failed outright',
  deadclick: 'Clicked something that did nothing',
  /* slow */
  request: 'Waited on a request',
  graphql: 'Waited on a GraphQL call',
  /* plain clicks and product events */
  click: 'Clicked around the page',
  swipe: 'Swiped through a list',
  statechange: 'The app changed underneath',
  search_performed: 'Ran a search',
  add_to_cart: 'Added something to the cart',
  checkout_start: 'Opened checkout',
  checkout_complete: 'Placed the order',
  plan_upgraded: 'Upgraded the plan',
  invite_sent: 'Sent an invite',
  support_opened: 'Opened support',
};

/** `12m1s`, which is the shape `durationSeconds` parses. Seconds are always
 *  present so a round five minutes does not come back as `300` from the
 *  fallback branch. */
export function durationLabel(totalSec: number): string {
  const s = Math.max(1, Math.round(totalSec));
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

/**
 * The session's events as one sentence, in the shape `splitJourney` expects:
 * clauses separated by commas, the last one joined with "then".
 */
export function journeyOf(s: SessionRow): string {
  const clauses = sessionEvents(s)
    .map((id) => CLAUSE[id])
    .filter((c): c is string => !!c);
  /* A session whose events are all unmapped would give the player nothing to
     mark, and an empty track reads as broken rather than as quiet. */
  if (clauses.length === 0) return 'Opened the app, looked around, then left.';
  if (clauses.length === 1) return `${clauses[0]}.`;
  return `${clauses.slice(0, -1).join(', ')}, then ${clauses[clauses.length - 1]!.toLowerCase()}.`;
}

/**
 * The adapter. Everything the player and its timeline read, taken off the row.
 *
 * ⚠ `variation` and `tags` are empty and that is not laziness. A variation is
 * an agent's one-line reading of how THIS session experienced a known issue,
 * and a session in the list is not attached to an issue - there is nothing to
 * be a variation of. An empty string is the honest value; inventing a headline
 * would put words in the product's mouth.
 */
export function replaySessionOf(s: SessionRow): IssueSession {
  const plan = s.metadata.plan;
  return {
    email: displayNameOf(s),
    plan: plan === 'paid' || plan === 'trial' ? plan : 'free',
    browser: s.browser,
    os: s.os,
    loc: s.city,
    dur: durationLabel(s.durationSec),
    tags: [],
    journey: journeyOf(s),
    variation: '',
  };
}
