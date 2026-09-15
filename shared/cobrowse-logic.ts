/* ═══════════════════════════════════════════════════════════════════════════
   COBROWSE, ON THE SESSIONS TABLE (2026-09-15).

   Mehdi, reviewing the 09-14 build: the live list "is not consistent with
   what we've done in sessions - in sessions we have headers you can sort",
   and when told production's own live list differs: "No, no, no. Don't.
   That's the whole point - consistency." Production in fact draws its live
   rows with the sessions list's own `SessionItem`, so ONE table is not a
   redesign, it is the arrangement the product already has.

   So a live session is expressed AS a `SessionRow` and drawn by the same
   `SessionTable` the Recordings page uses. This file is the adapter, plus the
   two things the live list has that sessions do not: a catalogue narrowed to
   the filters production's live search accepts, and a sort that maps a
   column header onto the live list's two orders.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { LiveSession } from './cobrowse-data.ts';
import { liveMetaOf } from './media-logic.ts';
import {
  catalogueNow,
  matchProperty,
  splitFilters,
  type CatalogueEntry,
  type ColumnSort,
  type SearchFilter,
  type SessionRow,
  type SortColumn,
} from './sessions-logic.ts';

/* The fixture names countries; the row prints a code. Two letters, the way
   the sessions table already does it, so "PT Lisbon" and "FR Lyon" line up. */
const COUNTRY_CODES: Record<string, string> = {
  Portugal: 'PT',
  Spain: 'ES',
  Canada: 'CA',
  UAE: 'AE',
  Germany: 'DE',
  France: 'FR',
  Brazil: 'BR',
  Sweden: 'SE',
  'United States': 'US',
  'United Kingdom': 'GB',
};

const codeOf = (country: string): string => COUNTRY_CODES[country] ?? country.slice(0, 2).toUpperCase();

/** "Chrome 128" is the meta line's word; the column filters on "Chrome". */
const family = (s: string): string => s.split(' ')[0] ?? s;

const deviceOf = (viewport: string): SessionRow['deviceType'] => {
  const w = Number.parseInt(viewport, 10);
  if (Number.isNaN(w)) return 'desktop';
  return w < 600 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop';
};

/**
 * A live session as one row of the sessions table.
 *
 * Nothing here is invented per render: the browser, OS and viewport come off
 * `liveMetaOf`, which the live view's header already prints, so the row and
 * the screen it opens agree. What a live session has no notion of - events
 * so far, errors, pages, having been watched - is zero or false, and the
 * table hides those columns rather than printing a column of zeros.
 */
export function liveSessionRowOf(s: LiveSession, now: number = Date.now()): SessionRow {
  const meta = liveMetaOf(s);
  return {
    sessionId: s.id,
    userId: s.userId,
    userAnonymousId: s.userAnonymousId,
    numericHash: 0,
    startedAgoMin: Math.max(0, Math.round((now - s.startedAt) / 60000)),
    /* Live: how long they have been on. Ticks - see SessionTable's `live`. */
    durationSec: Math.max(0, Math.round((now - s.startedAt) / 1000)),
    eventsCount: 0,
    errorsCount: 0,
    pagesCount: 0,
    viewed: false,
    favorite: false,
    browser: family(meta.browser),
    os: family(meta.os),
    deviceType: deviceOf(meta.viewport),
    country: s.country,
    countryCode: codeOf(s.country),
    city: s.city,
    metadata: { plan: meta.plan },
    issueTypes: [],
    live: true,
    plan: meta.plan,
  };
}

/* ── THE LIVE CATALOGUE ─────────────────────────────────────────────────────
   Production's `LiveSessionSearch` accepts exactly these property keys plus
   any `metadata*` field: user, geography, technology, platform, UTM. No
   events - a live session has not finished happening - and none of the
   session-level counts, which is why the picker here is properties only. */
const LIVE_FILTER_IDS: ReadonlySet<string> = new Set([
  'userId',
  'userAnonymousId',
  'userCountry',
  'userCity',
  'userState',
  'userBrowser',
  'userOs',
  'userDeviceType',
  'platform',
]);

export const liveCatalogue = (): readonly CatalogueEntry[] =>
  catalogueNow().filter((e) => !e.isEvent && (LIVE_FILTER_IDS.has(e.id) || e.id.startsWith('meta.')));

/* ── THE SORT, FROM A COLUMN HEADER ─────────────────────────────────────────
   Production's live list sorts by Start time or Duration, either way. Here
   those are the two sortable headers, and the order is read off the FIGURE
   the column prints: "3m ago" descending is oldest first, "13m 30s" ascending
   is shortest first. A header that sorted the timestamp instead would show a
   ↑ over a column whose numbers went down.

   `null` is the default - newest first, as the list arrives - and no header
   claims it; every header's cycle ends there. */
export const LIVE_SORTABLE: readonly SortColumn[] = ['started', 'duration'];

export function sortLiveRows(rows: readonly SessionRow[], sort: ColumnSort | null): SessionRow[] {
  const out = [...rows];
  if (!sort) return out.sort((a, b) => a.startedAgoMin - b.startedAgoMin);
  const sign = sort.order === 'ascend' ? 1 : -1;
  out.sort((a, b) =>
    sort.column === 'started' ? sign * (a.startedAgoMin - b.startedAgoMin) : sign * (a.durationSec - b.durationSec),
  );
  return out;
}

/** The live list, narrowed by its group filters. Events cannot apply and are
 *  ignored if a caller manages to add one. */
export function filterLiveRows(rows: readonly SessionRow[], filters: readonly SearchFilter[]): SessionRow[] {
  const { properties } = splitFilters(filters);
  return rows.filter((r) => properties.every((f) => matchProperty(r, f)));
}
