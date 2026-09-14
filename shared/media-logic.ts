/* ══════════════════════════════════════════════════════════════════════════
   WHAT SITS BEHIND A SPOT CARD AND A COBROWSE ROW (2026-09-14).

   Spot and CoBrowse shipped on 09-04 with a StubDrawer on every card and row.
   This is the data those open onto, derived on a stable hash rather than
   invented per render: a spot's browser and screen, its comments and its
   activity; a live session's viewport; a recording's length and the signed
   URL production would hand the browser.

   Two adapters turn a Spot or a LiveSession into the `IssueSession` the
   replay's console and network panels already read (`sessionLogs`,
   `sessionRequests` in replay.ts key off `journey` and `dur`), so a spot's
   Console tab and the live view's Console tab are the SAME component the
   session replay uses, fed the same way. No second console.

   Production read out of the code (see DESIGN.md §43): `Spots/SpotPlayer/*`,
   `Session/Player/LivePlayer/*`, `Assist/RecordingsList`.
   ══════════════════════════════════════════════════════════════════════════ */

import type { IssueSession } from './issues-data.ts';
import type { LiveSession, Recording } from './cobrowse-data.ts';
import type { Spot } from './spot-data.ts';
import { durationLabel } from './session-replay.ts';

export const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const pick = <T,>(arr: readonly T[], seed: string): T => arr[hashOf(seed) % arr.length]!;

/* ── A SPOT ───────────────────────────────────────────────────────────────── */

export interface SpotMeta {
  browser: string;
  resolution: string;
  platform: string;
  /** Anyone with the link can view. Production's "Manage Access". */
  isPublic: boolean;
  publicUrl: string;
  internalUrl: string;
}

const BROWSERS = ['Chromium v128', 'Chromium v127', 'Chrome v129', 'Edge v128'];
const RESOLUTIONS = ['1440 × 900', '1920 × 1080', '1536 × 864', '2560 × 1440'];
const PLATFORMS = ['macOS', 'Windows', 'Linux'];

export function spotMetaOf(spot: Spot): SpotMeta {
  const seed = `spot:${spot.id}`;
  const key = hashOf(seed).toString(36);
  return {
    browser: pick(BROWSERS, seed + 'b'),
    resolution: pick(RESOLUTIONS, seed + 'r'),
    platform: pick(PLATFORMS, seed + 'p'),
    isPublic: hashOf(seed + 'pub') % 3 === 0,
    publicUrl: `https://app.openreplay.com/view-spot/${spot.id}?pub_key=${key}`,
    internalUrl: `https://app.openreplay.com/1/view-spot/${spot.id}`,
  };
}

export interface SpotComment {
  id: string;
  author: string;
  /** minutes before now */
  minutesAgo: number;
  body: string;
}

const COMMENTERS = ['Sarah K.', 'Mehdi O.', 'Nikita M.', 'Gabriel L.', 'Priya R.'];
const COMMENT_BODIES = [
  'Reproduced on my side, same result on Safari.',
  'Is this the same as the checkout ticket from last week?',
  'Looks like the cart store is not reset after the order confirms.',
  'Filed it - linked the Linear issue in the thread.',
  'Nice catch. Can you also record the mobile version?',
  'The spinner ends before the request returns, that is the bug.',
  'Merged the fix this morning, should be gone on staging.',
  'Thanks, sharing this with support.',
];

export function spotCommentsOf(spot: Spot): SpotComment[] {
  const seed = `spot:${spot.id}`;
  const n = 3 + (hashOf(seed + 'n') % 6);
  /* One offset per spot, then a walk: eight bodies for at most eight comments,
     so a thread never says the same thing twice. */
  const base = hashOf(seed + 'b') % COMMENT_BODIES.length;
  return Array.from({ length: n }, (_, i) => ({
    id: `${spot.id}-c${i}`,
    author: pick(COMMENTERS, `${seed}:${i}:a`),
    minutesAgo: 20 + ((n - i) * (60 + (hashOf(`${seed}:${i}:t`) % 400))),
    body: COMMENT_BODIES[(base + i) % COMMENT_BODIES.length]!,
  }));
}

export type SpotActivityKind = 'nav' | 'click' | 'input' | 'error';

export interface SpotActivity {
  /** seconds into the clip */
  at: number;
  kind: SpotActivityKind;
  label: string;
}

const PATHS = ['/checkout', '/cart', '/pricing', '/onboarding/step-2', '/dashboard', '/settings/billing'];
const CLICKS = ['Clicked "Place order"', 'Clicked "Continue"', 'Clicked the cart icon', 'Clicked "Export"', 'Clicked "Save"'];
const INPUTS = ['Typed in the coupon field', 'Typed in the search box', 'Filled in the card number'];

/** The moments the clip's timeline marks. Written as journey clauses, so the
 *  same words feed the replay's marker heuristics (`kindOf`) unchanged. */
