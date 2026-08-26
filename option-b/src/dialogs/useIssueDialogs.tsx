import { useCallback, useState } from 'react';
import { Button, Modal, TextInput, Textarea } from '@mantine/core';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { HIDE_REASONS, type Issue } from '@shared/issues-data.ts';
import { Chip } from '../components/Chip.tsx';
import { JiraIcon } from '../components/JiraIcon.tsx';
import type { IssuesController } from '../state/useIssues.ts';
import './dialogs.css';

/**
 * All three dialogs behind one hook.
 *
 * The rule it enforces: no callsite writes modal markup. The list row, the
 * detail header and the command palette all call the same openers, so the
 * radius, the footer order and the copy cannot drift between them.
 *
 * Openers take an ID rather than an Issue, because the callers that need them
 * (a keyboard shortcut, a palette action) have an id and not an object.
 */
export function useIssueDialogs(model: IssuesController) {
  const [hideTarget, setHideTarget] = useState<Issue | null>(null);
  const [hideReasons, setHideReasons] = useState<string[]>([]);
  const [hideNote, setHideNote] = useState('');

  const [renameTarget, setRenameTarget] = useState<Issue | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [critTarget, setCritTarget] = useState<Issue | null>(null);
  const [newRule, setNewRule] = useState('');

  const [taskTarget, setTaskTarget] = useState<Issue | null>(null);
  const [taskSummary, setTaskSummary] = useState('');
  const [taskBody, setTaskBody] = useState('');

  const find = useCallback(
    (id: number) => model.filtered.find((i) => i.id === id) ?? null,
    [model],
  );

  const openHide = useCallback(
    (id: number) => {
      setHideTarget(find(id));
      setHideReasons([]);
      setHideNote('');
    },
    [find],
  );

  const openRename = useCallback(
    (id: number) => {
      const issue = find(id);
      setRenameTarget(issue);
      setRenameValue(issue ? model.titleOf(issue) : '');
    },
    [find, model],
  );

  const openCritical = useCallback(
    (id: number) => {
      setCritTarget(find(id));
      setNewRule('');
    },
    [find],
  );

  /* Prefilled from the write-up, and that is the point of the whole button: the
     agent already wrote a title and a fix, so the person filing the ticket
     should be editing a draft rather than retyping a paragraph they just read.
     Both fields stay editable, because the agent's words are a starting point
     and a ticket is written for a team that has its own conventions. */
  const openTask = useCallback(
    (id: number) => {
      const issue = find(id);
      setTaskTarget(issue);
      setTaskSummary(issue ? model.titleOf(issue) : '');
      setTaskBody(
        issue
          ? `${issue.real}\n\nSuggested fix\n${issue.fix}\n\nWhat the person did\n${issue.journey}`
          : '',
      );
    },
    [find, model],
  );

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
      {/* ── hide ── */}
      <Modal
        opened={hideTarget != null}
        onClose={() => setHideTarget(null)}
        title="Hide this issue?"
        size={480}
      >
        <p className="b-dlg__lede">
          <span className="b-dlg__subject">{hideTarget ? model.titleOf(hideTarget) : ''}</span>{' '}
          leaves the queue. Telling the agent why is what stops it finding this again.
        </p>
        <div className="b-dlg__chips">
          {HIDE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`b-dlg__reason${hideReasons.includes(r) ? ' is-on' : ''}`}
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
        <Textarea
          rows={3}
          value={hideNote}
          onChange={(e) => setHideNote(e.currentTarget.value)}
          placeholder="Anything else worth knowing (optional)"
          maxLength={280}
        />
        <div className="b-dlg__foot">
          <Button variant="default" onClick={() => setHideTarget(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (hideTarget) model.hide(hideTarget.id, hideNote.trim(), hideReasons);
              setHideTarget(null);
            }}
          >
            Hide issue
          </Button>
        </div>
      </Modal>

      {/* ── rename ── */}
      <Modal
        opened={renameTarget != null}
        onClose={() => setRenameTarget(null)}
        title="Rename issue"
        size={480}
      >
        <p className="b-dlg__lede">
          The agent wrote this title. Yours replaces it everywhere, for everyone.
        </p>
        <TextInput
          data-autofocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
          }}
          maxLength={120}
          aria-label="Issue title"
        />
        <div className="b-dlg__foot">
          <Button variant="default" onClick={() => setRenameTarget(null)}>
            Cancel
          </Button>
          <Button onClick={commitRename}>Save</Button>
        </div>
      </Modal>

      {/* ── critical: the intermediary. Nothing here jumps to a settings page:
             "why is this critical" is answered in place, and the descriptions
             that answer it are editable in place too. ── */}
      <Modal
        opened={critTarget != null}
        onClose={() => setCritTarget(null)}
        title="What counts as critical"
        size={560}
      >
        <p className="b-dlg__lede">
          <span className="b-dlg__subject">{critTarget ? model.titleOf(critTarget) : ''}</span>
        </p>

        {matched.length > 0 ? (
          <>
            <p className="m-label b-dlg__section">
              {matched.length === 1 ? 'It matches this description' : 'It matches these descriptions'}
            </p>
            {matched.map((r) => (
              <div className="b-dlg__rule is-matched" key={r.id}>
                <AlertTriangle size={14} className="b-dlg__rule-icon" aria-hidden="true" />
                <span className="b-dlg__rule-text">{r.description}</span>
                <Chip tone={r.mine ? 'danger' : 'neutral'}>{r.mine ? 'Yours' : r.createdBy}</Chip>
              </div>
            ))}
          </>
        ) : (
          <p className="b-dlg__none">
            No description matches this issue yet, so nobody is being alerted about it. Write one
            below and the agent will flag anything like it from now on.
          </p>
        )}

        <p className="m-label b-dlg__section">
          {matched.length > 0 ? 'Other descriptions on this project' : 'Every description on this project'}
          <span className="m-label__count">{others.length}</span>
        </p>
        <div className="b-dlg__rules">
          {others.map((r) => (
            <div className="b-dlg__rule" key={r.id}>
              <span className="b-dlg__rule-text">{r.description}</span>
              <Chip>{r.mine ? 'Yours' : r.createdBy}</Chip>
              {r.mine && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-xs"
                  aria-label="Delete this description"
                  onClick={() => model.removeRule(r.id)}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="b-dlg__add">
          <TextInput
            style={{ flex: 1 }}
            value={newRule}
            onChange={(e) => setNewRule(e.currentTarget.value)}
            placeholder="Anything that stops someone paying, in your own words"
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRule.trim()) {
                model.addRule(newRule.trim());
                setNewRule('');
              }
            }}
          />
          <Button
            variant="default"
            leftSection={<Plus size={13} />}
            disabled={!newRule.trim()}
            onClick={() => {
              model.addRule(newRule.trim());
              setNewRule('');
            }}
          >
            Add
          </Button>
        </div>

        <div className="b-dlg__foot">
          {critState === 'mine' && critTarget && (
            <Button
              variant="default"
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
              variant="default"
              onClick={() => {
                model.restoreCritical(critTarget.id);
                setCritTarget(null);
              }}
            >
              Show as critical again
            </Button>
          )}
          <Button onClick={() => setCritTarget(null)}>Done</Button>
        </div>
      </Modal>

      {/* ── create a Jira task ──
          A draft, not a form. Everything in it came out of the write-up the
          person was just reading, so the work is reviewing it rather than
          composing it - which is the only reason a button like this belongs on
          a triage screen at all. */}
      <Modal
        opened={taskTarget != null}
        onClose={() => setTaskTarget(null)}
        title="Create Jira task"
        size={560}
      >
        <p className="b-dlg__lede">
          Prefilled from the agent's write-up. Edit anything before it goes over.
        </p>

        <div className="b-dlg__meta">
          <span className="b-dlg__meta-item">
            <JiraIcon size={13} />
            ACME board
          </span>
          <span className="b-dlg__meta-item">Bug</span>
          <span className="b-dlg__meta-item">Unassigned</span>
        </div>

        <TextInput
          label="Summary"
          value={taskSummary}
          onChange={(e) => setTaskSummary(e.currentTarget.value)}
          maxLength={140}
        />
        <Textarea
          label="Description"
          rows={7}
          value={taskBody}
          onChange={(e) => setTaskBody(e.currentTarget.value)}
        />

        <div className="b-dlg__foot">
          <Button variant="default" onClick={() => setTaskTarget(null)}>
            Cancel
          </Button>
          <Button
            leftSection={<JiraIcon size={14} />}
            disabled={!taskSummary.trim()}
            onClick={() => {
              if (taskTarget) model.createTask(taskTarget.id);
              setTaskTarget(null);
            }}
          >
            Create task
          </Button>
        </div>
      </Modal>
    </>
  );

  return { openHide, openRename, openCritical, openTask, elements };
}
