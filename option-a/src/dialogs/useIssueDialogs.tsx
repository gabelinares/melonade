import { useCallback, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { HIDE_REASONS, type Issue } from '@shared/issues-data.ts';
import type { IssuesController } from '../state/useIssues.ts';
import { Chip } from '../components/Chip.tsx';
import './dialogs.css';

/**
 * All three issue dialogs behind one hook.
 *
 * The rule this enforces: no callsite writes modal markup. The list, the row
 * menu and (later) the detail page all call the same openers, so the corner
 * radius, the footer order and the copy cannot drift between them, which is
 * exactly how the current app ended up with dialogs that disagree.
 *
 * antd's static `Modal.confirm()` is banned in this codebase. Statics mount
 * outside ConfigProvider and silently drop every design token: radius, font,
 * colour. These are real <Modal> elements rendered inside the provider tree.
 */
export function useIssueDialogs(model: IssuesController) {
  const [hideTarget, setHideTarget] = useState<Issue | null>(null);
  const [hideReasons, setHideReasons] = useState<string[]>([]);
  const [hideNote, setHideNote] = useState('');

  const [renameTarget, setRenameTarget] = useState<Issue | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [critTarget, setCritTarget] = useState<Issue | null>(null);
  const [newRule, setNewRule] = useState('');

  const openHide = useCallback((issue: Issue) => {
    setHideTarget(issue);
    setHideReasons([]);
    setHideNote('');
  }, []);

  const openRename = useCallback(
    (issue: Issue) => {
      setRenameTarget(issue);
      setRenameValue(model.titleOf(issue));
    },
    [model],
  );

  const openCritical = useCallback((issue: Issue) => {
    setCritTarget(issue);
    setNewRule('');
  }, []);

  const commitRename = () => {
    const v = renameValue.trim();
    if (renameTarget && v) model.rename(renameTarget.id, v);
    setRenameTarget(null);
  };

  const critState = critTarget ? model.criticalState(critTarget.id) : 'none';
  const matched = critTarget ? model.matchedRules(critTarget.id) : [];
  /* The matched descriptions are already spelled out above, so the canonical
     list shows only the rest. Printing the same sentence twice in one dialog
     reads as a bug, not as emphasis. */
  const matchedIds = new Set(matched.map((r) => r.id));
  const others = model.rules.filter((r) => !matchedIds.has(r.id));

  const elements = (
    <>
      {/* ── hide ───────────────────────────────────────────────────────────
          Asks why, because the answer trains the agent. Hiding is reversible
          from the row menu, so the reason is genuinely optional and the copy
          says so rather than implying a required field. */}
      <Modal
        title="Hide this issue?"
        open={hideTarget != null}
        onCancel={() => setHideTarget(null)}
        okText="Hide issue"
        onOk={() => {
          if (hideTarget) model.hide(hideTarget.id, hideNote.trim(), hideReasons);
          setHideTarget(null);
        }}
        width={440}
        destroyOnHidden
      >
        <p className="m-dlg__lede">
          <span className="m-dlg__subject">{hideTarget ? model.titleOf(hideTarget) : ''}</span>{' '}
          leaves the list. Telling the agent why is what stops it finding this again.
        </p>
        <div className="m-dlg__chips">
          {HIDE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`m-dlg__reason${hideReasons.includes(r) ? ' is-on' : ''}`}
              aria-pressed={hideReasons.includes(r)}
              onClick={() =>
                setHideReasons((prev) =>
                  prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
                )
              }
            >
              {r}
            </button>
          ))}
        </div>
        <Input.TextArea
          rows={3}
          value={hideNote}
          onChange={(e) => setHideNote(e.target.value)}
          placeholder="Anything else worth knowing (optional)"
          maxLength={280}
        />
      </Modal>

      {/* ── rename ─────────────────────────────────────────────────────── */}
      <Modal
        title="Rename issue"
        open={renameTarget != null}
        onCancel={() => setRenameTarget(null)}
        okText="Save"
        onOk={commitRename}
        width={440}
        destroyOnHidden
      >
        <p className="m-dlg__lede">
          The agent wrote this title. Yours replaces it everywhere, for everyone.
        </p>
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={commitRename}
          maxLength={120}
          aria-label="Issue title"
        />
      </Modal>

      {/* ── critical ──────────────────────────────────────────────────────
          The intermediary. Nothing here jumps to a settings page: the question
          "why is this critical?" is answered in place, and the descriptions
          that answer it are editable in place too. */}
      <Modal
        title="What counts as critical"
        open={critTarget != null}
        onCancel={() => setCritTarget(null)}
        width={520}
        destroyOnHidden
        footer={
          <div className="m-dlg__foot">
            {critState === 'mine' && critTarget && (
              <Button
                onClick={() => {
                  model.dropCritical(critTarget.id);
                  setCritTarget(null);
                }}
              >
                Not critical for me
              </Button>
            )}
            {critState === 'dismissed' && critTarget && (
              <Button
                onClick={() => {
                  model.restoreCritical(critTarget.id);
                  setCritTarget(null);
                }}
              >
                Show as critical again
              </Button>
            )}
            <Button type="primary" onClick={() => setCritTarget(null)}>
              Done
            </Button>
          </div>
        }
      >
        <p className="m-dlg__lede">
          <span className="m-dlg__subject">{critTarget ? model.titleOf(critTarget) : ''}</span>
        </p>

        {matched.length > 0 ? (
          <div className="m-dlg__matched">
            <p className="m-dlg__section">
              {matched.length === 1 ? 'It matches this description' : 'It matches these descriptions'}
            </p>
            {matched.map((r) => (
              <div className="m-dlg__rule is-matched" key={r.id}>
                <AlertTriangle size={13} className="m-dlg__rule-icon" aria-hidden="true" />
                <span className="m-dlg__rule-text">{r.description}</span>
                <Chip tone={r.mine ? 'danger' : 'neutral'}>{r.mine ? 'Yours' : r.createdBy}</Chip>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-dlg__none">
            No description matches this issue yet, so nobody is being alerted about it. Write one
            below and the agent will flag anything like it from now on.
          </p>
        )}

        <p className="m-dlg__section">
          {matched.length > 0 ? 'Other descriptions on this project' : 'Every description on this project'}
          <span className="m-dlg__count">{others.length}</span>
        </p>
        <div className="m-dlg__rules">
          {others.map((r) => (
            <div className="m-dlg__rule" key={r.id}>
              <span className="m-dlg__rule-text">{r.description}</span>
              <Chip tone="neutral">{r.mine ? 'Yours' : r.createdBy}</Chip>
              {r.mine && (
                <Button
                  type="text"
                  size="small"
                  aria-label="Delete this description"
                  icon={<Trash2 size={13} />}
                  onClick={() => model.removeRule(r.id)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="m-dlg__add">
          <Input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder="Anything that stops someone paying, in your own words"
            maxLength={200}
            onPressEnter={() => {
              if (newRule.trim()) {
                model.addRule(newRule.trim());
                setNewRule('');
              }
            }}
          />
          <Button
            icon={<Plus size={13} />}
            disabled={!newRule.trim()}
            onClick={() => {
              model.addRule(newRule.trim());
              setNewRule('');
            }}
          >
            Add
          </Button>
        </div>
      </Modal>
    </>
  );

  return { openHide, openRename, openCritical, elements };
}
