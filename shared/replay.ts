/* ═══════════════════════════════════════════════════════════════════════════
   REPLAY, as data.

   Pure and deterministic, in shared/ beside the issue data, for the same
   reason: what a replay CONTAINS is a fact about the session, not a design
   decision either option gets to make. How it is drawn is the app's business.

   Nothing here uses Math.random or Date.now. A timeline that reshuffles on
   every render cannot be reviewed, screenshotted, or compared between the two
   options, and a prototype whose evidence moves is not evidence.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Issue, IssueSession } from './issues-data.ts';
import type { ConsoleLine, NetworkCall } from './runs-data.ts';

export type MarkerKind = 'click' | 'rage' | 'error' | 'slow' | 'input' | 'nav';

export interface ReplayMarker {
  /** seconds from the start of the session */
  at: number;
  kind: MarkerKind;
  /** the clause from the session's own journey that produced this marker */
  label: string;
}

/** "12m1s" -> 721. "6m03s" -> 363. Falls back to 5 minutes on anything odd,
 *  because a zero-length timeline divides by zero downstream. */
export function durationSeconds(dur: string): number {
  const m = /^(?:(\d+)m)?(?:(\d+)s)?$/.exec(dur.trim());
  if (!m) return 300;
  const secs = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return secs > 0 ? secs : 300;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ── what kind of event a journey clause describes ──────────────────────────
   Keyword matching, and it is deliberately shallow: this is mock data derived
   from prose someone wrote for a demo, not an event classifier. The order
   matters, because "retried the same card twice" is both a rage signal and a
   click and the rage reading is the useful one. */
const KIND_RULES: ReadonlyArray<[MarkerKind, RegExp]> = [
  ['error', /spinner|failed|silently|error|nothing (fired|happened|acknowledged)|no message|404/i],
  ['rage', /twice|seven times|again|retried|re-entered|looped|frustrat|hunting|gave up|abandon|quit|left the cart/i],
  ['slow', /slow|took \d|waited|\d+s to|never resolv|kept turning|half-loaded|stared|hung|trickl/i],
  ['input', /filled|entered|typed|submitted|card details|form/i],
  ['nav', /reached|scrolled|went to|opened|checkout|cart|page/i],
];

function kindOf(clause: string): MarkerKind {
  for (const [kind, re] of KIND_RULES) if (re.test(clause)) return kind;
  return 'click';
}

/**
 * A journey string, split into the steps it describes.
 *
 * ONE SPLITTER, THREE APPEARANCES, and that is the point of putting it here.
 * The same clauses become the numbered steps in the write-up, the markers on
 * the replay timeline, and (unsplit) the line that survives on the collapsed
 * bar. A reader who scans the steps, then scrubs the track, then glances at the
 * bar is looking at one object three times rather than at three descriptions
 * that have to be kept in agreement by hand.
 *
 * Splits on commas, on "then" and on "and finally", strips the leading
 * conjunction and the trailing full stop. Shallow on purpose: this is prose
 * someone wrote for a demo, not a parser.
 */
export function splitJourney(journey: string): string[] {
  return journey
    .split(/,(?![^(]*\))|(?:\s+then\s+)|(?:\s+and finally\s+)/i)
    .map((c) => c.replace(/^\s*(and|then)\s+/i, '').trim().replace(/\.$/, ''))
    .filter((c) => c.length > 2)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));
}

/**
 * The timeline's markers ARE the session's journey.
 *
 * This is the one idea in this file worth defending. The journey string on
 * every session is already a plain-words account of what the person did, in
 * order - "filled in card details, hit Place order, watched the spinner end
 * with nothing, re-entered the same card twice, then left the cart". Split on
 * its clauses and you have an ordered event list for free, with real labels,
 * that is guaranteed to agree with the write-up the reader just scanned.
 *
 * The alternative was inventing a plausible-looking event stream. That would
 * have produced a timeline that looks right and says nothing, and worse, one
 * that could contradict the paragraph directly above it.
 *
 * Placement: clauses are spread across the middle 80% of the session, so the
 * first marker is not glued to 0:00 and the last is not glued to the end. The
 * spacing is even because guessing at realistic gaps would be inventing again.
 */
export function replayMarkers(session: IssueSession): ReplayMarker[] {
  const total = durationSeconds(session.dur);
  const clauses = splitJourney(session.journey);

  if (clauses.length === 0) return [];

  const first = total * 0.1;
  const span = total * 0.8;
  const step = clauses.length === 1 ? 0 : span / (clauses.length - 1);

  return clauses.map((label, i) => ({
    at: Math.round(first + step * i),
    kind: kindOf(label),
    label,
  }));
}

