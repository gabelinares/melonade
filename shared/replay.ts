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

/* ── THE DEV TOOLS: WHAT A SESSION ACTUALLY CARRIES ──────────────────────────
   Mehdi asked three times (08-26, 08-27, 09-01) for the replay's dev tools -
   "the one addition anywhere" to the scope - and on 09-04 Gabriel drew the
   line under what that means: the BOTTOM block production already has (X-Ray,
   Console, Network, Performance, State, Events, Traces), redrawn, "using
   exactly the capabilities of OpenReplay, don't bring data we don't have".

   So the shapes below are production's, read out of the player code
   (Controls.tsx, shared/DevTools/*, Session_/Performance): a console line is
   a level and a text at a time; a request is status / type / method / name /
   size / duration and where it sits on the waterfall; performance is four
   series the tracker samples - FPS, CPU, heap, DOM nodes - plus the device heap
   and connection quality. Nothing here that the tracker does not send.

   ⚠ STATE, EVENTS AND TRACES ARE NOT GENERATED. In production State only
   exists when a store (Redux / MobX / Vuex / NgRx / Zustand / Pinia) is
   detected, Events only when `tracker.event()` or an integration has posted
   something, Traces only when a backend-log integration is connected. This
   fixture is a plain shop with none of those, so those three tabs show
   production's own empty states - which is a true thing about this session
   rather than an invented store.

   Seeded on the journey string and read off `replayMarkers`, so a request
   failing in Network is the same moment as the danger marker on the track and
   the ring on the journey step. Three panels, one list of moments. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Where a marker's own label points, by the same rule `journeySteps` carries
 *  forward - applied with no `Issue` to start it from, because the sessions
 *  list opens this replay on no issue at all. */
