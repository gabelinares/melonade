import { useEffect, useMemo, useState } from 'react';
import { App, Button, Dropdown, Tooltip } from 'antd';
import { Check, ChevronDown, MoveRight, Pause, Play, ShieldAlert, Trash2, X } from 'lucide-react';
import { minutesSince, scheduleSentence, stepCount, type Schedule, type TestCase } from '@shared/tests-data.ts';
import { lastSeenLabel } from '@shared/issues-data.ts';
import {
  buildMergeItems,
  buildReviewItems,
  flattenMerge,
  isStruck,
  resolveItems,
  reviewSummary,
  stepHistory,
  testVersion,
  type StepItem,
} from '@shared/steps-logic.ts';
import { hasNoEnvironment } from '@shared/tests-logic.ts';
import type { TestsController } from '../state/useTests.ts';
import { DrawerFooter, EntityDrawer, Section } from '../components/EntityDrawer.tsx';
import { Chip } from '../components/Chip.tsx';
import { RunSettings, type RunSettingsValue } from './RunSettings.tsx';
import { StepList } from './StepList.tsx';
import { TagEditor } from './TagEditor.tsx';
import './test-drawer.css';

/** Which of the four things this drawer is doing. Not a prop: it is derived
 *  from the test, because a test with a pending merge IS a merge review and a
 *  drawer that had to be told so could be told wrong. */
type Mode = 'draft' | 'edit' | 'revision' | 'merge' | 'history';

