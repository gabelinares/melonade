/* ═══════════════════════════════════════════════════════════════════════════
   Prototype flags. Shared, so that when both options are showing the same
   screen they are always showing the same VERSION of it: the brief is a
   comparison, and a flag flipped in one app and forgotten in the other turns
   the comparison into a confound.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The issue write-up is held back as work in progress in OPTION A.
 *
 * Set 2026-08-21, on Gabriel's call. The detail as built was being reworked, so
 * showing it would collect review on a screen already known to be changing -
 * and a reviewer shown a half-finished screen reviews the half-finished screen
 * instead of the thing being asked about.
 *
 * It does NOT delete anything. `IssueDetailPanel` is intact and keeps its
 * story, so the design is one click away for us and simply not on the page.
 * Flip this to false to bring it back.
 *
 * ── why this no longer says "both options" ─────────────────────────────────
 * It was shared, and the reasoning was sound while it applied to both: this
 * deliverable is a comparison, and a flag flipped in one option and forgotten
 * in the other turns the comparison into a confound.
 *
 * Option B stopped reading it on 2026-08-24, and that is not the flag being
 * forgotten - it is the flag being answered. B's detail was not restored, it
 * was REPLACED: the write-up is now one collapsing row of a three-row flow that
 * runs list, write-up, replay. There is no held-back screen left in B to gate.
 * See WorkPane.tsx for the flow and DESIGN.md section 9 for the whole argument.
 *
 * A is still on the old expanding-row detail, so it still needs this.
 */
export const DETAIL_IS_WIP = true;
