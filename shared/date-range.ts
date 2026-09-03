/* ═══════════════════════════════════════════════════════════════════════════
   THE DATE WINDOW, for every list in the app.

   Four lists ask the same question - sessions, issues, runs and audits are all
   "things that happened, most recent first" - and until 2026-09-02 only one of
   them could answer it. Worse, the one that could offered a "Custom range"
   that silently applied ninety days, which is a control that lies rather than
   one that is missing.

   ── WHAT IS SHARED AND WHAT IS NOT ────────────────────────────────────────
   Shared: the presets, the custom pair, the arithmetic that turns either into
   two absolute bounds, and the label. NOT shared: WHICH field a page tests.
   That is a per-page decision and a meaningful one - a session's window is
   when it started, an issue's is when it was last seen, a run's is when it
   ran, an audit's is when it was created - so each page passes its own
   timestamp in and nothing here has to know about four different row shapes.

   ── WHY BOUNDS AND NOT MINUTES ────────────────────────────────────────────
   The first version of this was `rangeMinutes()`, a number of minutes back
   from now, which cannot express "the 3rd to the 18th" at all. Every preset
   can be written as a pair of bounds; a custom range cannot be written as a
   duration. So the pair is the model and the presets are the special case.

   `now` is a parameter with a default rather than a read of the clock, so a
   check can assert the arithmetic without racing it.
   ═══════════════════════════════════════════════════════════════════════════ */

export type RangePreset = '24h' | '7d' | '30d' | '90d' | 'custom';

export interface DateRangeValue {
  preset: RangePreset;
  /** Epoch ms of the first day, when `preset` is 'custom'. Inclusive. */
  from?: number;
  /** Epoch ms of the last day, when `preset` is 'custom'. Inclusive - the
   *  bound is pushed to the end of that day by `rangeBounds`, because a person
   *  picking "the 18th" means all of the 18th and not midnight starting it. */
  to?: number;
}

export const RANGE_PRESETS: ReadonlyArray<{
  value: Exclude<RangePreset, 'custom'>;
  label: string;
  minutes: number;
}> = [
  { value: '24h', label: 'Past 24 hours', minutes: 24 * 60 },
  { value: '7d', label: 'Past 7 days', minutes: 7 * 24 * 60 },
  { value: '30d', label: 'Past 30 days', minutes: 30 * 24 * 60 },
  { value: '90d', label: 'Past 90 days', minutes: 90 * 24 * 60 },
];

/** Thirty days on every list, so moving between them does not move the window
 *  under the reader. */
export const DEFAULT_RANGE: DateRangeValue = { preset: '30d' };

const MS_PER_MIN = 60_000;
const DAY_MS = 24 * 60 * MS_PER_MIN;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const endOfDay = (ms: number) => startOfDay(ms) + DAY_MS - 1;

/**
 * The window as two absolute bounds, whichever kind of range it is.
 *
 * A custom range with only one end picked is treated as open at the other end
 * rather than as nothing: half a range is an answer in progress, and filtering
 * everything away while somebody is still picking is the worst moment to
 * empty a list.
 *
 * ⚠ THE ONE-ENDED CASE IS NOT REACHABLE FROM THE CURRENT CONTROL, and that is
 * worth knowing before anybody "simplifies" it away. antd's `RangePicker` only
 * fires `onChange` once BOTH ends exist, so `DateRange` can never hand this a
 * half range today. It is kept because the arithmetic is three lines, the
 * labels for it already exist ("Jul 3 onwards", "Up to Jul 18"), and the first
 * control that offers a single bound - a "since I last looked" shortcut, a
 * shared link carrying one date - gets it for free instead of forcing the
 * model open again.
 */
export function rangeBounds(v: DateRangeValue, now: number = Date.now()): { from: number; to: number } {
  if (v.preset === 'custom') {
    return {
      from: v.from != null ? startOfDay(v.from) : Number.NEGATIVE_INFINITY,
      to: v.to != null ? endOfDay(v.to) : now,
    };
  }
  const minutes = RANGE_PRESETS.find((p) => p.value === v.preset)?.minutes ?? 30 * 24 * 60;
  return { from: now - minutes * MS_PER_MIN, to: now };
}

/** A custom range needs both ends before it means anything. Until then the
 *  control is showing an intention, not a filter, and every list keeps its
 *  previous window - see `withinRange`. */
export const isCustomComplete = (v: DateRangeValue): boolean =>
  v.preset === 'custom' && v.from != null && v.to != null;

export function withinRange(ts: number, v: DateRangeValue, now: number = Date.now()): boolean {
  if (v.preset === 'custom' && !isCustomComplete(v)) return true;
  const { from, to } = rangeBounds(v, now);
  return ts >= from && ts <= to;
}

/** The same test for the rows that carry "minutes ago" rather than a
 *  timestamp. Two list fixtures model time each way and neither is wrong; what
 *  would be wrong is two copies of the comparison. */
export const minutesAgoWithin = (minAgo: number, v: DateRangeValue, now: number = Date.now()): boolean =>
  withinRange(now - minAgo * MS_PER_MIN, v, now);

const dayLabel = (ms: number, withYear: boolean) =>
  new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });

/**
 * What the closed control says. A preset says its own name; a custom range says
 * its dates, because "Custom range" on a closed control is the one label that
 * tells you nothing you did not already know.
 */
export function rangeLabel(v: DateRangeValue, now: number = Date.now()): string {
  if (v.preset !== 'custom') {
    return RANGE_PRESETS.find((p) => p.value === v.preset)?.label ?? 'Past 30 days';
  }
  if (v.from == null && v.to == null) return 'Custom range';
  const thisYear = new Date(now).getFullYear();
  const spansAnotherYear = [v.from, v.to].some(
    (ms) => ms != null && new Date(ms).getFullYear() !== thisYear,
  );
  if (v.from != null && v.to == null) return `${dayLabel(v.from, spansAnotherYear)} onwards`;
  if (v.from == null && v.to != null) return `Up to ${dayLabel(v.to, spansAnotherYear)}`;
  return `${dayLabel(v.from!, spansAnotherYear)} – ${dayLabel(v.to!, spansAnotherYear)}`;
}

/** Whether the control is holding anything other than the default, which is
 *  what decides if its trigger reads as active. */
export const rangeIsDefault = (v: DateRangeValue): boolean => v.preset === DEFAULT_RANGE.preset;