export interface TestDrawerProps {
  model: TestsController;
  /** Creating rather than opening: the title starts empty and editing, and the
   *  footer commits instead of saving. */
  creating?: boolean;
  onCreated?: () => void;
  /** Jump to this test's runs. */
  onViewRuns?: (tc: TestCase) => void;
  /** The reject grammar's two words. A suggestion is DISMISSED and your own
   *  work is DELETED, and the drawer must offer exactly one of them - the
   *  production build offered both and somebody's test went with the draft. */
  onDismiss?: (tc: TestCase) => void;
  onDelete?: (tc: TestCase) => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE TEST, OPEN.
 *
 * Ported from the production drawer, which is where the lifecycle was worked
 * out, and it keeps that lifecycle exactly: a draft is approved into a test,
 * attaching a schedule makes it active, an active test can be paused, and when
 * the journey changes in real sessions the agent proposes a new VERSION of the
 * steps which waits here for a review.
 *
 * Three things about it that are decisions rather than layout:
 *
 * 1. EDITS BUFFER, AND SAVE COMMITS. Typing in a step, renaming, changing the
 *    schedule - none of it reaches the list behind the drawer until Save.
 *    Closing without saving changes nothing, which is what makes it safe to
 *    open a test just to read it. The only immediate control is Pause/Resume,
 *    which is a state change rather than an edit.
 * 2. THE FOOTER SAYS WHAT THIS PARTICULAR DRAWER COMMITS. "Create test",
 *    "Combine 9 steps", "Save v3", "Save". Four modes, four sentences, and the
 *    destructive action is on the left in all of them so it is never where the
 *    primary was a moment ago.
 * 3. A REVIEW IS THE ORDINARY LIST. The proposal's rows are tinted and carry a
 *    decision pair; everything else still edits, drags and deletes. You are not
 *    made to accept a wording you can see is wrong just because the agent
 *    wrote it.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function TestDrawer({ model, creating, onCreated, onViewRuns, onDismiss, onDelete }: TestDrawerProps) {
  const { message } = App.useApp();
  const test = model.open;

  const mode: Mode = test?.pendingMerge
    ? 'merge'
    : test?.pendingRevision
      ? 'revision'
      : test?.status === 'draft'
        ? 'draft'
        : 'edit';

  /* The buffer. Every edit lands here and nowhere else until Save. */
  const [draft, setDraft] = useState<TestCase | null>(test);
  const [items, setItems] = useState<StepItem[]>([]);
  /* Which version's steps are on screen. null = the live ones. */
  const [viewVersion, setViewVersion] = useState<number | null>(null);

  /* Re-seed whenever a different test opens. Keyed on the test's identity, not
     on its contents, so the buffer is not thrown away by its own edits. */
  useEffect(() => {
    setDraft(test);
    setViewVersion(null);
    if (!test) return setItems([]);
    if (test.pendingMerge) return setItems(buildMergeItems(test.pendingMerge.groups));
    if (test.pendingRevision) return setItems(buildReviewItems(test.steps, test.pendingRevision.changes));
    return setItems(test.steps.map((text) => ({ text })));
  }, [test?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Every hook runs before the guard: an early return above a useMemo is how a
     component renders a different number of hooks on the render where the
     drawer closes, which React reports as "rendered more hooks than during the
     previous render". */
  const versions = useMemo(
    () => [...(draft?.history ?? [])].sort((a, b) => b.version - a.version),
    [draft?.history],
  );

  if (!test || !draft) return null;

  const version = testVersion(draft);
  const snapshot = viewVersion == null ? null : draft.history?.find((h) => h.version === viewVersion);
  const effectiveMode: Mode = snapshot ? 'history' : mode;
  const paused = draft.status === 'paused';
  const sideEffects = draft.hasSideEffects || test.pendingMerge?.sources.some((s) => s.hasSideEffects);

  const edit = (patch: Partial<TestCase>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  /* Dirty covers the buffer AND the steps, because they are edited through two
     different paths and only one of them writes to `draft`. */
  const steps = effectiveMode === 'edit' || effectiveMode === 'draft' ? items.map((it) => it.text) : [];
  const dirty =
    (effectiveMode === 'edit' || effectiveMode === 'draft') &&
    (draft.title !== test.title ||
      JSON.stringify(draft.tags ?? []) !== JSON.stringify(test.tags ?? []) ||
      JSON.stringify(draft.envNames ?? []) !== JSON.stringify(test.envNames ?? []) ||
      JSON.stringify(draft.resolutions ?? []) !== JSON.stringify(test.resolutions ?? []) ||
      JSON.stringify(draft.regions ?? []) !== JSON.stringify(test.regions ?? []) ||
      JSON.stringify(draft.schedule ?? null) !== JSON.stringify(test.schedule ?? null) ||
      JSON.stringify(steps) !== JSON.stringify(test.steps));

  const close = () => {
    model.closeTest();
    onCreated?.();
  };

  /* A schedule is what makes a test active, and clearing it puts it back to
     approved. Resolved on save rather than as you type, so a half-finished
     schedule never flips the status in the list behind you. */
  const statusFor = (s: Schedule | null | undefined, current: TestCase['status']): TestCase['status'] => {
    if (current === 'paused' || current === 'draft') return current;
    return s ? 'active' : 'approved';
  };

  const save = () => {
    model.saveTest(test.key, {
      title: draft.title,
      steps,
      tags: draft.tags,
      envNames: draft.envNames,
      resolutions: draft.resolutions,
      regions: draft.regions,
      schedule: draft.schedule ?? null,
      status: statusFor(draft.schedule, draft.status),
    });
    message.success('Saved');
    close();
  };

  const runNow = () => {
    if (dirty) save();
    else close();
    message.success(`${draft.title} — run started, see Runs`);
  };

  const summary = reviewSummary(items);
  const resolved = resolveItems(items);

  /* ── the header ─────────────────────────────────────────────────────────── */
  const eyebrow = creating
    ? 'Test · New'
    : effectiveMode === 'draft'
    ? `Draft${draft.isNew ? ' · New' : ''}`
    : effectiveMode === 'merge'
      ? 'Test · Merge review'
      : effectiveMode === 'revision'
        ? 'Test · Needs review'
        : snapshot
          ? `Test · v${snapshot.version}`
          : `Test · ${paused ? 'Paused' : draft.status === 'approved' ? 'Approved' : 'Active'}${
              version > 1 ? ` · v${version}` : ''
            }`;

  const resumeBlocked = paused && hasNoEnvironment(draft);

  /* ── the version switcher ───────────────────────────────────────────────── */
  const switcher =
    versions.length > 0 && effectiveMode !== 'revision' && effectiveMode !== 'merge' ? (
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          selectedKeys: [String(viewVersion ?? version)],
          items: [
            { key: String(version), label: `v${version} · now` },
            ...versions.map((h) => ({
              key: String(h.version),
              label: `v${h.version} · ${lastSeenLabel(minutesSince(h.savedAt))}`,
            })),
          ],
          onClick: ({ key }) => setViewVersion(Number(key) === version ? null : Number(key)),
        }}
      >
        <button type="button" className="m-tdrawer__vswitch">
          v{viewVersion ?? version}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </Dropdown>
    ) : undefined;

  /* ── the footer, one sentence per mode ──────────────────────────────────── */
  const footer = creating ? (
    <DrawerFooter
      left={
        <Button
          type="text"
          onClick={() => {
            /* The row was created when the button was pressed, so discarding
               has to take it away again - an "Untitled test" left in the list
               is exactly the bug the production build shipped. */
            model.remove([test.key]);
            close();
          }}
        >
          Discard
        </Button>
      }
      right={
        <Button
          type="primary"
          icon={<Check size={14} />}
          disabled={items.length === 0}
          onClick={() => {
            save();
            message.success(`${draft.title} created`);
          }}
        >
          Create test
        </Button>
      }
    />
  ) : effectiveMode === 'merge' ? (
    <DrawerFooter
      left={
        <Button type="text" onClick={() => { model.cancelMerge(test.key); close(); }}>
          Cancel merge
        </Button>
      }
      right={
        <Button
          type="primary"
          icon={<Check size={14} />}
          onClick={() => {
            model.acceptMerge(test.key, flattenMerge(items));
            message.success('Merged');
            close();
          }}
        >
          Combine {flattenMerge(items).length} steps
        </Button>
      }
    />
  ) : effectiveMode === 'revision' ? (
    <DrawerFooter
      left={
        <Button type="text" onClick={() => { model.keepVersion(test.key); close(); }}>
          Keep v{version}
        </Button>
      }
      right={
        <Button
          type="primary"
          icon={<Check size={14} />}
          disabled={summary.added === 0 && summary.removed === 0}
          onClick={() => {
            model.applyRevision(test.key, resolved);
            message.success(`Saved v${test.pendingRevision?.toVersion}`);
            close();
          }}
        >
          Save v{test.pendingRevision?.toVersion}
        </Button>
      }
    />
  ) : effectiveMode === 'draft' ? (
    /* A draft is a PROPOSAL, so its footer is about accepting it, not about
       saving it. Approving is its own decision and scheduling is another one:
       "I accept these steps" and "run this every morning" are different
       sentences, and the production build learnt that the hard way by making
       approve also schedule. Approving here leaves the drawer open on the
       approved test, with the schedule field right there. */
    <DrawerFooter
      left={
        draft.origin === 'user' ? (
          <Button type="text" danger icon={<Trash2 size={14} />} onClick={() => { onDelete?.(test); }}>
            Delete draft
          </Button>
        ) : (
          <Button type="text" danger icon={<X size={14} />} onClick={() => { onDismiss?.(test); }}>
            Dismiss
          </Button>
        )
      }
      right={
        <>
          <Button onClick={save} disabled={!dirty}>
            Save draft
          </Button>
          <Button
            type="primary"
            icon={<Check size={14} />}
            onClick={() => {
              model.saveTest(test.key, {
                title: draft.title,
                steps,
                tags: draft.tags,
                envNames: draft.envNames,
                resolutions: draft.resolutions,
                regions: draft.regions,
                schedule: draft.schedule ?? null,
                status: draft.schedule ? 'active' : 'approved',
                isNew: false,
              });
              message.success(
                draft.schedule
                  ? `${draft.title} is live, and runs ${scheduleSentence(draft.schedule)}`
                  : `${draft.title} approved. Give it a schedule to start running it.`,
              );
              close();
            }}
          >
            Approve steps
          </Button>
        </>
      }
    />
  ) : snapshot ? (
    <DrawerFooter
      right={
        <Button onClick={() => setViewVersion(null)}>Back to v{version}</Button>
      }
    />
  ) : (
    <DrawerFooter
      left={
        <Button
          type="text"
          danger
          icon={<Trash2 size={14} />}
          onClick={() => { model.remove([test.key]); close(); }}
        >
          Delete test
        </Button>
      }
      right={
        <>
          <Tooltip title={dirty ? 'Saves your changes, then runs' : undefined}>
            <Button icon={<Play size={14} />} onClick={runNow}>
              Run now
            </Button>
          </Tooltip>
          <Button type="primary" icon={<Check size={14} />} onClick={save} disabled={!dirty}>
            Save
          </Button>
        </>
      }
    />
  );

  return (
    <EntityDrawer
      open={!!test}
      onClose={close}
      title={draft.title}
      eyebrow={eyebrow}
      onTitleChange={(effectiveMode === 'edit' || effectiveMode === 'draft') && !snapshot ? (title) => edit({ title }) : undefined}
      autoEditTitle={creating}
      headerActions={
        effectiveMode === 'edit' && !creating && !snapshot && draft.status !== 'approved' && draft.status !== 'draft' ? (
          <Tooltip title={resumeBlocked ? 'Set an environment below to resume this test.' : undefined}>
            <Button
              size="small"
              disabled={resumeBlocked}
              icon={paused ? <Play size={13} /> : <Pause size={13} />}
              onClick={() => {
                if (paused) model.resume(test.key);
                else model.pause(test.key);
              }}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </Tooltip>
        ) : undefined
      }
      footer={footer}
    >
      {/* Running a side-effects test changes real data, which is the only
          irreversible thing in this feature, so it is said before the steps
          rather than beside them. A merge ORs the flag across its sources:
          side effects do not cancel out by being outnumbered. */}
      {sideEffects && (
        <div className="m-tdrawer__fx">
          <ShieldAlert size={15} aria-hidden="true" />
          <p>
            {test.pendingMerge
              ? 'One of the tests being merged changes real data. Running the merged test places real orders, accounts or payments.'
              : 'This test changes real data. Running it places real orders, accounts or payments.'}
          </p>
        </div>
      )}

      <Section
        title={
          effectiveMode === 'revision' ? (
            <>
              Steps
              <span className="m-tdrawer__vpair">
                v{version} <MoveRight size={13} aria-hidden="true" /> v{test.pendingRevision?.toVersion}
              </span>
            </>
          ) : effectiveMode === 'merge' ? (
            <>
              Steps <span className="m-dsec__count">merge review</span>
            </>
          ) : (
            <>
              Steps <span className="m-dsec__count">{snapshot ? snapshot.steps.length : items.length}</span>
            </>
          )
        }
        action={
          effectiveMode === 'revision' ? (
            /* What saving would do, in two numbers - and when the answer is
               "nothing", it says that instead of rendering an empty slot.
               Rejecting every suggestion is a real outcome, and the drawer has
               to be able to report it. */
            <span className="m-tdrawer__sum">
              {summary.added === 0 && summary.removed === 0 ? (
                <span className="is-none">nothing left to apply</span>
              ) : (
                <>
                  {summary.added > 0 && <span className="is-add">+{summary.added}</span>}
                  {summary.removed > 0 && <span className="is-rm">−{summary.removed}</span>}
                </>
              )}
            </span>
          ) : (
            switcher
          )
        }
        hint={
          snapshot
            ? `Saved ${lastSeenLabel(minutesSince(snapshot.savedAt))}. An older version is history, so this list is read-only.`
            : undefined
        }
      >
        <StepList
          items={snapshot ? snapshot.steps.map((text) => ({ text })) : items}
          onChange={setItems}
          readOnly={!!snapshot}
          maxHeight="46vh"
          historyFor={effectiveMode === 'edit' && !snapshot ? (i) => stepHistory(test, i) : undefined}
          onDecide={
            effectiveMode === 'revision'
              ? (i) => (decision) =>
                  setItems((prev) =>
                    prev.map((it, n) =>
                      n === i ? { ...it, decision: it.decision === decision ? undefined : decision } : it,
                    ),
                  )
              : undefined
          }
        />
      </Section>

      {!snapshot && effectiveMode !== 'merge' && (
        <>
          <Section
            title="Run settings"
            hint={
              draft.status === 'approved'
                ? 'Not scheduled. This test runs when you ask it to, until you set a schedule below.'
                : undefined
            }
          >
            <RunSettings
              value={draft as RunSettingsValue}
              environments={model.environments}
              onChange={(patch) => edit(patch as Partial<TestCase>)}
            />
          </Section>

          <Section title="Tags" action={<span className="m-dsec__count">up to 3</span>}>
            <TagEditor value={draft.tags ?? []} onChange={(tags) => edit({ tags })} />
          </Section>
        </>
      )}

      {!creating && !snapshot && effectiveMode !== 'draft' && (
        <Section
          title="Runs"
          action={
            onViewRuns ? (
              <Button size="small" type="text" onClick={() => { onViewRuns(test); close(); }}>
                View all
              </Button>
            ) : undefined
          }
        >
          {/* One sentence rather than a strip of dots. The production drawer put
              the last ten results here as coloured icons, which is a chart of
              ten data points: what you actually want to know from a test's own
              panel is whether it is passing and when it next runs. The run log
              is one click away and it is a better log than ten dots. */}
          {draft.lastResult ? (
            <p className="m-tdrawer__runs">
              <Chip tone={draft.lastResult === 'passed' ? 'success' : 'danger'}>
                {draft.lastResult === 'passed' ? 'Passed' : 'Failed'}
              </Chip>
              <span>
                {lastSeenLabel(minutesSince(draft.lastRunAt ?? 0))}
                {draft.schedule ? `. Next run ${scheduleSentence(draft.schedule)}.` : '.'}
              </span>
            </p>
          ) : (
            <p className="m-tdrawer__runs is-none">
              This test has never run. Run it now, or give it a schedule above.
            </p>
          )}
        </Section>
      )}
    </EntityDrawer>
  );
}

/** Exported for the harness and the list: how many steps a review would leave
 *  behind, without opening it. */
export const reviewedStepCount = (tc: TestCase): number =>
  tc.pendingRevision
    ? resolveItems(buildReviewItems(tc.steps, tc.pendingRevision.changes)).length
    : stepCount(tc);

export const strikeCount = (items: readonly StepItem[]): number => items.filter(isStruck).length;
