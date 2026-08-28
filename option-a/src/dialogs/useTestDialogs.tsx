import { useCallback, useState } from 'react';
import { Modal } from 'antd';
import type { TestCase } from '@shared/tests-data.ts';
import type { TestsController } from '../state/useTests.ts';
import './dialogs.css';

/**
 * Every destructive question the tests list asks, behind one hook.
 *
 * Same rule as the issue dialogs: no callsite writes modal markup, so the row
 * menu and the toolbar cannot drift apart, and antd's static `Modal.confirm()`
 * stays banned - it mounts outside ConfigProvider and silently drops every
 * token.
 *
 * The grammar these three share is worth stating once, because getting it wrong
 * is what lost somebody's work in the production build: you DISMISS a
 * suggestion the agent made, and you DELETE work a person did. Never both on
 * one row, and never the same word for both.
 */
export function useTestDialogs(model: TestsController) {
  /** Deleting: a list of keys, plus the noun the title needs. */
  const [deleteKeys, setDeleteKeys] = useState<string[]>([]);
  const [dismissTarget, setDismissTarget] = useState<TestCase | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const openDelete = useCallback((keys: string[]) => setDeleteKeys(keys), []);
  const openDismiss = useCallback((tc: TestCase) => setDismissTarget(tc), []);
  const openMerge = useCallback(() => setMergeOpen(true), []);

  const targets = model.state.tests.filter((tc) => deleteKeys.includes(tc.key));
  const one = targets.length === 1 ? targets[0] : null;
  const noun = one ? (one.status === 'draft' ? 'draft' : 'test') : `${targets.length} tests`;
  /* Deleting a merge that is still being arranged puts the absorbed tests back
     rather than taking them with it, and that has to be said BEFORE the click:
     the tests being restored were separate tests a moment ago. */
  const restores = targets.some((tc) => tc.pendingMerge);

  const [base, ...rest] = model.selectedTests;

  return {
    openDelete,
    openDismiss,
    openMerge,
    elements: (
      <>
        {/* ── delete ────────────────────────────────────────────────────── */}
        <Modal
          title={one ? `Delete this ${noun}?` : `Delete ${noun}?`}
          open={deleteKeys.length > 0}
          onCancel={() => setDeleteKeys([])}
          okText="Delete"
          okButtonProps={{ danger: true }}
          onOk={() => {
            model.remove(deleteKeys);
            setDeleteKeys([]);
          }}
          width={440}
          destroyOnHidden
        >
          <p className="m-dlg__lede">
            {one ? (
              <>
                <span className="m-dlg__subject">{one.title}</span> will be deleted.
              </>
            ) : (
              <>These {targets.length} tests will be deleted.</>
            )}{' '}
            {restores && 'The tests absorbed by a pending merge come back to your list.'}
          </p>
        </Modal>

        {/* ── dismiss a suggestion ──────────────────────────────────────── */}
        <Modal
          title="Dismiss this suggestion?"
          open={dismissTarget != null}
          onCancel={() => setDismissTarget(null)}
          okText="Dismiss"
          okButtonProps={{ danger: true }}
          onOk={() => {
            if (dismissTarget) model.remove([dismissTarget.key]);
            setDismissTarget(null);
          }}
          width={440}
          destroyOnHidden
        >
          <p className="m-dlg__lede">
            <span className="m-dlg__subject">{dismissTarget?.title}</span> leaves your tests. The
            agent drafted it from real sessions, so it may propose the journey again if it keeps
            seeing it.
          </p>
        </Modal>

        {/* ── merge ─────────────────────────────────────────────────────────
            The base is named in the title rather than explained in the body,
            because which test survives is the entire decision being confirmed. */}
        <Modal
          title={base ? `Merge ${model.selectedTests.length} tests into “${base.title}”?` : 'Merge tests'}
          open={mergeOpen && rest.length > 0}
          onCancel={() => setMergeOpen(false)}
          okText="Merge"
          onOk={() => {
            model.merge();
            setMergeOpen(false);
          }}
          width={480}
          destroyOnHidden
        >
          <p className="m-dlg__lede">
            The steps combine into groups you arrange first, and nothing runs until you accept
            them. <span className="m-dlg__subject">{base?.title}</span> keeps its name, settings and
            run history; the rest fold into it and can be restored by cancelling the merge.
          </p>
        </Modal>
      </>
    ),
  };
}
