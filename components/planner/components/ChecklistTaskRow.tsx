'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppLanguage, ChecklistItem } from '../types';
import DatePicker from '../../ui/DatePicker';

type Priority = { className: string; label: string };
type TaskStatus = 'not-started' | 'in-progress' | 'done';

// Minimalist tap-cycle: one control walks empty -> in-progress -> done -> empty.
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  'not-started': 'in-progress',
  'in-progress': 'done',
  done: 'not-started'
};

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h11l5 5v11a0 0 0 0 1 0 0H4z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h7M8 17h5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

type Props = {
  item: ChecklistItem;
  language: AppLanguage;
  otherLanguage: AppLanguage;
  compact?: boolean;
  majlisDate?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  getItemText: (item: ChecklistItem, lang?: AppLanguage) => string;
  getItemPhase: (item: ChecklistItem, lang?: AppLanguage) => string;
  /** Localized task-category label (empty string = no badge). */
  categoryLabel?: string;
  getPriority: (item: ChecklistItem) => Priority;
  getStatus: (item: ChecklistItem) => 'not-started' | 'in-progress' | 'done';
  onRemove: () => void;
  onUpdateStatus: (status: 'not-started' | 'in-progress' | 'done') => void;
  onUpdateText: (text: string) => void;
  onUpdateDeadline: (deadline: string) => void;
  onUpdateNote: (note: string) => void;
  isCardActive?: boolean;
  onSelect?: () => void;
  onSchedule?: () => void;
  onLongPressSelect?: () => void;
  onExpand?: () => void;
  copyLabels: {
    custom: string;
    notStarted: string;
    inProgress: string;
    done: string;
    remove: string;
    schedule: string;
    noDate: string;
    suggest: string;
    addNote: string;
    saveNote: string;
  };
};

