import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const fields = FIELD_CHOICES.filter((f) => !unsupportedFields.includes(f.value));

  const content = (
    <div className="m-dm">
      <div className="m-dm__section">
        <label className="m-dm__row" htmlFor="dm-group">
          <span className="m-dm__label">Grouping</span>
          <Select<GroupKey>
            id="dm-group"
            size="small"
            className="m-dm__select"
            value={display.group}
            onChange={(v) => onSet('group', v)}
            options={GROUP_CHOICES}
          />
        </label>

        <label className="m-dm__row" htmlFor="dm-sort">
          <span className="m-dm__label">Ordering</span>
          <span className="m-dm__pair">
            <Button
              size="small"
              aria-label={display.sortDesc ? 'Sort ascending' : 'Sort descending'}
              onClick={() => onSet('sortDesc', !display.sortDesc)}
              icon={
                display.sortDesc ? (
                  <ArrowDownWideNarrow size={13} />
                ) : (
                  <ArrowUpNarrowWide size={13} />
                )
              }
            />
            <Select<SortKey>
              id="dm-sort"
              size="small"
              className="m-dm__select"
              value={display.sort}
              onChange={(v) => onSet('sort', v)}
              options={SORT_CHOICES}
            />
          </span>
        </label>

        <label className="m-dm__row" htmlFor="dm-hidden">
          <span className="m-dm__label">Hidden issues</span>
          <Select<HiddenMode>
            id="dm-hidden"
            size="small"
            className="m-dm__select"
            value={display.hidden}
            onChange={(v) => onSet('hidden', v)}
            options={HIDDEN_CHOICES}
          />
        </label>
      </div>

      <div className="m-dm__section">
        <p className="m-dm__heading">Fields</p>
        <div className="m-dm__pills">
          {fields.map((f) => {
            const on = display.fields.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                className={`m-dm__pill${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => onToggleField(f.value)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

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
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      content={content}
    >
      <IconButton
        icon={<SlidersHorizontal size={15} />}
        label="Display"
        count={changeCount}
        active={changeCount > 0}
        open={open}
      />
    </Popover>
  );
}
