'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppLanguage, ChecklistItem } from '../types';

type Priority = { className: string; label: string };

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
  copyLabels: {
    custom: string;
    notStarted: string;
    inProgress: string;
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
  copyLabels
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const priority = getPriority(item);
  const status = getStatus(item);

  const dueLabel = item.deadline
    ? `Due ${item.deadline}`
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
    <li className={`checklist-task-row ${item.completed ? 'done' : ''} priority-${priority.className}${isSelected ? ' is-selected' : ''}`}>
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
              autoFocus
            />
          ) : null}
          {item.note ? (
            <small className="checklist-note-preview" onClick={() => setNotesOpen(true)}>
              {item.note}
            </small>
          ) : null}
        </span>
      </div>

      <span className={`priority-chip ${priority.className}`}>{priority.label}</span>

      <div className="checklist-row-actions">
        {status !== 'done' ? (
          <button
            type="button"
            onClick={() => onUpdateStatus(status === 'in-progress' ? 'not-started' : 'in-progress')}
          >
            {status === 'in-progress' ? copyLabels.notStarted : copyLabels.inProgress}
          </button>
        ) : null}
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
          {item.note ? '📝' : '✏️'}
        </button>
        {!compact && onSchedule ? (
          <button type="button" onClick={onSchedule}>
            {copyLabels.schedule}
          </button>
        ) : null}
        <button type="button" aria-label={`Remove ${item.text}`} onClick={onRemove}>
          {copyLabels.remove}
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