function suggestDeadlineFromPhase(phase: string | undefined, majlisDate: string): string {
  const wedding = new Date(`${majlisDate}T00:00:00`);
  const p = (phase || '').toLowerCase();
  let offset = -30;
  if (/fasa 1|asas|foundation/i.test(p)) offset = -270;
  else if (/fasa 2|vendor utama|main vendor/i.test(p)) offset = -180;
  else if (/fasa 3|persediaan|preparation/i.test(p)) offset = -60;
  else if (/fasa 4|final/i.test(p)) offset = -14;
  const d = new Date(wedding);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function ChecklistTaskRow({
  item,
  language,
  otherLanguage,
  compact,
  majlisDate,
  isSelectable,
  isSelected,
  getItemText,
  getItemPhase,
  categoryLabel,
  getPriority,
  getStatus,
  onRemove,
  onUpdateStatus,
  onUpdateText,
  onUpdateDeadline,
  onUpdateNote,
  isCardActive,
  onSelect,
  onSchedule,
  onLongPressSelect,
  onExpand,
  copyLabels
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');
  const [showActions, setShowActions] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const actionsPopupRef = useRef<HTMLDivElement>(null);

  const closeActions = useCallback(() => setShowActions(false), []);

  useEffect(() => {
    if (!showActions) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      if (actionsPopupRef.current && !actionsPopupRef.current.contains(e.target as Node)) {
        closeActions();
      }
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [showActions, closeActions]);

  function clearLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }

  function handleLongPressStart(e: React.PointerEvent) {
    if (!onLongPressSelect || isSelectable || isEditing) return;
    if (e.pointerType === 'mouse') return; // long-press is a touch affordance
    longPressStartRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      onLongPressSelect?.();
      clearLongPress();
    }, 450);
  }

  function handleLongPressMove(e: React.PointerEvent) {
    const start = longPressStartRef.current;
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
      clearLongPress();
    }
  }

  useEffect(() => clearLongPress, []);

  const priority = getPriority(item);
  const status = getStatus(item);

  const dueLabel = item.deadline
    ? `${language === 'ms' ? 'Tarikh akhir: ' : 'Due '}${item.deadline}`
    : copyLabels.noDate;

  function startEdit() {
    if (item.completed) return;
    setEditText(getItemText(item));
    setIsEditing(true);
  }

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  function finishEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== getItemText(item)) onUpdateText(trimmed);
    setIsEditing(false);
  }

  function handleEditKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
    if (e.key === 'Escape') setIsEditing(false);
  }

  function saveNote() {
    onUpdateNote(noteText);
    setNotesOpen(false);
  }

  function handleSuggestDeadline() {
    if (!majlisDate) return;
    onUpdateDeadline(suggestDeadlineFromPhase(item.phase, majlisDate));
  }

  return (
    <li
      className={`checklist-task-row ${item.completed ? 'done' : ''} priority-${priority.className}${isSelected ? ' is-selected' : ''}${isCardActive ? ' is-card-active' : ''}`}
      onPointerDown={handleLongPressStart}
      onPointerMove={handleLongPressMove}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      <div className="checklist-task-main">
        {isSelectable ? (
          <button
            type="button"
            className="checklist-select-toggle"
            aria-label={isSelected ? 'Deselect' : 'Select'}
            aria-pressed={isSelected}
            onClick={onSelect}
          >
            <span className="checklist-select-box" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="checklist-task-toggle"
            role="checkbox"
            data-status={status}
            aria-checked={status === 'done' ? 'true' : status === 'in-progress' ? 'mixed' : 'false'}
            aria-label={`${
              status === 'done'
                ? language === 'ms' ? 'Selesai' : 'Done'
                : status === 'in-progress'
                  ? language === 'ms' ? 'Sedang diurus' : 'In progress'
                  : language === 'ms' ? 'Belum mula' : 'Not started'
            }: ${getItemText(item)}`}
            onClick={() => onUpdateStatus(NEXT_STATUS[status])}
          >
            <span className="visually-hidden">
              {status === 'done' ? 'Done' : status === 'in-progress' ? 'In progress' : 'Not done'}
            </span>
          </button>
        )}
        <span className="checklist-task-check" aria-hidden="true" />
        <span
          className="checklist-task-copy"
          onClick={!isEditing && onExpand ? onExpand : undefined}
          role={onExpand && !isEditing ? 'button' : undefined}
          tabIndex={onExpand && !isEditing ? 0 : undefined}
          onKeyDown={onExpand && !isEditing ? (e) => { if (e.key === 'Enter') onExpand(); } : undefined}
          style={onExpand && !isEditing ? { cursor: 'pointer' } : undefined}
        >
          {isEditing ? (
            <input
              ref={editInputRef}
              className="checklist-inline-edit"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={handleEditKey}
            />
          ) : (
            <span className="checklist-task-titlebar">
              <strong
                className="checklist-task-text"
                role={onExpand ? undefined : 'button'}
                tabIndex={item.completed || onExpand ? -1 : 0}
                title={onExpand ? undefined : (language === 'ms' ? 'Klik untuk edit' : 'Click to edit')}
                onClick={onExpand ? undefined : startEdit}
                onKeyDown={onExpand ? undefined : (e) => { if (e.key === 'Enter') startEdit(); }}
              >
                {getItemText(item)}
              </strong>
              {!item.completed && !onExpand ? (
                <button
                  type="button"
                  className="checklist-edit-btn"
                  aria-label={language === 'ms' ? 'Edit task' : 'Edit task'}
                  title={language === 'ms' ? 'Edit task' : 'Edit task'}
                  onClick={startEdit}
                >
                  <EditIcon />
                </button>
              ) : null}
            </span>
          )}
          {!isEditing && status === 'in-progress' && !item.completed ? (
            <span className="cl-task-inprogress" aria-label={language === 'ms' ? 'Sedang diurus' : 'In progress'}>
              <span className="cl-task-inprogress-dot" aria-hidden="true" />
              {language === 'ms' ? 'Sedang diurus' : 'In progress'}
            </span>
          ) : null}
          {!compact && !isEditing && getItemText(item, otherLanguage) !== getItemText(item) ? (
            <small className="checklist-task-alt">{getItemText(item, otherLanguage)}</small>
          ) : null}
          <small className="checklist-task-meta">
            {categoryLabel ? (
              <span className="checklist-category-badge">{categoryLabel}</span>
            ) : null}
            {getItemPhase(item) || copyLabels.custom}
            {' · '}
            <DatePicker
              variant="inline"
              value={item.deadline || ''}
              onChange={(v) => onUpdateDeadline(v)}
              language={language}
              triggerLabel={dueLabel}
              ariaLabel={language === 'ms' ? 'Tukar tarikh akhir' : 'Change deadline'}
            />
            {!item.deadline && majlisDate ? (
              <button
                type="button"
                className="checklist-suggest-btn"
                onClick={handleSuggestDeadline}
                title={language === 'ms' ? 'Cadangkan tarikh berdasarkan fasa' : 'Suggest deadline based on phase'}
              >
                <CalendarIcon />
                {copyLabels.suggest}
              </button>
            ) : null}
          </small>
          {item.note ? (
            <small className="checklist-note-preview" onClick={() => setNotesOpen(true)}>
              {item.note}
            </small>
          ) : null}
        </span>
      </div>

      <span
        className={`priority-chip ${priority.className}`}
        title={
          language === 'ms'
            ? 'Keutamaan ikut tarikh akhir'
            : 'Priority follows the deadline'
        }
      >
        {priority.label}
      </span>

      <div className="checklist-row-actions" ref={actionsPopupRef}>
        <button
          type="button"
          className={`checklist-actions-trigger${showActions ? ' is-open' : ''}${item.note ? ' has-note' : ''}`}
          aria-label={language === 'ms' ? 'Lagi tindakan' : 'More actions'}
          aria-expanded={showActions}
          onClick={(e) => { e.stopPropagation(); setShowActions((v) => !v); }}
        >
          <span aria-hidden="true">···</span>
          {item.note ? <span className="checklist-note-dot" aria-hidden="true" /> : null}
        </button>
        {showActions ? (
          <div className="checklist-actions-popup" role="menu">
            <button
              type="button"
              role="menuitem"
              className={`checklist-note-btn${item.note ? ' has-note' : ''}`}
              onClick={() => { setNoteText(item.note || ''); setNotesOpen((v) => !v); closeActions(); }}
            >
              <NoteIcon />
              {item.note ? (language === 'ms' ? 'Edit nota' : 'Edit note') : (language === 'ms' ? 'Tambah nota' : 'Add note')}
            </button>
            {!compact && onSchedule ? (
              <button
                type="button"
                role="menuitem"
                className="checklist-schedule-btn"
                onClick={() => { onSchedule(); closeActions(); }}
              >
                <CalendarIcon />
                {copyLabels.schedule}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="checklist-remove-btn"
              onClick={() => { onRemove(); closeActions(); }}
            >
              <TrashIcon />
              {copyLabels.remove}
            </button>
          </div>
        ) : null}
      </div>

      {notesOpen ? (
        <div className="checklist-note-area">
          <textarea
            ref={noteRef}
            className="checklist-note-input"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={language === 'ms' ? 'Tambah nota untuk task ini...' : 'Add a note for this task...'}
            rows={3}
            autoFocus
          />
          <div className="checklist-note-actions">
            <button type="button" className="checklist-note-save" onClick={saveNote}>
              {copyLabels.saveNote}
            </button>
            <button type="button" onClick={() => setNotesOpen(false)}>
              {language === 'ms' ? 'Batal' : 'Cancel'}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