/**
 * The moment the issue actually bit, which is the only timestamp anyone wants.
 *
 * The first error marker, or failing that the first rage marker, or failing
 * that the middle of the session. Returned as its own thing rather than left
 * for the UI to find, because "jump to the failure" is the single most useful
 * control on a replay of a known issue and it should not be re-derived by
 * whoever draws the button.
 */
export function failureMoment(session: IssueSession): ReplayMarker | null {
  const markers = replayMarkers(session);
  return (
    markers.find((m) => m.kind === 'error') ??
    markers.find((m) => m.kind === 'rage') ??
    /* A slow page is a failure with no error on it, and the sessions on the
       load-time issues have nothing else to point at. Without this they fell
       through to "the middle of the session", which lands on whatever clause
       happens to be third and reads as arbitrary the moment anyone checks. */
    markers.find((m) => m.kind === 'slow') ??
    markers[Math.floor(markers.length / 2)] ??
    null
  );
}

/**
 * The INDEX of the failure marker, for anything that needs to place the cursor
 * at that moment rather than seek to it. Separate from `failureMoment` because
 * the two callers want different things: the player wants a timestamp to seek
 * to, and a still frame wants to know which step of the walk it is drawing.
 * Derived the same way, so the thumbnail on a session card and the moment the
 * player jumps to cannot disagree.
 */
export function failureIndex(session: IssueSession): number {
  const markers = replayMarkers(session);
  const moment = failureMoment(session);
  if (!moment) return 0;
  return Math.max(0, markers.findIndex((m) => m.at === moment.at && m.label === moment.label));
}

export const REPLAY_HOST = 'frontend.acme.com';

/** The page a session was on when the issue hit. Derived from the issue's own
 *  tags so the browser chrome does not contradict the write-up. */
export function issuePath(issue: Issue): string {
  const t = issue.tags.map((x) => x.toLowerCase());
  return t.includes('checkout')
    ? '/checkout/payment'
    : t.includes('payment')
      ? '/checkout/payment'
      : t.includes('onboarding')
        ? '/onboarding/step-4'
        : t.includes('search')
          ? '/search?q=running+shoes'
          : t.includes('navigation')
            ? '/products'
            : '/';
}

export function replayUrl(issue: Issue): string {
  return `${REPLAY_HOST}${issuePath(issue)}`;
}

/* ── which page a clause happened on ────────────────────────────────────────
   Only STRONG page words move the reader to a new path. "Spinner" appears in a
   checkout journey and in a search journey, so words like that are deliberately
   absent: a step that names no page stays on the page the last one named. That
   carry-forward is the whole reason the panel can print a path once per page
   instead of once per row. */
const PATH_RULES: ReadonlyArray<[RegExp, string]> = [
  [/help cent|support page/i, '/help'],
  [/404|dead page/i, '/404'],
  [/contact/i, '/contact'],
  [/pricing/i, '/pricing'],
  [/dashboard|chart/i, '/dashboard'],
  [/(?:back|forward|returned) to the cart|cart page|basket/i, '/cart'],
  [/checkout|place order|payment|pay button|card details|expiry/i, '/checkout/payment'],
  [/onboarding|step \d|14-field|long form/i, '/onboarding/step-4'],
  [/categor|listing|grid|thumbnail|product/i, '/products'],
  [/search|typed a query/i, '/search?q=running+shoes'],
];

/**
 * ONE JOURNEY STEP, which is one clause of the session's journey string with
 * everything the panel beside the player needs to draw it.
 *
 * `path` is resolved FORWARD: a step that names no page inherits the page the
 * previous step was on, and the first step starts on the issue's own page. So
 * every step knows where it happened, and `pathChanged` marks the handful that
 * are worth printing it for.
 */
export interface JourneyStep {
  index: number;
  /** seconds from the start of the session */
  at: number;
  kind: MarkerKind;
  label: string;
  path: string;
  /** first step on this path: the only row that prints it */
  pathChanged: boolean;
  /** the moment the issue bit. Marks THIS step and nothing after it: the
   *  session carries on and the steps that follow are ordinary steps. */
  failure: boolean;
}

/**
 * The journey, as rows.
 *
 * Same clauses, same timestamps and same kinds as `replayMarkers` - this is
 * that list with the page carried forward and the failure marked, because a
 * panel beside the player is reading the session and the track underneath it is
 * scrubbing the session, and the two must not be able to disagree about what
 * happened or when.
 */