function pathFor(label: string, fallback: string): string {
  const hit = PATH_RULES.find(([re]) => re.test(label));
  return hit ? hit[1] : fallback;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface SessionLog {
  /** seconds into the session */
  at: number;
  level: LogLevel;
  /** the line as logged, one line */
  text: string;
  /** an exception's own message - the part production underlines and opens */
  message?: string;
}

export type RequestType = 'fetch' | 'xhr' | 'js' | 'css' | 'img' | 'other';

export interface SessionRequest {
  /** seconds into the session, when it was sent */
  at: number;
  status: number;
  type: RequestType;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  /** bytes transferred */
  size: number;
  /** ms, send to last byte */
  duration: number;
  /** ms, send to first byte - the first segment of the waterfall bar */
  ttfb: number;
  cached?: boolean;
}

export interface PerfSample {
  at: number;
  fps: number;
  /** percent */
  cpu: number;
  /** bytes of JS heap in use */
  heap: number;
  nodes: number;
}

export type ConnectionQuality = 'Excellent' | 'Good' | 'Average' | 'Poor';

export interface SessionPerformance {
  samples: PerfSample[];
  /** bytes the device reports as its heap limit */
  deviceHeap: number;
  connection: ConnectionQuality;
}

/** The console, as the session's own markers would have produced it. */
export function sessionLogs(session: IssueSession): SessionLog[] {
  const seed = hash32(session.journey);
  const total = durationSeconds(session.dur);
  const markers = replayMarkers(session);
  const firstPath = pathFor(markers[0]?.label ?? '', '/');
  const lines: SessionLog[] = [
    { at: 0.1, level: 'info', text: '[app] hydrated in ' + (180 + (seed % 90)) + 'ms' },
    { at: 0.3 + (seed % 5) / 10, level: 'info', text: '[router] navigated to ' + firstPath },
    { at: 1.2 + (seed % 7) / 10, level: 'info', text: '[analytics] page_view {path: "' + firstPath + '"}' },
  ];
  let lastPath = firstPath;
  for (const m of markers) {
    const path = pathFor(m.label, lastPath);
    if (path !== lastPath) {
      lines.push({ at: m.at, level: 'info', text: '[router] navigated to ' + path });
      lastPath = path;
    }
    if (m.kind === 'error') {
      lines.push(
        { at: Math.max(0, m.at - 0.06), level: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
        {
          at: m.at,
          level: 'error',
          text: 'Uncaught (in promise) TypeError',
          message: "Cannot read properties of undefined (reading 'status')",
        },
      );
    } else if (m.kind === 'slow') {
      lines.push({ at: Math.max(0, m.at - 0.4), level: 'warn', text: '[perf] long task 412ms on ' + path });
    } else if (m.kind === 'rage') {
      lines.push({ at: m.at, level: 'warn', text: '[ui] handler for #place-order fired ' + (3 + (seed % 3)) + ' times in 1.1s' });
    } else if (m.kind === 'input') {
      lines.push({ at: m.at, level: 'info', text: '[form] field validated {ok: true}' });
    }
  }
  if (total > 30) lines.push({ at: total - 2, level: 'info', text: '[analytics] session_end' });
  return lines.sort((a, b) => a.at - b.at);
}

const KB = 1024;

/** The requests the session made, in the order they were sent. */
export function sessionRequests(session: IssueSession): SessionRequest[] {
  const seed = hash32(session.journey);
  const markers = replayMarkers(session);
  const firstPath = pathFor(markers[0]?.label ?? '', '/');
  const jitter = (n: number, spread: number) => n + (seed % spread);
  /* THE PAGE LOAD. A document, its scripts, its styles, a few images - the part
     of every waterfall that looks the same on every site. */
  const calls: SessionRequest[] = [
    { at: 0.02, status: 200, type: 'other', method: 'GET', url: REPLAY_HOST + firstPath, size: 18 * KB, duration: jitter(210, 60), ttfb: jitter(140, 40) },
    { at: 0.24, status: 200, type: 'css', method: 'GET', url: '/static/css/app.7f3c1.css', size: 61 * KB, duration: jitter(90, 40), ttfb: 22 },
    { at: 0.25, status: 200, type: 'js', method: 'GET', url: '/static/js/vendor.a91c0.js', size: 412 * KB, duration: jitter(320, 120), ttfb: 30 },
    { at: 0.26, status: 200, type: 'js', method: 'GET', url: '/static/js/app.5d2e8.js', size: 188 * KB, duration: jitter(240, 90), ttfb: 28 },
    { at: 0.6, status: 200, type: 'img', method: 'GET', url: '/images/logo.svg', size: 4 * KB, duration: jitter(48, 20), ttfb: 18, cached: true },
    { at: 0.9, status: 200, type: 'fetch', method: 'GET', url: '/api/session', size: 1240, duration: jitter(84, 40), ttfb: jitter(60, 30) },
    { at: 0.95, status: 200, type: 'fetch', method: 'GET', url: '/api/user', size: 2180, duration: jitter(96, 50), ttfb: jitter(70, 30) },
    { at: 1.4, status: 200, type: 'img', method: 'GET', url: '/images/hero@2x.webp', size: 214 * KB, duration: jitter(380, 200), ttfb: 35 },
  ];
  let lastPath = firstPath;
  for (const m of markers) {
    const path = pathFor(m.label, lastPath);
    if (path !== lastPath) {
      calls.push(
        { at: m.at + 0.05, status: 200, type: 'fetch', method: 'GET', url: '/api' + path.split('?')[0], size: jitter(3, 6) * KB, duration: jitter(110, 70), ttfb: jitter(80, 40) },
        { at: m.at + 0.3, status: 200, type: 'img', method: 'GET', url: '/images' + path.split('?')[0] + '/cover.webp', size: jitter(80, 90) * KB, duration: jitter(260, 160), ttfb: 30 },
      );
      lastPath = path;
    }
    if (m.kind === 'error') {
      calls.push({ at: m.at - 0.5, status: 500, type: 'fetch', method: 'POST', url: '/api/payments/authorize', size: 180, duration: 5010, ttfb: 4980 });
    } else if (m.kind === 'slow') {
      calls.push({ at: m.at - 4.2, status: 200, type: 'xhr', method: 'GET', url: '/api' + path.split('?')[0] + '/items?page=1', size: 118 * KB, duration: jitter(4200, 600), ttfb: jitter(3900, 400) });
    } else if (m.kind === 'input') {
      calls.push({ at: m.at + 0.2, status: 200, type: 'fetch', method: 'POST', url: '/api/checkout/validate', size: 320, duration: jitter(210, 90), ttfb: jitter(180, 60) });
    } else if (m.kind === 'rage') {
      for (let i = 0; i < 3; i += 1) {
        calls.push({ at: m.at + i * 0.4, status: 200, type: 'fetch', method: 'POST', url: '/api/checkout/validate', size: 320, duration: jitter(190, 60), ttfb: jitter(160, 50) });
      }
    }
  }
  return calls.sort((a, b) => a.at - b.at);
}

/** FPS, CPU, heap and DOM nodes, sampled across the session the way the
 *  tracker does - one sample a few seconds apart, so a 12-minute session is
 *  a few hundred points rather than a point per frame. */
export function sessionPerformance(session: IssueSession): SessionPerformance {
  const seed = hash32(session.journey);
  const total = durationSeconds(session.dur);
  const markers = replayMarkers(session);
  const n = 48;
  const step = total / (n - 1);
  const samples: PerfSample[] = [];
  let heap = (38 + (seed % 20)) * 1024 * 1024;
  let nodes = 900 + (seed % 400);
  for (let i = 0; i < n; i += 1) {
    const at = i * step;
    /* a deterministic wobble: the same session draws the same curve */
    const w = ((seed >>> (i % 24)) & 7) / 7;
    const near = markers.find((m) => Math.abs(m.at - at) < step);
    heap += (0.4 + w) * 1024 * 1024;
    /* a GC every so often; the sawtooth the heap chart is known for */
    if (i % 11 === 10) heap *= 0.72;
    if (near?.kind === 'nav') nodes += 380 + Math.round(w * 300);
    if (near?.kind === 'error') nodes -= 120;
    let fps = 60 - Math.round(w * 3);
    let cpu = 6 + Math.round(w * 9);
    if (near?.kind === 'rage' || near?.kind === 'slow') { fps = 18 + Math.round(w * 8); cpu = 62 + Math.round(w * 25); }
    if (near?.kind === 'error') { fps = 41 - Math.round(w * 6); cpu = 38 + Math.round(w * 12); }
    if (near?.kind === 'input') cpu += 8;
    samples.push({ at, fps, cpu, heap: Math.round(heap), nodes });
  }
  const slow = markers.some((m) => m.kind === 'slow');
  const connection: ConnectionQuality = slow
    ? (seed % 2 ? 'Poor' : 'Average')
    : (seed % 2 ? 'Good' : 'Excellent');
  const gb = ([2, 4, 8] as const)[seed % 3] ?? 4;
  return { samples, deviceHeap: gb * 1024 * 1024 * 1024 + (seed % 97) * 1024 * 1024, connection };
}

/** "1.2 MB", "64 B" - production's `formatBytes`, to two significant places. */
export function formatBytes(n: number): string {
  if (n < KB) return n + ' B';
  if (n < KB * KB) return (n / KB).toFixed(n < 10 * KB ? 1 : 0) + ' KB';
  if (n < KB * KB * KB) return (n / (KB * KB)).toFixed(2) + ' MB';
  return (n / (KB * KB * KB)).toFixed(2) + ' GB';
}
