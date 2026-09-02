import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Drawer, Input } from 'antd';
import type { InputRef } from 'antd';
import { Pencil, X } from 'lucide-react';
import { IconButton } from './IconButton.tsx';
import './entity-drawer.css';

export interface EntityDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The thing's name. Editable when `onTitleChange` is given. */
  title: string;
  /** One small line above the title saying WHAT this is and what state it is
   *  in: "Test · Needs review", "Run · Failed". The kind is never a colour or a
   *  glyph here - two drawers that differ only by an icon tile read as the same
   *  drawer wearing a sticker. */
  eyebrow: ReactNode;
  onTitleChange?: (title: string) => void;
  /** Creation: mount the field already editing and empty, so naming is the
   *  first thing you do rather than something you discover. */
  autoEditTitle?: boolean;
  /** What the empty name field says while creating: "Name this test", "Name
   *  this segment". The shell has no noun of its own. */
  namePlaceholder?: string;
  /** A line under the title for the facts that never change while it is open:
   *  when a run happened, how long it took, where. */
  meta?: ReactNode;
  /** Immediate state controls, top right. Never a primary button: the footer
   *  owns the commit, and one accent per view. */
  headerActions?: ReactNode;
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE DRAWER EVERY OBJECT OPENS INTO.
 *
 * A test, a run and (next) an audit are three different things, and they all
 * open the same shell: one header grammar, one section rhythm, one footer.
 * Three lookalike drawers is how the production build ended up with three
 * header heights and two different places for the primary action.
 *
 * Three rules it enforces, and they are all about where the eye goes:
 *
 * 1. THE EYEBROW SAYS WHAT AND IN WHAT STATE. "Test · Needs review" is the one
 *    line that tells you why this drawer looks different from the last one you
 *    opened. The production drawers said it with a coloured icon tile per type,
 *    which is decoration: a word is unambiguous and survives being read aloud.
 * 2. THE FOOTER OWNS THE COMMIT, and the header owns immediate state. Save is
 *    the primary action and it is in the bottom right; Pause is a toggle and it
 *    is in the top right. A primary button in the header would put two accents
 *    on one surface and make the reader choose.
 * 3. THE BODY IS SECTIONS, hairline-separated, and it scrolls. `Section` is the
 *    only way to add one, so a drawer cannot grow a heading of its own size.
 *
 * ── 2026-08-31: THE CLOSE IS OURS, AND IT IS IN THE CORNER ─────────────────
 * antd v6 renders its close button as the FIRST thing inside the header title,
 * so the X landed on the eyebrow's line and pushed the whole lead block 30px to
 * the right - a header whose left edge did not agree with the body's, and a
 * dismiss control sitting in the middle of the writing. Gabriel: "placed in a
 * very strange way, with strange gaps and alignment."
 *
 * So `closable` is off and the close is drawn here, as the last control in the
 * header's own group: an IconButton like every other icon-only control in the
 * app, at the top-right corner, after a hairline that separates DISMISSING THE
 * SURFACE from acting on the thing inside it. The lead block now starts on the
 * panel's own inset, which is the same line every section below it starts on.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function EntityDrawer({
  open,
  onClose,
  title,
  eyebrow,
  onTitleChange,
  autoEditTitle,
  namePlaceholder,
  meta,
  headerActions,
  footer,
  width = 560,
  children,
}: EntityDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      rootClassName="m-drawer"
      closable={false}
      destroyOnHidden
      title={
        <div className="m-drawer__lead">
          <p className="m-drawer__eyebrow">{eyebrow}</p>
          {onTitleChange ? (
            <EditableTitle
              title={title}
              onChange={onTitleChange}
              autoEdit={autoEditTitle}
              placeholder={namePlaceholder}
            />
          ) : (
            <h2 className="m-drawer__title">{title}</h2>
          )}
          {meta && <div className="m-drawer__meta">{meta}</div>}
        </div>
      }
      extra={
        <div className="m-drawer__actions">
          {headerActions}
          {headerActions && <span className="m-drawer__sep" aria-hidden="true" />}
          <IconButton icon={<X size={15} />} label="Close" variant="ghost" onClick={onClose} />
        </div>
      }
      footer={footer}
      /* antd v6 deprecated `width` in favour of `size`, which is two presets.
         A drawer this app opens is 560: wide enough for a step to read as a
         sentence, narrow enough that the list behind it is still there. */
      styles={{ wrapper: { width }, body: { padding: 0 }, footer: { padding: '10px 20px' } }}
    >
      {children}
    </Drawer>
  );
}