export function journeySteps(issue: Issue, session: IssueSession): JourneyStep[] {
  const markers = replayMarkers(session);
  const broke = failureIndex(session);

  let path = issuePath(issue);
  return markers.map((m, i) => {
    const hit = PATH_RULES.find(([re]) => re.test(m.label));
    const next = hit ? hit[1] : path;
    const changed = i === 0 || next !== path;
    path = next;
    return {
      index: i,
      at: m.at,
      kind: m.kind,
      label: m.label,
      path,
      pathChanged: changed,
      failure: markers.length > 0 && i === broke,
    };
  });
}

/* ── CONSOLE AND NETWORK, THE SAME SHAPE SYNTHETICS ALREADY DRAWS ────────────
   Mehdi, 2026-09-01: design console and network once, on the replay page, then
   put the same thing on a Synthetics run - "the one addition anywhere" to this
   week's scope. It shipped in the other order: the run drawer's own
   `NetworkTable`/`ConsoleView` (`tests/RunDrawer.tsx`) went out first, seeded
   on `RunData`. This reads that design backwards onto a session - `ConsoleLine`
   and `NetworkCall` are the run drawer's own types (`runs-data.ts`), not a
   second version of the same idea, and the two lists share the drawer's own
   `consoleErrorCount`/`netErrorCount` for their tab badges.

   ⚠ A RUN ONLY KEEPS THESE WHEN IT FAILED - there is nothing to look at on a
   pass. A SESSION is not that: it is a real visit, and there is always
   something in the console and on the wire whether or not anything broke. So
   the baseline lines and calls below are unconditional, and a marker's own
   kind - found by `replayMarkers`, the same list the track and the journey
   panel already read - only ADDS to them, at the moment it happened. The
   three panels (track, journey, console/network) can never disagree about
   when something went wrong, because all three are reading the one marker
   list.

   Seeded on the journey string rather than `Math.random`, for the reason
   every other fixture in this file is: reload the page and the same session
   shows the same lines at the same timestamps. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const timingFor = (seed: number, wait: number) => ({
  blocked: 1 + (seed % 3),
  dns: seed % 7,
  connect: 4 + (seed % 9),
  send: 1,
  wait,
  receive: 2 + (seed % 5),
});

/** Where a marker's own label points, by the same rule `journeySteps` carries
 *  forward - applied with no `Issue` to start it from, because the sessions
 *  list opens this replay on no issue at all. */
function pathFor(label: string, fallback: string): string {
  const hit = PATH_RULES.find(([re]) => re.test(label));
  return hit ? hit[1] : fallback;
}

/** The console, as the session's own markers would have produced it. */
export function sessionConsole(session: IssueSession): ConsoleLine[] {
  const seed = hash32(session.journey);
  const markers = replayMarkers(session);
  const lines: ConsoleLine[] = [
    { level: 'log', at: 80, text: 'app: hydrated' },
    {
      level: 'log',
      at: 240 + (seed % 300),
      text: `router: navigated to ${pathFor(markers[0]?.label ?? '', '/')}`,
    },
  ];
  for (const m of markers) {
    const at = m.at * 1000;
    if (m.kind === 'error') {
      lines.push(
        { level: 'error', at: Math.max(0, at - 60), text: 'Failed to load resource: the server responded with a status of 500' },
        { level: 'error', at, text: `Uncaught (in promise) Error: ${m.label.toLowerCase()}` },
      );
    } else if (m.kind === 'slow') {
      lines.push({ level: 'warn', at: Math.max(0, at - 400), text: 'Slow network is throttled: XHR finished loading in 4200ms' });
    }
  }
  return lines.sort((a, b) => a.at - b.at);
}

/** The requests the session made. Same seed as `sessionConsole`, and read off
 *  the same marker list, so the two panels never disagree about when things
 *  went wrong. */
export function sessionNetwork(session: IssueSession): NetworkCall[] {
  const seed = hash32(session.journey);
  const markers = replayMarkers(session);
  const t = (wait: number) => timingFor(seed, wait);
  const calls: NetworkCall[] = [
    { method: 'GET', url: '/api/session', status: 200, time: 84 + (seed % 40), size: 1240, timing: t(70) },
    { method: 'GET', url: '/api/user', status: 200, time: 96 + (seed % 50), size: 2180, timing: t(82) },
  ];
  for (const m of markers) {
    const path = pathFor(m.label, '/');
    if (m.kind === 'error') {
      calls.push({ method: 'POST', url: `/api${path}`, status: 500, time: 5010, size: 180, timing: t(4980) });
    } else if (m.kind === 'slow') {
      calls.push({ method: 'GET', url: `/api${path}`, status: 200, time: 4200 + (seed % 600), size: 8600, timing: t(4100) });
    } else if (m.kind === 'nav') {
      calls.push({ method: 'GET', url: `/api${path}`, status: 200, time: 110 + (seed % 70), size: 3400, timing: t(90) });
    }
  }
  return calls;
}
