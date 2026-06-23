'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppLanguage, ChecklistItem } from '../types';
import DatePicker from '../../ui/DatePicker';

type TaskStatus = 'not-started' | 'in-progress' | 'done';
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  'not-started': 'in-progress',
  'in-progress': 'done',
  done: 'not-started',
};

type Props = {
  item: ChecklistItem;
  language: AppLanguage;
  categoryLabel?: string;
  majlisDate?: string;
  getItemText: (item: ChecklistItem, lang?: AppLanguage) => string;
  getItemPhase: (item: ChecklistItem, lang?: AppLanguage) => string;
  getStatus: (item: ChecklistItem) => TaskStatus;
  onClose: () => void;
  onRemove: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateText: (text: string) => void;
  onUpdateDeadline: (deadline: string) => void;
  onUpdateNote: (note: string) => void;
  onSchedule?: () => void;
};

const STATUS_LABELS: Record<AppLanguage, Record<TaskStatus, string>> = {
  ms: { 'not-started': 'Belum Mula', 'in-progress': 'Sedang Diurus', done: 'Selesai' },
  en: { 'not-started': 'Not Started', 'in-progress': 'In Progress', done: 'Done' },
};

export default function ChecklistTaskSheet({
  item, language, categoryLabel, majlisDate,
  getItemText, getItemPhase, getStatus,
  onClose, onRemove, onUpdateStatus, onUpdateText, onUpdateDeadline, onUpdateNote, onSchedule,
}: Props) {
  const status = getStatus(item);
  const title = getItemText(item);
  const phase = getItemPhase(item);

  const [noteText, setNoteText] = useState(item.note || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when entering edit mode
  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  // Close on backdrop tap
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function finishEditTitle() {
    const t = editTitle.trim();
    if (t && t !== title) onUpdateText(t);
    setIsEditingTitle(false);
  }

  function saveNote() {
    onUpdateNote(noteText);
  }

  const statusLabel = STATUS_LABELS[language][status];

  return (
    <div className="cl-sheet-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className="cl-sheet" ref={sheetRef}>
        {/* Handle bar */}
        <div className="cl-sheet__handle" aria-hidden="true" />

        {/* Header */}
        <div className="cl-sheet__header">
          <div className="cl-sheet__breadcrumb">
            {categoryLabel ? <span>{categoryLabel}</span> : null}
            {categoryLabel && phase ? <span aria-hidden="true">›</span> : null}
            {phase ? <span>{phase}</span> : null}
          </div>
          <button type="button" className="cl-sheet__close" aria-label="Tutup" onClick={onClose}>×</button>
        </div>

        {/* Title */}
        <div className="cl-sheet__title-row">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="cl-sheet__title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={finishEditTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') finishEditTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
            />
          ) : (
            <h2 className="cl-sheet__title" onClick={() => { setEditTitle(title); setIsEditingTitle(true); }}>
              {title}
            </h2>
          )}
        </div>

        {/* Status pill */}
        <div className="cl-sheet__section">
          <button
            type="button"
            className={`cl-sheet__status-pill status-${status}`}
            onClick={() => onUpdateStatus(NEXT_STATUS[status])}
          >
            <span className="cl-sheet__status-dot" aria-hidden="true" />
            {statusLabel}
          </button>
        </div>

        {/* Deadline */}
        <div className="cl-sheet__section cl-sheet__section--row">
          <span className="cl-sheet__label">{language === 'ms' ? 'Tarikh akhir' : 'Deadline'}</span>
          <DatePicker
            variant="inline"
            value={item.deadline || ''}
            onChange={onUpdateDeadline}
            language={language}
            triggerLabel={item.deadline || (language === 'ms' ? 'Tiada tarikh' : 'No date')}
            ariaLabel={language === 'ms' ? 'Tukar tarikh akhir' : 'Change deadline'}
          />
        </div>

        {/* Note */}
        <div className="cl-sheet__section">
          <span className="cl-sheet__label">{language === 'ms' ? 'Nota' : 'Note'}</span>
          <textarea
            className="cl-sheet__note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={saveNote}
            placeholder={language === 'ms' ? 'Tambah nota...' : 'Add a note...'}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="cl-sheet__actions">
          {onSchedule ? (
            <button type="button" className="cl-sheet__action-btn" onClick={() => { onSchedule(); onClose(); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {language === 'ms' ? 'Jadikan appointment' : 'Add to calendar'}
            </button>
          ) : null}
          <button type="button" className="cl-sheet__action-btn cl-sheet__action-btn--danger" onClick={() => { onRemove(); onClose(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            {language === 'ms' ? 'Padam' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