/**
 * The title as a click-to-rename field, which is the same gesture the issue
 * detail uses one level up. The whole title is the target; editing swaps in an
 * input at the same height so the header never grows under the cursor; Enter
 * saves, Escape cancels, and an empty commit keeps the old name.
 */
function EditableTitle({
  title,
  onChange,
  autoEdit,
  placeholder,
}: {
  title: string;
  onChange: (title: string) => void;
  autoEdit?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(!!autoEdit);
  const [val, setVal] = useState(autoEdit ? '' : title);
  const ref = useRef<InputRef>(null);

  useEffect(() => {
    if (!editing) setVal(title);
  }, [title, editing]);

  /* The drawer animates in, and antd's own focus management takes the focus
     during that. Focusing after it settles is the difference between a field
     you can type into and one that silently is not focused. */
  useEffect(() => {
    if (!editing) return undefined;
    const id = window.setTimeout(() => ref.current?.focus(), autoEdit ? 260 : 0);
    return () => window.clearTimeout(id);
  }, [editing, autoEdit]);

  const commit = () => {
    const v = val.trim();
    if (v && v !== title) onChange(v);
    else setVal(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="m-drawer__rename">
        <Input
          ref={ref}
          size="small"
          value={val}
          maxLength={120}
          aria-label="Name"
          /* ⚠ IT SAID "Name this test" WHATEVER IT WAS NAMING. This shell is
             the drawer every object opens into, and a hardcoded noun in it
             makes every second object wrong - the segment drawer asked people
             to name a test. The caller brings its own word. */
          placeholder={autoEdit ? (placeholder ?? 'Name') : undefined}
          onChange={(e) => {
            setVal(e.target.value);
            /* ⚠ WHILE CREATING, THE NAME IS LIVE. Renaming an existing thing
               is a commit - you can change your mind, so it takes Enter and
               offers Cancel. Creating one is not: the footer owns the only
               commit there is, and a name that had to be committed SEPARATELY
               before the footer's button would notice it left people typing a
               name and clicking a Create that stayed disabled with no way to
               see why. */
            if (autoEdit) onChange(e.target.value);
          }}
          onPressEnter={commit}
          onKeyDown={(e) => {
            /* Same rule as the step editor: Escape cancels the rename, and the
               drawer behind it must not also read it as "close". */
            if (e.key === 'Escape') {
              e.stopPropagation();
              setVal(title);
              setEditing(false);
            }
          }}
        />
        {/* Not while creating: there is nothing to go back to and nothing to
            commit to but the footer. */}
        {!autoEdit && (
          <>
            <Button size="small" type="text" onClick={() => { setVal(title); setEditing(false); }}>
              Cancel
            </Button>
            <Button size="small" type="primary" onClick={commit}>
              Save
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="m-drawer__title-btn" onClick={() => setEditing(true)} aria-label={`Rename ${title}`}>
      <h2 className="m-drawer__title">{title}</h2>
      <Pencil size={13} aria-hidden="true" />
    </button>
  );
}

/**
 * One block of the drawer. The heading is small and the hairline under the
 * block is what separates it - a drawer full of page-sized headings reads as
 * five pages stacked.
 */
export function Section({
  title,
  action,
  hint,
  flush,
  children,
}: {
  title: ReactNode;
  /** Right of the heading: a count, a switcher, one quiet control. */
  action?: ReactNode;
  /** A line under the heading, before the content. */
  hint?: ReactNode;
  /** No bottom padding, for a section whose content already ends in a border. */
  flush?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`m-dsec${flush ? ' is-flush' : ''}`}>
      <div className="m-dsec__head">
        <h3 className="m-dsec__title">{title}</h3>
        {action}
      </div>
      {hint && <p className="m-dsec__hint">{hint}</p>}
      {children}
    </section>
  );
}

/** A labelled control inside a section. The label is above, always, because
 *  three of these in a row with labels beside them is a table nobody asked for. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="m-dfield">
      <span className="m-dfield__label">{label}</span>
      {children}
    </label>
  );
}

/** Read-only facts, two to a row. For the things a run cannot change about
 *  itself: when, where, which version. */
export function MetaGrid({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="m-dgrid">
      {items.map((it, i) => (
        <div key={i} className="m-dgrid__cell">
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The footer's two halves: what leaves this object on the left, what commits
 *  it on the right. Every drawer's footer is this, so the destructive action is
 *  never where the primary was a moment ago. */
export function DrawerFooter({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="m-dfoot">
      <div className="m-dfoot__left">{left}</div>
      <div className="m-dfoot__right">{right}</div>
    </div>
  );
}
