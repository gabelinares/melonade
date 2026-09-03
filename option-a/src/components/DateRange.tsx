import { useRef, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CalendarRange, ChevronDown } from 'lucide-react';
import {
  RANGE_PRESETS,
  type DateRangeValue,
  rangeIsDefault,
  rangeLabel,
} from '@shared/date-range.ts';
import { CheckRow } from './CheckRow.tsx';
import './date-range.css';

export interface DateRangeProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  /** What the window is measured on, in the page's own words: "Last seen",
   *  "Started", "Created". Printed at the top of the menu and used as the
   *  control's accessible name. */
  field: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE DATE WINDOW, one control for every list.
 *
 * ── IT SHOWS ITS VALUE, WHICH IS WHY IT IS NOT AN ICON ────────────────────
 * Display and Filters sit beside it as icon-only buttons, and they can: both
 * are questions you opened, answered and closed, and both carry a badge when
 * they hold something. A date window is different in kind - every list is
 * always inside one, there is no "off", and the window silently decides what
 * the count at the bottom of the page means. A control that is always doing
 * something has to always say what it is doing, so this one prints its own
 * value and takes the width that costs.
 *
 * ── THE MENU NAMES THE FIELD ──────────────────────────────────────────────
 * "Past 30 days" of WHAT is a real question and it has four different answers
 * in this app: a session's start, an issue's last sighting, a run's execution,
 * an audit's creation. The page passes that word in and the menu prints it, so
 * the same control can mean four things without any of them being a guess.
 *
 * ── CUSTOM IS A REAL RANGE ────────────────────────────────────────────────
 * ⚠ It used to be a preset that quietly applied ninety days. A control that
 * lies is worse than one that is missing: nothing on screen contradicted it,
 * so the only way to find out was to count rows. Picking it now reveals two
 * date fields, and until BOTH are chosen the list keeps every row - see
 * `withinRange`. Half a range is an answer in progress, and emptying a list
 * while somebody is mid-decision is the least helpful moment to do it.
 *
 * ⚠ TWO FIELDS RATHER THAN A RANGE PICKER, and the reasoning is at `onFrom`.
 * There is no hint under them any more either: "Both ends, and the list
 * narrows" was explaining a control that now explains itself - one empty field
 * is the whole message, and the start field opens the end field the moment it
 * is filled.
 *
 * ⚠ The picker's own panel is rendered INSIDE this popover's DOM node. Left in
 * the body it is "outside" as far as the popover's click-away is concerned, so
 * the first click on a date closed the menu the picker lives in.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function DateRange({ value, onChange, field }: DateRangeProps) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  const custom = value.preset === 'custom';
  const active = !rangeIsDefault(value);

  const pick = (preset: (typeof RANGE_PRESETS)[number]['value']) => {
    onChange({ preset });
    setOpen(false);
  };

  const pickCustom = () => onChange({ preset: 'custom', from: value.from, to: value.to });

  /* ⚠ TWO PICKERS, NOT A RANGE PICKER (2026-09-04). antd's `RangePicker` was
     four separate complaints from Gabriel in one screenshot: the two fields and
     the arrow do not fit a menu this narrow, so both dates truncate to "Oct
     13, 2(" and "Start da…"; the start field read EMPTY after a date had been
     chosen; the selection reset on its own; and moving the panel to months or
     years broke it outright.

     All four are the same thing - a RangePicker is one control holding a pair,
     with its own idea of which end you are editing, its own hover preview and
     its own panel state. None of that is wanted here. A window is two dates,
     and two dates are two fields: each holds one value, each is full width so
     it fits, and neither can reset the other.

     The one thing the pair does keep is the ORDER: picking a start opens the
     end, so the common case is still two clicks and no aiming. */
  const [endOpen, setEndOpen] = useState(false);

  const onFrom = (d: Dayjs | null) => {
    const from = d?.valueOf();
    /* A start after the end would be a window with nothing in it. Rather than
       refuse the click, keep the date the person just chose and drop the other
       end - they are clearly re-picking from here. */
    const to = from != null && value.to != null && value.to < from ? undefined : value.to;
    onChange({ preset: 'custom', from, to });
    if (from != null && to == null) setEndOpen(true);
    else if (from != null && to != null) setOpen(false);
  };

  const onTo = (d: Dayjs | null) => {
    const to = d?.valueOf();
    onChange({ preset: 'custom', from: value.from, to });
    setEndOpen(false);
    if (to != null && value.from != null) setOpen(false);
  };

  const fromDay = value.from != null ? dayjs(value.from) : null;
  const toDay = value.to != null ? dayjs(value.to) : null;
  /* Nothing recorded in the future, so nothing to ask for there. */
  const future = (d: Dayjs) => d.isAfter(dayjs(), 'day');

  return (
    /* ⚠ ESCAPE CLOSES IT. A menu that traps you until you find somewhere
       harmless to click is a menu, not a dropdown - and the picker inside this
       one swallows its own Escape first, which is correct: the calendar closes,
       then the menu. */
    <div
      className="m-dr"
      ref={body}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`m-dr__trigger${active ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={`${field}: ${rangeLabel(value)}`}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarRange size={14} aria-hidden="true" />
        <span className="m-dr__value">{rangeLabel(value)}</span>
        <ChevronDown size={13} className="m-dr__caret" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* A plain click-away rather than a Popover. The picker's panel has to
              live inside this element for the click-away to leave it alone, and
              owning both makes that one line instead of a container override. */}
          <div className="m-dr__scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="m-dr__menu" role="menu">
            <p className="m-dr__field">{field}</p>
            {RANGE_PRESETS.map((p) => (
              <CheckRow key={p.value} single on={value.preset === p.value} onToggle={() => pick(p.value)}>
                {p.label}
              </CheckRow>
            ))}
            <div className="m-dr__rule" />
            <CheckRow single on={custom} onToggle={pickCustom}>
              Custom range
            </CheckRow>
            {custom && (
              <div className="m-dr__picker">
                <DatePicker
                  size="small"
                  autoFocus
                  placeholder="Start date"
                  value={fromDay}
                  onChange={onFrom}
                  format="MMM D, YYYY"
                  /* Never past the end, and never in the future. */
                  disabledDate={(d) => future(d) || (toDay != null && d.isAfter(toDay, 'day'))}
                  getPopupContainer={() => body.current ?? document.body}
                />
                <DatePicker
                  size="small"
                  placeholder="End date"
                  value={toDay}
                  onChange={onTo}
                  /* ⚠ CONTROLLED, so picking a start can open it. That is the
                     whole of what the range picker was doing for us that two
                     fields do not do for free, and it is four lines. */
                  open={endOpen}
                  onOpenChange={setEndOpen}
                  format="MMM D, YYYY"
                  disabledDate={(d) => future(d) || (fromDay != null && d.isBefore(fromDay, 'day'))}
                  getPopupContainer={() => body.current ?? document.body}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
