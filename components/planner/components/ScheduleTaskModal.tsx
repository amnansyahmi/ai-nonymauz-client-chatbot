'use client';

import { useEffect, useState } from 'react';
import type { AppLanguage, Appointment, ChecklistItem } from '../types';

type Phase = 'form' | 'phone-prompt';

type Props = {
  item: ChecklistItem;
  language: AppLanguage;
  getItemText: (item: ChecklistItem) => string;
  onConfirm: (appointment: Appointment) => void;
  onAddToPhone: (appointment: Appointment) => void;
  onClose: () => void;
};

export default function ScheduleTaskModal({ item, language, getItemText, onConfirm, onAddToPhone, onClose }: Props) {
  const isMs = language === 'ms';
  const [title, setTitle] = useState(() => getItemText(item));
  const [date, setDate] = useState(item.deadline || '');
  const [time, setTime] = useState('10:00');
  const [phase, setPhase] = useState<Phase>('form');
  const [saved, setSaved] = useState<Appointment | null>(null);

  // Lock body scroll on mount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleAdd() {
    const apt: Appointment = {
      id: `sched-${Date.now()}`,
      title: title.trim() || getItemText(item),
      date,
      time,
      status: 'planned',
      note: '',
    };
    onConfirm(apt);
    setSaved(apt);
    setPhase('phone-prompt');
  }

  return (
    <div className="sched-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="sched-modal">
        {/* Header */}
        <div className="sched-modal__header">
          <span className="sched-modal__title">
            {phase === 'form'
              ? (isMs ? 'Jadikan Appointment' : 'Schedule Appointment')
              : (isMs ? 'Tambah ke Telefon?' : 'Add to Phone?')}
          </span>
          <button type="button" className="sched-modal__close" aria-label="Tutup" onClick={onClose}>×</button>
        </div>

        {phase === 'form' ? (
          <div className="sched-modal__body">
            {/* Title */}
            <div className="sched-modal__field">
              <label className="sched-modal__label">{isMs ? 'Tajuk' : 'Title'}</label>
              <input
                className="sched-modal__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getItemText(item)}
              />
            </div>

            {/* Date */}
            <div className="sched-modal__field">
              <label className="sched-modal__label">{isMs ? 'Tarikh' : 'Date'}</label>
              <input
                className="sched-modal__input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="sched-modal__field">
              <label className="sched-modal__label">{isMs ? 'Masa' : 'Time'}</label>
              <input
                className="sched-modal__input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div className="sched-modal__actions">
              <button type="button" className="sched-modal__btn sched-modal__btn--ghost" onClick={onClose}>
                {isMs ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                className="sched-modal__btn sched-modal__btn--primary"
                onClick={handleAdd}
                disabled={!date}
              >
                {isMs ? 'Tambah ke Kalendar' : 'Add to Calendar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="sched-modal__body">
            {/* Success state */}
            <div className="sched-modal__success">
              <span className="sched-modal__success-icon" aria-hidden="true">✓</span>
              <p className="sched-modal__success-text">
                {isMs
                  ? `"${saved?.title}" telah ditambah ke kalendar majlis.`
                  : `"${saved?.title}" added to your planner calendar.`}
              </p>
            </div>

            <p className="sched-modal__phone-q">
              {isMs
                ? 'Nak tambah ke kalendar telefon juga?'
                : 'Add to your phone calendar too?'}
            </p>

            <div className="sched-modal__actions">
              <button type="button" className="sched-modal__btn sched-modal__btn--ghost" onClick={onClose}>
                {isMs ? 'Tidak, terima kasih' : 'No thanks'}
              </button>
              <button
                type="button"
                className="sched-modal__btn sched-modal__btn--primary"
                onClick={() => { if (saved) onAddToPhone(saved); onClose(); }}
              >
                {isMs ? 'Ya, muat turun' : 'Yes, download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
