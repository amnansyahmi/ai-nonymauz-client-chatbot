'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Lang = 'ms' | 'en';

type DatePickerProps = {
  /** Value as 'YYYY-MM-DD' (or '' when unset). */
  value: string;
  onChange: (value: string) => void;
  language?: Lang;
  /** Earliest selectable date, 'YYYY-MM-DD'. */
  min?: string;
  /** Latest selectable date, 'YYYY-MM-DD'. */
  max?: string;
  /** Text shown on the trigger when there is no value. */
  placeholder?: string;
  ariaLabel?: string;
  /** Extra class on the trigger button. */
  triggerClassName?: string;
  /** Override the trigger's displayed text (e.g. a checklist "due" label). */
  triggerLabel?: string;
  /** Popover horizontal alignment relative to the trigger. */
  align?: 'left' | 'right';
  /** 'box' = full bordered field (default); 'inline' = bare inline text trigger. */
  variant?: 'box' | 'inline';
};

const POP_WIDTH = 304;
const POP_EST_HEIGHT = 372;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-time 'YYYY-MM-DD' (avoids the UTC day-shift of toISOString). */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function CalendarGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

export default function DatePicker({
  value,
  onChange,
  language = 'ms',
  min,
  max,
  placeholder,
  ariaLabel,
  triggerClassName,
  triggerLabel,
  align = 'left',
  variant = 'box'
}: DatePickerProps) {
  const isMs = language === 'ms';
  const locale = isMs ? 'ms-MY' : 'en-MY';
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'days' | 'months'>('days');
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const selected = useMemo(() => parseYmd(value), [value]);
  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = parseYmd(value) ?? parseYmd(min ?? '') ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    let left = align === 'right' ? r.right - POP_WIDTH : r.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - POP_WIDTH - margin));
    let top = r.bottom + 8;
    // Flip above the trigger when there isn't room below.
    if (top + POP_EST_HEIGHT > window.innerHeight && r.top - 8 - POP_EST_HEIGHT > 0) {
      top = r.top - 8 - POP_EST_HEIGHT;
    }
    setCoords({ top, left });
  }, [align]);

  // When opening, anchor the view + compute position.
  useLayoutEffect(() => {
    if (!open) return;
    const base = parseYmd(value) ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setMode('days');
    reposition();
  }, [open]);

  // Reposition on scroll/resize; close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onScrollResize() {
      reposition();
    }
    function onPointer(event: MouseEvent) {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, reposition]);

  const weekdays = useMemo(() => {
    const ref = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const leading = (first.getDay() + 6) % 7; // 0 = Monday
    const start = new Date(year, month, 1 - leading);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [viewMonth]);

  const monthsGrid = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) =>
      new Date(viewMonth.getFullYear(), m, 1).toLocaleDateString(locale, { month: 'short' })
    );
  }, [locale, viewMonth]);

  const isDisabled = useCallback(
    (key: string): boolean => {
      if (min && key < min) return true;
      if (max && key > max) return true;
      return false;
    },
    [min, max]
  );

  function pick(d: Date) {
    const key = ymd(d);
    if (isDisabled(key)) return;
    onChange(key);
    setOpen(false);
  }

  const triggerText =
    triggerLabel ??
    (selected
      ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      : placeholder ?? (isMs ? 'Pilih tarikh' : 'Pick a date'));

  const monthTitle = viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const popover = (
    <div
      ref={popRef}
      className="mm-datepicker__pop"
      id={popoverId}
      role="dialog"
      aria-label={ariaLabel ?? (isMs ? 'Pilih tarikh' : 'Choose a date')}
      style={{ top: coords?.top ?? -9999, left: coords?.left ?? -9999 }}
    >
      <div className="mm-datepicker__head">
        <button
          type="button"
          className="mm-datepicker__nav"
          aria-label={isMs ? 'Sebelum' : 'Previous'}
          onClick={() =>
            mode === 'days'
              ? setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              : setViewMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))
          }
        >
          <Chevron dir="left" />
        </button>
        <button type="button" className="mm-datepicker__title" onClick={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}>
          {mode === 'days' ? monthTitle : viewMonth.getFullYear()}
        </button>
        <button
          type="button"
          className="mm-datepicker__nav"
          aria-label={isMs ? 'Seterusnya' : 'Next'}
          onClick={() =>
            mode === 'days'
              ? setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              : setViewMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))
          }
        >
          <Chevron dir="right" />
        </button>
      </div>

      {mode === 'days' ? (
        <>
          <div className="mm-datepicker__weekdays">
            {weekdays.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="mm-datepicker__grid">
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const disabled = isDisabled(key);
              const isSelected = selected != null && key === ymd(selected);
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={['mm-datepicker__day', inMonth ? '' : 'is-muted', isSelected ? 'is-selected' : '', isToday ? 'is-today' : '']
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  onClick={() => pick(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mm-datepicker__months">
          {monthsGrid.map((label, m) => {
            const isCurrent = selected != null && selected.getFullYear() === viewMonth.getFullYear() && selected.getMonth() === m;
            return (
              <button
                key={m}
                type="button"
                className={`mm-datepicker__month${isCurrent ? ' is-selected' : ''}`}
                onClick={() => {
                  setViewMonth((mm) => new Date(mm.getFullYear(), m, 1));
                  setMode('days');
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mm-datepicker__foot">
        <button
          type="button"
          className="mm-datepicker__foot-btn"
          onClick={() => {
            if (!isDisabled(todayKey)) {
              onChange(todayKey);
              setOpen(false);
            } else {
              setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setMode('days');
            }
          }}
        >
          {isMs ? 'Hari ini' : 'Today'}
        </button>
        {value ? (
          <button
            type="button"
            className="mm-datepicker__foot-btn mm-datepicker__foot-btn--clear"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            {isMs ? 'Kosongkan' : 'Clear'}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <span className={`mm-datepicker${variant === 'inline' ? ' mm-datepicker--inline' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`mm-datepicker__trigger${variant === 'inline' ? ' mm-datepicker__trigger--inline' : ''}${triggerClassName ? ` ${triggerClassName}` : ''}${value ? '' : ' is-empty'}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarGlyph />
        <span className="mm-datepicker__value">{triggerText}</span>
      </button>
      {open && mounted ? createPortal(popover, document.body) : null}
    </span>
  );
}
