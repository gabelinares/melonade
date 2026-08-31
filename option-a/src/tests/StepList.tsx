import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Popover, Tooltip } from 'antd';
import { Check, Clock3, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { isStruck, type StepItem } from '@shared/steps-logic.ts';
import './step-list.css';

export interface StepListProps {
  /** The rows. A plain edit is a list of `{ text }`; a review adds `kind` and
   *  `decision` to the rows the agent is proposing. One component either way,
   *  because a review IS the editable list with the proposal dressed as a diff:
   *  two components would mean two answers to "can I retype this line". */
  items: StepItem[];
  onChange: (items: StepItem[]) => void;
  /** Accept or reject one proposed row. Absent = not a review. */
  onDecide?: (index: number) => (decision: 'accepted' | 'rejected') => void;
  /** Earlier wordings of the step at this index, newest first. Non-empty turns
   *  on the per-step history affordance. */
  historyFor?: (index: number) => { version: number; text: string }[];
  /** Read-only: an older version is history, and history does not take edits. */
  readOnly?: boolean;
  /** Cap the height and scroll inside, so run settings and tags stay reachable
   *  on a fifty-step test. */
  maxHeight?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE STEPS.
 *
 * Ported from the production editor, which is the piece of that feature people
 * actually use, and reduced to the four gestures it earns:
 *
 *   READ UNTIL YOU CLICK. There is no edit mode and no pencil. Clicking a step
 *   turns that line into a field; Enter commits, Escape cancels, and an empty
 *   line is dropped on blur, so abandoning a misclick costs nothing.
 *   INSERT BETWEEN. The gap between two steps is a hover target that reveals a
 *   line and a plus. The same line is the drop indicator while dragging, so
 *   "add here" and "move here" are one mark rather than two vocabularies.
 *   DRAG THE GRIP. It replaces the number on hover, so the row gains no width
 *   and the list does not reflow when you start.
 *   DELETE ON HOVER. Never a persistent control: thirty rows of trash icons is
 *   a list that looks like it is asking to be emptied.
 *
 * A REVIEW IS THE SAME LIST. Proposed rows carry a tint, a + or a −, and one
 * pair of accept/reject buttons; everything else still edits, drags and deletes.
 * That is the whole reason this component is shared rather than forked: the
 * production build had a separate read-only review at one point, and the first
 * question anybody asked of it was "can I just fix the wording".
 * ════════════════════════════════════════════════════════════════════════════
 */
export function StepList({ items, onChange, onDecide, historyFor, readOnly, maxHeight }: StepListProps) {
  /* Which row is being typed into, and which row is being dragged. Both are
     indices into `items` and both are null almost all the time. */
  const [editing, setEditing] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  /* A row inserted by the plus is born empty and focused. Kept apart from
     `editing` because only a fresh row chains another one on Enter. */
  const [fresh, setFresh] = useState<number | null>(null);

  const patch = (i: number, text: string) => {
    const next = [...items];
    const row = next[i];
    if (!row) return;
    next[i] = { ...row, text };
    onChange(next);
  };

  /**
   * Committing a line, and possibly chaining the next one, in ONE update.
   *
   * It was two - write the text, then insert the next row - and the second read
   * the same `items` the first did, so the typed line was overwritten by the
   * chain and you got an empty step instead of the one you had just written.
   * Caught by typing into it rather than by looking at it: the render was
   * correct at every frame, and the text was gone.
   */
  const commit = (i: number, text: string, chain: boolean) => {
    const trimmed = text.trim();
    const next = [...items];
    const row = next[i];
    if (!row) return;
    if (!trimmed) next.splice(i, 1);
    else next[i] = { ...row, text: trimmed };

    let focus: number | null = null;
    if (chain && trimmed) {
      focus = i + 1;
      next.splice(focus, 0, { text: '' });
    }
    onChange(next);
    setEditing(focus);
    setFresh(focus);
  };

  const remove = (i: number) => {
    onChange(items.filter((_, n) => n !== i));
    setEditing(null);
    setFresh(null);
  };

  const insertAt = (i: number) => {
    const next = [...items];
    next.splice(i, 0, { text: '' });
    onChange(next);
    setEditing(i);
    setFresh(i);
  };

  const move = (from: number, to: number) => {
    if (from === to || from + 1 === to) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    if (!row) return;
    next.splice(from < to ? to - 1 : to, 0, row);
    onChange(next);
  };

  /* A group label owns the steps under it until the next label, so dragging the
     label has to take the block with it. Merge review is the only mode with
     labels, and this is the whole of what makes it a merge review. */
  const blockOf = (i: number) => {
    let end = i + 1;
    while (end < items.length && items[end]?.kind !== 'group') end += 1;
    return end;
  };

  const moveBlock = (from: number, to: number) => {
    const end = blockOf(from);
    if (to >= from && to <= end) return;
    const next = [...items];
    const block = next.splice(from, end - from);
    next.splice(to > from ? to - block.length : to, 0, ...block);
    onChange(next);
  };

  const onDrop = (gap: number) => {
    if (dragging == null) return;
    if (items[dragging]?.kind === 'group') moveBlock(dragging, gap);
    else move(dragging, gap);
    setDragging(null);
    setDropAt(null);
  };

  /* The visible number of a row. Struck rows and group labels are not steps, so
     they are not counted - numbering them would promise they will run. */
  let n = 0;
  const numbers = items.map((it) => (it.kind === 'group' || isStruck(it) ? null : ++n));

  const gap = (i: number) =>
    readOnly ? null : (
      <Gap
        key={`gap-${i}`}
        active={dropAt === i}
        dragging={dragging != null}
        onInsert={() => insertAt(i)}
        onDragOver={() => setDropAt(i)}
        onDrop={() => onDrop(i)}
      />
    );

  return (
    <div className="m-steps" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      {items.length === 0 && !readOnly && (
        <button type="button" className="m-steps__first" onClick={() => insertAt(0)}>
          <Plus size={14} aria-hidden="true" />
          Write the first step
        </button>
      )}
      {items.map((it, i) => (
        <div key={i}>
          {gap(i)}
          <StepRow
            item={it}
            index={i}
            number={numbers[i] ?? null}
            editing={editing === i}
            fresh={fresh === i}
            readOnly={readOnly}
            dragging={dragging === i}
            history={historyFor?.(i) ?? []}
            onEdit={() => !readOnly && setEditing(i)}
            onCommit={(text, chain) => commit(i, text, chain)}
            onCancel={() => {
              if (!items[i]?.text.trim()) remove(i);
              setEditing(null);
              setFresh(null);
            }}
            onRemove={() => remove(i)}
            onRestore={(text) => patch(i, text)}
            onDecide={onDecide?.(i)}
            onDragStart={() => setDragging(i)}
            onDragEnd={() => {
              setDragging(null);
              setDropAt(null);
            }}
          />
        </div>
      ))}
      {items.length > 0 && gap(items.length)}
    </div>
  );
}

/**
 * The space between two steps, and the only place a step is added.
 *
 * It is the same height at rest and while dragging, so starting a drag never
 * reflows the list under the cursor - which is what makes dropping in the right
 * place possible at all.
 */
function Gap({
  active,
  dragging,
  onInsert,
  onDragOver,
  onDrop,
}: {
  active: boolean;
  dragging: boolean;
  onInsert: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`m-steps__gap${active ? ' is-target' : ''}${dragging ? ' is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <button type="button" className="m-steps__insert" aria-label="Insert a step here" onClick={onInsert}>
        <span className="m-steps__line" aria-hidden="true" />
        <Plus size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

interface StepRowProps {
  item: StepItem;
  index: number;
  number: number | null;
  editing: boolean;
  fresh: boolean;
  readOnly?: boolean;
  dragging: boolean;
  history: { version: number; text: string }[];
  onEdit: () => void;
  onCommit: (text: string, chain: boolean) => void;
  onCancel: () => void;
  onRemove: () => void;
  onRestore: (text: string) => void;
  onDecide?: (decision: 'accepted' | 'rejected') => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function StepRow({
  item,
  number,
  editing,
  fresh,
  readOnly,
  dragging,
  history,
  onEdit,
  onCommit,
  onCancel,
  onRemove,
  onRestore,
  onDecide,
  onDragStart,
  onDragEnd,
}: StepRowProps) {
  const [val, setVal] = useState(item.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setVal(item.text);
      const id = window.setTimeout(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(item.text.length, item.text.length);
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [editing, item.text]);

  const struck = isStruck(item);
  const group = item.kind === 'group';
  const cls = [
    'm-step',
    group ? 'is-group' : '',
    item.kind === 'added' ? 'is-added' : '',
    item.kind === 'removed' ? 'is-removed' : '',
    struck ? 'is-struck' : '',
    dragging ? 'is-dragging' : '',
    editing ? 'is-editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      draggable={!readOnly && !editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* The number turns into the grip on hover: one slot, so the row keeps its
          width and the text never shifts. */}
      <span className="m-step__lead" aria-hidden={group}>
        {group ? null : <span className="m-step__num">{number ?? ''}</span>}
        {!readOnly && (
          <span className="m-step__grip" aria-hidden="true">
            <GripVertical size={13} />
          </span>
        )}
      </span>

      {/* The proposal's mark. A + or a − rather than colour alone, because the
          tint is the softest thing on the row and colour is not readable to
          everyone. */}
      {(item.kind === 'added' || item.kind === 'removed') && (
        <span className="m-step__mark" aria-hidden="true">
          {item.kind === 'added' ? '+' : '−'}
        </span>
      )}

      {editing ? (
        <textarea
          ref={ref}
          className="m-step__input"
          value={val}
          rows={1}
          aria-label="Step"
          /* An empty line is a bare caret sitting in white space, which reads as
             a rendering glitch rather than as a field waiting for you. The
             placeholder is what makes it a field. */
          placeholder="What does this step do?"
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => onCommit(val, false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onCommit(val, fresh);
            }
            /* Escape abandons the LINE, and must not reach the drawer, which
               also listens for it and would close - taking every buffered edit
               with it. Two things listening for one key is fine; the inner one
               has to say it handled it. */
            if (e.key === 'Escape') {
              e.stopPropagation();
              onCancel();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="m-step__text"
          onClick={onEdit}
          disabled={readOnly || struck}
          aria-label={readOnly ? undefined : `Edit step: ${item.text}`}
        >
          {item.text}
        </button>
      )}

      <span className="m-step__actions">
        {onDecide && (item.kind === 'added' || item.kind === 'removed') && (
          <>
            <Tooltip title="Accept">
              <button
                type="button"
                className={`m-step__act is-yes${item.decision === 'accepted' ? ' is-on' : ''}`}
                aria-label="Accept this change"
                aria-pressed={item.decision === 'accepted'}
                onClick={() => onDecide('accepted')}
              >
                <Check size={13} />
              </button>
            </Tooltip>
            <Tooltip title="Reject">
              <button
                type="button"
                className={`m-step__act is-no${item.decision === 'rejected' ? ' is-on' : ''}`}
                aria-label="Reject this change"
                aria-pressed={item.decision === 'rejected'}
                onClick={() => onDecide('rejected')}
              >
                <X size={13} />
              </button>
            </Tooltip>
          </>
        )}
        {history.length > 0 && (
          <Popover
            trigger="click"
            placement="bottomRight"
            content={<StepHistory history={history} onRestore={onRestore} />}
          >
            <button type="button" className="m-step__act is-quiet" aria-label="Earlier wordings">
              <Clock3 size={13} />
            </button>
          </Popover>
        )}
        {!readOnly && (
          <button type="button" className="m-step__act is-quiet" aria-label="Delete step" onClick={onRemove}>
            <Trash2 size={13} />
          </button>
        )}
      </span>
    </div>
  );
}

/** What this step used to say. One click puts an old wording back, because the
 *  only reason to look at this is to undo something. */
function StepHistory({
  history,
  onRestore,
}: {
  history: { version: number; text: string }[];
  onRestore: (text: string) => void;
}) {
  return (
    <div className="m-stephist">
      {history.map((h) => (
        <button key={h.version} type="button" className="m-stephist__row" onClick={() => onRestore(h.text)}>
          <span className="m-stephist__v">v{h.version}</span>
          <span className="m-stephist__t">{h.text}</span>
        </button>
      ))}
    </div>
  );
}

/** The count beside a section heading, said the way the rest of the app says
 *  counts. Exported so the drawer's heading and this list cannot disagree. */
export function StepCount({ n }: { n: number }): ReactNode {
  return <span className="m-dsec__count">{n}</span>;
}
