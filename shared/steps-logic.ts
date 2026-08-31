/* ═══════════════════════════════════════════════════════════════════════════
   STEPS, AS ARITHMETIC.

   Everything the drawers ask about a list of steps - what a proposed revision
   would leave behind, which rows are on their way out, what a step used to say,
   what a merge flattens to - is answered here, so the review rows, the saved
   result and the per-step history cannot disagree about the same edit.

   Ported from the production Kai drawers (`shared/revisions.ts`), which is
   where the model was worked out. The shapes are unchanged on purpose: this is
   the one part of that feature nobody has complained about.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { MergeGroup, StepChange, TestCase, TestVersion } from './tests-data.ts';

export const testVersion = (tc: TestCase): number => tc.version ?? 1;

/** Accepted or rejected. Absent means UNDECIDED, which is not the same as
 *  rejected: an undecided proposal still applies on save, because the agent's
 *  suggestion stands unless somebody says no to it. */
export type StepDecision = 'accepted' | 'rejected';

/**
 * One row of the steps list.
 *
 * A review is not a separate screen: it is the ordinary editable list with the
 * proposal's rows dressed as a diff. So a row is a plain step, or a proposed
 * addition, or a proposed removal, or - during a merge - the label of the test a
 * block of steps came from.
 */
export interface StepItem {
  text: string;
  kind?: 'added' | 'removed' | 'group';
  decision?: StepDecision;
}

/** The current steps and the proposal, woven into one list in reading order. */
export function buildReviewItems(steps: readonly string[], changes: readonly StepChange[]): StepItem[] {
  const removed = new Set(changes.filter((c) => c.type === 'removed').map((c) => c.index));
  const added = new Map<number, string[]>();
  for (const c of changes) {
    if (c.type === 'added') added.set(c.afterIndex, [...(added.get(c.afterIndex) ?? []), c.text]);
  }

  const out: StepItem[] = [];
  for (const text of added.get(-1) ?? []) out.push({ text, kind: 'added' });
  steps.forEach((text, i) => {
    out.push(removed.has(i) ? { text, kind: 'removed' } : { text });
    for (const t of added.get(i) ?? []) out.push({ text: t, kind: 'added' });
  });
  return out;
}

/** The steps the new version would have. Plain rows stay; an addition counts
 *  unless it was rejected; a removal drops unless it was rejected. */
export function resolveItems(items: readonly StepItem[]): string[] {
  return items
    .filter((it) =>
      it.kind === 'added'
        ? it.decision !== 'rejected'
        : it.kind === 'removed'
          ? it.decision === 'rejected'
          : it.kind !== 'group',
    )
    .map((it) => it.text)
    .filter((s) => s.trim() !== '');
}

/** A row on its way out of the test: a removal that stands, or an addition that
 *  was turned down. Drawn struck through, not editable, and not numbered - it is
 *  not going to be a step. */
export const isStruck = (it: StepItem): boolean =>
  (it.kind === 'removed' && it.decision !== 'rejected') ||
  (it.kind === 'added' && it.decision === 'rejected');

/** How the review reads in one line: what it would do if you saved it now. */
export function reviewSummary(items: readonly StepItem[]): { added: number; removed: number } {
  return {
    added: items.filter((it) => it.kind === 'added' && it.decision !== 'rejected').length,
    removed: items.filter((it) => it.kind === 'removed' && it.decision !== 'rejected').length,
  };
}

/** Commit a reviewed revision. The old steps are snapshotted, the version moves
 *  to the one the agent proposed, and the status is left alone: an active test
 *  simply resumes its schedule. */
export function applyRevision(tc: TestCase, resolved: string[], savedAt: number): TestCase {
  const snapshot: TestVersion = { version: testVersion(tc), savedAt, steps: [...tc.steps] };
  return {
    ...tc,
    steps: resolved,
    version: tc.pendingRevision?.toVersion ?? testVersion(tc) + 1,
    history: [...(tc.history ?? []), snapshot],
    pendingRevision: undefined,
  };
}

/** Turn the proposal down and stay where you are. */
export const keepCurrentVersion = (tc: TestCase): TestCase => ({ ...tc, pendingRevision: undefined });

/** Save an ordinary edit to the steps. A hand edit bumps the version too - the
 *  history is a record of what this test used to run, and it does not care
 *  whether a person or the agent wrote the change. */
export function saveSteps(tc: TestCase, steps: string[], savedAt: number): TestCase {
  const same = steps.length === tc.steps.length && steps.every((s, i) => s === tc.steps[i]);
  if (same) return tc;
  const snapshot: TestVersion = { version: testVersion(tc), savedAt, steps: [...tc.steps] };
  return { ...tc, steps, version: testVersion(tc) + 1, history: [...(tc.history ?? []), snapshot] };
}

/** What this step said in earlier versions, newest first, and only where it
 *  differs from what it says now. Position-based, which is a guess - a step that
 *  moved reads as a step that changed - and the honest scope for it is a hover
 *  popover, not a diff view. */
export function stepHistory(tc: TestCase | null, stepIdx: number): { version: number; text: string }[] {
  if (!tc) return [];
  const current = tc.steps[stepIdx];
  const out: { version: number; text: string }[] = [];
  for (const h of [...(tc.history ?? [])].sort((a, b) => b.version - a.version)) {
    const text = h.steps[stepIdx];
    if (text != null && text !== current && !out.some((o) => o.text === text)) out.push({ version: h.version, text });
  }
  return out;
}

/* ── merges ──────────────────────────────────────────────────────────────── */

/** A merge as review rows: every group's label followed by its steps. The label
 *  is a row of its own so dragging it can move the whole block. */
export function buildMergeItems(groups: readonly MergeGroup[]): StepItem[] {
  return groups.flatMap((g) => [
    { text: g.title, kind: 'group' as const },
    ...g.steps.map((text) => ({ text })),
  ]);
}

/** What a merge flattens to: the steps in the order they were arranged, labels
 *  dropped. The labels were scaffolding for the decision, not content. */
export const flattenMerge = (items: readonly StepItem[]): string[] =>
  items.filter((it) => it.kind !== 'group').map((it) => it.text).filter((s) => s.trim() !== '');
