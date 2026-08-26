import { useState } from 'react';
import { Button, Popover, Select } from '@mantine/core';
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
  changeCount: number;
  unsupportedFields?: readonly FieldKey[];
}

/**
 * How the queue is drawn, as distinct from which rows are in it.
 *
 * Behind its own control rather than folded into the filter menu, because none of
 * these narrows the result set. Putting "hidden issues" in the filter badge would
 * make the badge count something the filter menu cannot account for, and grouping
 * and ordering are not filters in any sense.
 *
 * Three deliberate departures from the reference this is modelled on:
 *
 * 1. **No List / Board toggle.** There is no board. A control for a view that
 *    does not exist is a dead control, and shipping one to look complete is worse
 *    than the gap it hides.
 * 2. **Hidden issues is a three-way, not a switch.** A boolean cannot say "show
 *    me only the ones I hid", which is the question you have when auditing what
 *    the agent was told to ignore.
 * 3. **Only fields this option can draw are offered.** A two-line row has
 *    different slots from a table's columns, and a pill that does nothing is the
 *    same defect as the board toggle.
 *
 * Grouping matters more here than in the denser option: this list is a queue with
 * sticky band headers, so the grouping choice changes what the headers say while
 * you scroll rather than merely re-sorting rows.
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

  return (
    <Popover opened={open} onChange={setOpen} position="bottom-end" width={296}>
      <Popover.Target>
        <IconButton
          icon={<SlidersHorizontal size={15} />}
          label="Display"
          count={changeCount}
          active={changeCount > 0}
          open={open}
          onClick={() => setOpen((o) => !o)}
        />
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <div className="b-dm">
          <div className="b-dm__section">
            <div className="b-dm__row">
              <span className="b-dm__label">Grouping</span>
              <Select
                size="xs"
                className="b-dm__select"
                value={display.group}
                onChange={(v) => v && onSet('group', v as GroupKey)}
                data={GROUP_CHOICES}
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
                aria-label="Grouping"
              />
            </div>

            <div className="b-dm__row">
              <span className="b-dm__label">Ordering</span>
              {/* The direction sits AFTER the field it applies to and the pair
                  is exactly as wide as the three selects around it, so all four
                  controls end on one line. It used to lead the row from the
                  left, which put one select's left edge 40px in from the other
                  two and made a column of three read as a column of two and a
                  half. */}
              <span className="b-dm__pair">
                <Select
                  size="xs"
                  className="b-dm__select b-dm__select--short"
                  value={display.sort}
                  onChange={(v) => v && onSet('sort', v as SortKey)}
                  data={SORT_CHOICES}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: false }}
                  aria-label="Ordering"
                />
                <IconButton
                  icon={
                    display.sortDesc ? (
                      <ArrowDownWideNarrow size={14} />
                    ) : (
                      <ArrowUpNarrowWide size={14} />
                    )
                  }
                  label={display.sortDesc ? 'Sort ascending' : 'Sort descending'}
                  onClick={() => onSet('sortDesc', !display.sortDesc)}
                />
              </span>
            </div>

            <div className="b-dm__row">
              <span className="b-dm__label">Hidden issues</span>
              <Select
                size="xs"
                className="b-dm__select"
                value={display.hidden}
                onChange={(v) => v && onSet('hidden', v as HiddenMode)}
                data={HIDDEN_CHOICES}
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
                aria-label="Hidden issues"
              />
            </div>
          </div>

          <div className="b-dm__section">
            <p className="m-label">Fields</p>
            <div className="b-dm__pills">
              {fields.map((f) => {
                const on = display.fields.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    className={`b-dm__pill${on ? ' is-on' : ''}`}
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
            <div className="b-dm__foot">
              <Button variant="subtle" color="gray" size="compact-xs" onClick={onReset}>
                Reset to default
              </Button>
            </div>
          )}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
