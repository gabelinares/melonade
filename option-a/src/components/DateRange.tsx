import { useRef, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CalendarRange, ChevronDown } from 'lucide-react';
import {
  RANGE_PRESETS,
  type DateRangeValue,
  isCustomComplete,
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
 * so the only way to find out was to count rows. Picking it now reveals a real
 * two-ended picker, and until BOTH ends are chosen the list keeps every row -
 * see `withinRange`. Half a range is an answer in progress, and emptying a
 * list while somebody is mid-decision is the least helpful moment to do it.
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

  const onRange = (v: null | (Dayjs | null)[]) => {
    const from = v?.[0]?.valueOf();
    const to = v?.[1]?.valueOf();
    onChange({ preset: 'custom', from, to });
    if (from != null && to != null) setOpen(false);
  };

  const asDayjs: [Dayjs | null, Dayjs | null] = [
    value.from != null ? dayjs(value.from) : null,
    value.to != null ? dayjs(value.to) : null,
  ];

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
                <DatePicker.RangePicker
                  size="small"
                  autoFocus
                  allowEmpty={[true, true]}
                  value={asDayjs}
                  onChange={onRange}
                  format="MMM D, YYYY"
                  getPopupContainer={() => body.current ?? document.body}
                />
                {!isCustomComplete(value) && (
                  <p className="m-dr__hint">Both ends, and the list narrows.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