export function spotActivityOf(spot: Spot): SpotActivity[] {
  const seed = `spot:${spot.id}`;
  const n = Math.max(3, Math.min(8, Math.round(spot.durationSec / 25)));
  const out: SpotActivity[] = [];
  for (let i = 0; i < n; i++) {
    const at = Math.round((spot.durationSec * (i + 0.5)) / n);
    const roll = hashOf(`${seed}:${i}`) % 10;
    if (i === 0 || roll < 3) out.push({ at, kind: 'nav', label: `Opened ${pick(PATHS, `${seed}:${i}:p`)}` });
    else if (roll < 7) out.push({ at, kind: 'click', label: pick(CLICKS, `${seed}:${i}:c`) });
    else if (roll < 9) out.push({ at, kind: 'input', label: pick(INPUTS, `${seed}:${i}:i`) });
    else out.push({ at, kind: 'error', label: 'Saw an error in the console' });
  }
  /* A bug-shaped title deserves a bug-shaped clip. */
  if (/bug|issue|not|disabled|overlap/i.test(spot.title) && !out.some((a) => a.kind === 'error')) {
    out[out.length - 2] = { ...out[out.length - 2]!, kind: 'error', label: 'Saw an error in the console' };
  }
  return out;
}

const journeyFrom = (clauses: readonly string[]): string =>
  clauses.length === 0
    ? 'Opened the app, looked around, then left.'
    : clauses.length === 1
      ? `${clauses[0]}.`
      : `${clauses.slice(0, -1).join(', ')}, then ${clauses[clauses.length - 1]!.toLowerCase()}.`;

/** The spot, as the replay's panels read a session. `email` is the author:
 *  a spot is a clip of the author's own screen, not of a visitor's. */
export function spotReplaySessionOf(spot: Spot): IssueSession {
  const meta = spotMetaOf(spot);
  return {
    email: spot.ownerName,
    plan: 'paid',
    browser: meta.browser,
    os: meta.platform,
    loc: '—',
    dur: durationLabel(spot.durationSec),
    tags: [],
    journey: journeyFrom(spotActivityOf(spot).map((a) => a.label)),
    variation: '',
  };
}

/* ── A LIVE SESSION ───────────────────────────────────────────────────────── */

export interface LiveMeta {
  browser: string;
  os: string;
  viewport: string;
  plan: 'paid' | 'trial' | 'free';
}

const LIVE_BROWSERS = ['Chrome 128', 'Safari 17.6', 'Firefox 130', 'Edge 128'];
const LIVE_OS = ['macOS 14', 'Windows 11', 'Ubuntu 24.04'];
const VIEWPORTS = ['1440 × 900', '1920 × 1080', '1366 × 768', '1728 × 1117'];

export const liveIdentityOf = (s: LiveSession): string => s.userId ?? s.userAnonymousId;

export function liveMetaOf(s: LiveSession): LiveMeta {
  const seed = `live:${s.id}`;
  return {
    browser: pick(LIVE_BROWSERS, seed + 'b'),
    os: pick(LIVE_OS, seed + 'o'),
    viewport: pick(VIEWPORTS, seed + 'v'),
    plan: s.userId ? (hashOf(seed) % 4 === 0 ? 'trial' : 'paid') : 'free',
  };
}

const LIVE_CLAUSES = [
  'Opened /dashboard',
  'Opened /settings/billing',
  'Clicked "Change plan"',
  'Typed in the seats field',
  'Clicked "Save"',
  'Saw an error in the console',
  'Opened /team',
  'Clicked "Invite"',
];

/** The live session, as the replay's panels read one. The journey is what
 *  the visitor has done so far; its length follows how long they have been
 *  on, so a two-minute session has fewer moments than a fourteen-minute one. */
export function liveReplaySessionOf(s: LiveSession): IssueSession {
  const meta = liveMetaOf(s);
  const n = Math.max(2, Math.min(8, Math.round(s.durationSec / 90)));
  const clauses = Array.from({ length: n }, (_, i) => pick(LIVE_CLAUSES, `live:${s.id}:${i}`));
  return {
    email: liveIdentityOf(s),
    plan: meta.plan,
    browser: meta.browser,
    os: meta.os,
    loc: s.city,
    dur: durationLabel(Math.max(60, s.durationSec)),
    tags: [],
    journey: journeyFrom(clauses),
    variation: '',
  };
}

/* ── A RECORDING ──────────────────────────────────────────────────────────── */

export interface RecordingMeta {
  durationSec: number;
  /** What production's `fetchRecordingUrl` returns: a signed object URL the
   *  browser opens in a new tab. Fake, but shaped like the real one. */
  signedUrl: string;
}

export function recordingMetaOf(r: Recording): RecordingMeta {
  const seed = `rec:${r.id}`;
  const sig = hashOf(seed + 'sig').toString(16).padStart(8, '0');
  return {
    durationSec: 120 + (hashOf(seed) % 1500),
    signedUrl: `https://recordings.openreplay.com/1/${r.id}.webm?X-Amz-Signature=${sig}${sig}&X-Amz-Expires=3600`,
  };
}
