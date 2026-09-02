import { useMemo, useState } from 'react';
import { App, Button, Switch, Tooltip } from 'antd';
import {
  INITIAL_SESSIONS_STATE,
  filterSessions,
  isIncomplete,
  type SavedSegment,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { EntityDrawer, Section } from '../components/EntityDrawer.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchCard } from './SearchCard.tsx';
import { useFilterDraft } from './useFilterDraft.ts';
import './segment-drawer.css';

export interface SegmentDrawerProps {
  /** `null` while creating. */
  segment: SavedSegment | null;
  open: boolean;
  /** The search on screen when "Save this search" was pressed. A new segment
   *  starts from it rather than from nothing. */
  seed: { filters: SavedSegment['filters']; eventsOrder: SavedSegment['eventsOrder'] };
  /** Every session in the current window, for the live count and the value
   *  pickers. NOT the filtered list: a segment is its own search and must be
   *  counted against everything, or its count would be a count of a count. */
  pool: readonly SessionRow[];
  onSave: (segment: SavedSegment) => void;
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
  onClose: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * A SEGMENT, OPEN.
 *
 * Mehdi, 2026-09-02: *"we'll need to redesign and create a segment drawer,
 * where we can edit the segment rules — remember, the segment is just one saved
 * search so the design should be really consistent."*
 *
 * ── THE RULES EDITOR IS THE SEARCH, LITERALLY ─────────────────────────────
 * Not a component that looks like it. `SearchCard` in its `panel` variant, fed
 * by `useFilterDraft`, which binds the same eleven transforms `useSessions`
 * binds to the live search. So the picker is the picker, a clause reads as a
 * clause, the value fields carry their proportion bars, and the sentence at the
 * bottom is written by the same function. There is nothing in here that could
 * drift from the page, because there is nothing in here that is a copy of it.
 *
 * ── AND IT COUNTS AS YOU TYPE ─────────────────────────────────────────────
 * The strip inside the editor prints how many sessions the rules currently
 * hold, live, against the whole window. That is the one question a segment
 * exists to answer and the one thing a rules form usually makes you save and
 * navigate to find out.
 *
 * ⚠ THE DRAFT IS A DRAFT. Nothing reaches the saved segment until Save. Editing
 * rules and watching the list behind the drawer move under you would be a
 * preview nobody asked for, with no way back out of it.
 *
 * ── WHAT SOMEBODY ELSE'S SEGMENT DOES ─────────────────────────────────────
 * It opens, reads, and applies. It does not save, and the drawer says which of
 * those it is in the eyebrow rather than by disabling a button and leaving you
 * to work out why. That is production's own rule.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SegmentDrawer({
  segment,
  open,
  seed,
  pool,
  onSave,
  onDelete,
  onApply,
  onClose,
}: SegmentDrawerProps) {
  const { modal } = App.useApp();
  const creating = segment == null;

  /* ⚠ KEYED ON THE SEGMENT, at the callsite. The draft is seeded once per
     mount, so a drawer reused across two segments would edit the first one's
     rules under the second one's name. */
  const draft = useFilterDraft(creating ? seed : segment);
  const [name, setName] = useState(segment?.name ?? '');
  const [shared, setShared] = useState(segment?.shared ?? false);

  const mine = segment?.mine ?? true;

  /* What these rules hold, right now, out of everything in the window. Not out
     of the filtered list: a segment is its own search, so counting it against
     another search would answer a question nobody asked. */
  const matched = useMemo(
    () =>
      filterSessions(
        { ...INITIAL_SESSIONS_STATE, filters: draft.rules, eventsOrder: draft.eventsOrder },
        pool,
      ),
    [draft.rules, draft.eventsOrder, pool],
  );

  const named = name.trim().length > 0;
  const hasRules = draft.rules.length > 0;
  /* ⚠ AND NO HALF-WRITTEN CLAUSE. A row whose operator wants a value and has
     none narrows nothing, and the row says so on screen - "needs a value". Let
     it through and the segment quietly means something other than what it
     prints, for as long as nobody reopens it. The rows already carry the mark;
     this is the same rule applied at the moment it becomes permanent. */
  const unfinished = draft.rules.filter(isIncomplete).length;

  const save = () =>
    onSave({
      id: segment?.id ?? `seg-${Math.floor(Math.random() * 900 + 100)}`,
      name: name.trim(),
      mine: segment?.mine ?? true,
      shared,
      createdBy: segment?.createdBy ?? 'You',
      updatedAt: Date.now(),
      filters: draft.rules,
      eventsOrder: draft.eventsOrder,
    });

  const confirmDelete = () =>
    modal.confirm({
      title: `Delete “${segment?.name}”?`,
      /* What it costs, in the words of what it is: a saved search, and the
         sessions it describes are not going anywhere. */
      content: 'The search is deleted. The sessions it describes are not affected.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => segment && onDelete(segment.id),
    });

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      width={720}
      title={creating ? name : (segment?.name ?? '')}
      autoEditTitle={creating}
      namePlaceholder="Name this segment"
      onTitleChange={mine ? setName : undefined}
      eyebrow={
        creating ? 'Segment · New' : mine ? 'Segment · Yours' : `Segment · ${segment?.createdBy}`
      }
      meta={
        segment && (
          <>
            <span>{segment.shared ? 'Shared with the team' : 'Only you'}</span>
            <span>
              Updated <RelativeTime minutesAgo={(Date.now() - segment.updatedAt) / 60000} />
            </span>
          </>
        )
      }
      headerActions={
        segment && (
          <Button size="small" onClick={() => onApply(segment.id)}>
            Use this search
          </Button>
        )
      }
      footer={
        <div className="m-sd__foot">
          {segment && mine ? (
            <Button size="small" type="text" danger onClick={confirmDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <span className="m-sd__foot-right">
            <Button size="small" onClick={onClose}>
              Cancel
            </Button>
            {/* ⚠ THE TOOLTIP CARRIES THE REASON. A disabled primary with no
                explanation is the control telling you it knows something you
                do not — and there are three different reasons this can be off. */}
            <Tooltip
              title={
                !mine
                  ? `This is ${segment?.createdBy}'s segment. Use it, or save your own copy from the search.`
                  : !named
                    ? 'Give it a name first'
                    : !hasRules
                      ? 'A segment with no rules is every session'
                      : unfinished > 0
                        ? `${unfinished} ${unfinished === 1 ? 'rule needs' : 'rules need'} a value`
                        : undefined
              }
            >
              <span>
                <Button
                  size="small"
                  type="primary"
                  disabled={!mine || !named || !hasRules || unfinished > 0}
                  onClick={save}
                >
                  {creating ? 'Create segment' : 'Save changes'}
                </Button>
              </span>
            </Tooltip>
          </span>
        </div>
      }
    >
      <Section
        title="Rules"
        hint="A segment is a saved search. These are the same rows the sessions filter uses, and they behave the same way."
        action={
          <span className="m-sd__count">
            {matched.length} {matched.length === 1 ? 'session' : 'sessions'}
          </span>
        }
      >
        {/* THE EDITOR, not a copy of it. See the note at the top of this file. */}
        <SearchCard
          variant="panel"
          events={draft.events}
          properties={draft.properties}
          eventsOrder={draft.eventsOrder}
          onAdd={draft.onAdd}
          onAddMany={draft.onAddMany}
          onReplace={draft.onReplace}
          onUpdate={draft.onUpdate}
          onRemove={draft.onRemove}
          onMoveEvent={draft.onMoveEvent}
          onAddProperty={draft.onAddProperty}
          onUpdateProperty={draft.onUpdateProperty}
          onRemoveProperty={draft.onRemoveProperty}
          onTogglePropertyOrder={draft.onTogglePropertyOrder}
          onEventsOrder={draft.onEventsOrder}
          onClear={draft.onClear}
          /* ⚠ THE POOL IS THE WINDOW, not what the draft already matched. A
             value picker fed the filtered list can only offer the values that
             survived the clause you are editing - pick France and France is
             the only country it can still see, so a second country is
             unreachable. The RESULT is a separate number, below. */
          rows={pool}
          resultCount={matched.length}
        />
      </Section>

      <Section
        title="Sharing"
        hint="A shared segment appears in everyone's filter picker and in their segments tab."
      >
        <label className="m-sd__row">
          <Switch size="small" checked={shared} disabled={!mine} onChange={setShared} />
          <span>Share with the team</span>
        </label>
      </Section>
    </EntityDrawer>
  );
}
