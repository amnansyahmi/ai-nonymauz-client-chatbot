'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppLanguage, ChecklistItem } from '../types';

type Priority = { className: string; label: string };

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
  getPriority: (item: ChecklistItem) => Priority;
  getStatus: (item: ChecklistItem) => 'not-started' | 'in-progress' | 'done';
  onToggle: () => void;
  onRemove: () => void;
  onUpdateStatus: (status: 'not-started' | 'in-progress' | 'done') => void;
  onUpdateText: (text: string) => void;
  onUpdateDeadline: (deadline: string) => void;
  onUpdateNote: (note: string) => void;
  onSelect?: () => void;
  onSchedule?: () => void;
  onLongPressSelect?: () => void;
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
  getPriority,
  getStatus,
  onToggle,
  onRemove,
  onUpdateStatus,
  onUpdateText,
  onUpdateDeadline,
  onUpdateNote,
  onSelect,
  onSchedule,
  onLongPressSelect,
  copyLabels
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

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
      className={`checklist-task-row ${item.completed ? 'done' : ''} priority-${priority.className}${isSelected ? ' is-selected' : ''}`}
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
            aria-checked={item.completed}
            aria-label={`${item.completed ? 'Mark incomplete' : 'Mark done'}: ${getItemText(item)}`}
            onClick={onToggle}
          >
            <span className="visually-hidden">{item.completed ? 'Done' : 'Not done'}</span>
          </button>
        )}
        <span className="checklist-task-check" aria-hidden="true" />
        <span className="checklist-task-copy">
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
                role="button"
                tabIndex={item.completed ? -1 : 0}
                title={language === 'ms' ? 'Klik untuk edit' : 'Click to edit'}
                onClick={startEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') startEdit(); }}
              >
                {getItemText(item)}
              </strong>
              {!item.completed ? (
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
          {!compact && !isEditing && getItemText(item, otherLanguage) !== getItemText(item) ? (
            <small className="checklist-task-alt">{getItemText(item, otherLanguage)}</small>
          ) : null}
          <small className="checklist-task-meta">
            {getItemPhase(item) || copyLabels.custom}
            {' · '}
            <button
              type="button"
              className="checklist-date-trigger"
              onClick={() => setDatePickerOpen((v) => !v)}
              title={language === 'ms' ? 'Tukar tarikh' : 'Change deadline'}
            >
              {dueLabel}
            </button>
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
          {datePickerOpen ? (
            <input
              type="date"
              className="checklist-date-input"
              value={item.deadline || ''}
              onChange={(e) => {
                onUpdateDeadline(e.target.value);
                setDatePickerOpen(false);
              }}
              onBlur={() => setDatePickerOpen(false)}
            />
          ) : null}
          {item.note ? (
            <small className="checklist-note-preview" onClick={() => setNotesOpen(true)}>
              {item.note}
            </small>
          ) : null}
        </span>
      </div>

      <button
        type="button"
        className={`priority-chip ${priority.className}`}
        onClick={() => setDatePickerOpen((v) => !v)}
        title={
          language === 'ms'
            ? 'Keutamaan ikut tarikh akhir — klik untuk tukar tarikh'
            : 'Priority follows the deadline — click to change the date'
        }
      >
        {priority.label}
      </button>

      <div className="checklist-row-actions">
        <label className={`checklist-status-select status-${status}`}>
          <span className="visually-hidden">{language === 'ms' ? 'Status task' : 'Task status'}</span>
          <span className="checklist-status-dot" aria-hidden="true" />
          <select
            value={status}
            onChange={(e) => onUpdateStatus(e.target.value as 'not-started' | 'in-progress' | 'done')}
          >
            <option value="not-started">{copyLabels.notStarted}</option>
            <option value="in-progress">{copyLabels.inProgress}</option>
            <option value="done">{copyLabels.done}</option>
          </select>
        </label>
        <button
          type="button"
          className={`checklist-note-btn${item.note ? ' has-note' : ''}`}
          aria-label={language === 'ms' ? 'Nota' : 'Note'}
          title={language === 'ms' ? 'Tambah nota' : 'Add note'}
          onClick={() => {
            setNoteText(item.note || '');
            setNotesOpen((v) => !v);
          }}
        >
          <NoteIcon />
        </button>
        {!compact && onSchedule ? (
          <button type="button" className="checklist-schedule-btn" onClick={onSchedule}>
            {copyLabels.schedule}
          </button>
        ) : null}
        <button
          type="button"
          className="checklist-remove-btn"
          aria-label={`Remove ${item.text}`}
          title={copyLabels.remove}
          onClick={onRemove}
        >
          <TrashIcon />
        </button>
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
