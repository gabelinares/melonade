import { useState, type ReactNode } from 'react';
import { Button, Popover, Select } from 'antd';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, SlidersHorizontal } from 'lucide-react';
import {
  FIELD_CHOICES,
  GROUP_CHOICES,
  HIDDEN_CHOICES,
  SORT_CHOICES,
  type Display,
  type FieldKey,
  type GroupKey,
  type HiddenMode,
  type SortKey,
} from '@shared/issues-logic.ts';
import { IconButton } from './IconButton.tsx';
import './display-menu.css';
import { noNativeTooltip } from './selectOptions.ts';

/** One labelled row of the menu: a question on the left, its control on the
 *  right. The shell owns the row; the caller owns the vocabulary. */
export interface DisplayRow {
  id: string;
  label: string;
  control: ReactNode;
}

export interface DisplayShellProps {
  rows: DisplayRow[];
  /** The columns this list can draw, and whether each is on. Empty hides the
   *  whole section rather than showing an empty heading. */
  fields?: { value: string; label: string; on: boolean }[];
  onToggleField?: (value: string) => void;
  /** How far from the default, for the trigger's badge. */
  changeCount: number;
  onReset: () => void;
  /** Two display buttons on one screen cannot both be called "Display". */
  label?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * HOW A LIST IS DRAWN, as distinct from which rows are in it.
 *
 * The chrome is here - the trigger with its badge, the popover, the row rhythm,
 * the field pills, the reset - and the vocabulary belongs to whoever opens it.
 * The issue queue groups by impact and hides issues; the tests list groups by
 * environment and has nothing to hide. Two menus that looked the same and
 * shared nothing would be the lookalike this system keeps deleting.
 *
 * Kept behind its own control rather than folded into the filter menu, because
 * none of it narrows the result set: putting "show hidden" in the filter badge
 * would make the badge count something the filter menu cannot account for.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function DisplayShell({ rows, fields, onToggleField, changeCount, onReset, label = 'Display' }: DisplayShellProps) {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="m-dm">
      <div className="m-dm__section">
        {rows.map((r) => (
          <label key={r.id} className="m-dm__row" htmlFor={r.id}>
            <span className="m-dm__label">{r.label}</span>
            {r.control}
          </label>
        ))}
      </div>

      {fields && fields.length > 0 && (
        <div className="m-dm__section">
          <p className="m-dm__heading">Columns</p>
          <div className="m-dm__pills">
            {fields.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`m-dm__pill${f.on ? ' is-on' : ''}`}
                aria-pressed={f.on}
                onClick={() => onToggleField?.(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {changeCount > 0 && (
        <div className="m-dm__foot">
          <Button type="text" size="small" onClick={onReset}>
            Reset to default
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" arrow={false} content={content}>
      <IconButton
        icon={<SlidersHorizontal size={15} />}
        label={label}
        count={changeCount}
        active={changeCount > 0}
        open={open}
      />
    </Popover>
  );
}

/** The ordering pair - a direction button and a key - which both lists have and
 *  neither should draw twice. */
export function SortControl<T extends string>({
  value,
  desc,
  choices,
  onValue,
  onDesc,
  id,
}: {
  value: T;
  desc: boolean;
  choices: readonly { value: T; label: string }[];
  onValue: (v: T) => void;
  onDesc: (d: boolean) => void;
  id: string;
}) {
  return (
    <span className="m-dm__pair">
      <Button
        size="small"
        aria-label={desc ? 'Sort ascending' : 'Sort descending'}
        onClick={() => onDesc(!desc)}
        icon={desc ? <ArrowDownWideNarrow size={13} /> : <ArrowUpNarrowWide size={13} />}
      />
      <Select<T>
        id={id}
        size="small"
        className="m-dm__select"
        value={value}
        onChange={onValue}
        options={noNativeTooltip(choices as { value: T; label: string }[])}
      />
    </span>
  );
}

export interface DisplayMenuProps {
  display: Display;
  onSet: <K extends keyof Display>(key: K, value: Display[K]) => void;
  onToggleField: (f: FieldKey) => void;
  onReset: () => void;
  /** How far from the default, for the trigger's badge. */
  changeCount: number;
  /** Fields this option cannot render, so it does not offer a dead pill. */
  unsupportedFields?: readonly FieldKey[];
}

/**
 * How the list is drawn, as distinct from which rows are in it.
 *
 * Kept behind its own control rather than folded into the filter menu, because
 * these do not narrow the result set. Putting "show hidden" in the filter badge
 * would make the badge count something the filter menu cannot account for, and
 * grouping and ordering are not filters in any sense.
 *
 * Three deliberate departures from the reference this is modelled on:
 *
 * 1. **No List / Board toggle.** There is no board. A control for a view that
 *    does not exist is a dead control, and shipping one to look complete is
 *    worse than the gap it hides.
 * 2. **Hidden issues is a three-way, not a switch.** A boolean cannot say "show
 *    me only the ones I hid", which is the question you have when auditing what
 *    the agent was told to ignore.
 * 3. **The field pills only list fields this option can draw.** A table has
 *    columns to toggle; a two-line row does not have all the same ones. Offering
 *    a pill that does nothing is the same defect as the board toggle.
 */
export function DisplayMenu({
  display,
  onSet,
  onToggleField,
  onReset,
  changeCount,
  unsupportedFields = [],
}: DisplayMenuProps) {
  const fields = FIELD_CHOICES.filter((f) => !unsupportedFields.includes(f.value));
  return (
    <DisplayShell
      changeCount={changeCount}
      onReset={onReset}
      fields={fields.map((f) => ({ value: f.value, label: f.label, on: display.fields.includes(f.value) }))}
      onToggleField={(v) => onToggleField(v as FieldKey)}
      rows={[
        {
          id: 'dm-group',
          label: 'Grouping',
          control: (
            <Select<GroupKey>
              id="dm-group"
              size="small"
              className="m-dm__select"
              value={display.group}
              onChange={(v) => onSet('group', v)}
              options={noNativeTooltip(GROUP_CHOICES)}
            />
          ),
        },
        {
          id: 'dm-sort',
          label: 'Ordering',
          control: (
            <SortControl<SortKey>
              id="dm-sort"
              value={display.sort}
              desc={display.sortDesc}
              choices={SORT_CHOICES}
              onValue={(v) => onSet('sort', v)}
              onDesc={(d) => onSet('sortDesc', d)}
            />
          ),
        },
        {
          id: 'dm-hidden',
          label: 'Hidden issues',
          control: (
            <Select<HiddenMode>
              id="dm-hidden"
              size="small"
              className="m-dm__select"
              value={display.hidden}
              onChange={(v) => onSet('hidden', v)}
              options={noNativeTooltip(HIDDEN_CHOICES)}
            />
          ),
        },
      ]}
    />
  );
}
