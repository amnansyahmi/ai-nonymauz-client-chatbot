'use client';

import type { ConversationNode } from '@/lib/ai/branches';

type BranchNavigatorProps = {
  siblings: ConversationNode[];
  activeId: string | null;
  language?: 'ms' | 'en';
  onPick: (node: ConversationNode) => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  canRegenerate?: boolean;
  canEdit?: boolean;
};

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3.7-7.3M21 4v5h-5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16v4ZM14 6l4 4" />
    </svg>
  );
}

export default function BranchNavigator({
  siblings,
  activeId,
  language = 'ms',
  onPick,
  onRegenerate,
  onEdit,
  canRegenerate,
  canEdit
}: BranchNavigatorProps) {
  if (siblings.length === 0 && !canRegenerate && !canEdit) return null;
  const isMs = language === 'ms';
  const currentIndex = siblings.findIndex((s) => s.id === activeId);
  const safeIndex = currentIndex === -1 ? siblings.length - 1 : currentIndex;
  const total = siblings.length;
  const hasMultiple = total > 1;

  function goPrev() {
    const prev = siblings[Math.max(0, safeIndex - 1)];
    if (prev) onPick(prev);
  }

  function goNext() {
    const next = siblings[Math.min(total - 1, safeIndex + 1)];
    if (next) onPick(next);
  }

  return (
    <div className="branch-navigator" role="toolbar" aria-label={isMs ? 'Navigasi cabang' : 'Branch navigation'}>
      {hasMultiple ? (
        <>
          <button
            type="button"
            className="branch-navigator__nav"
            onClick={goPrev}
            disabled={safeIndex === 0}
            aria-label={isMs ? 'Respons sebelumnya' : 'Previous response'}
            data-event="branch_prev"
          >
            <ChevronLeftIcon />
          </button>
          <span className="branch-navigator__counter" aria-live="polite">
            {safeIndex + 1} / {total}
          </span>
          <button
            type="button"
            className="branch-navigator__nav"
            onClick={goNext}
            disabled={safeIndex === total - 1}
            aria-label={isMs ? 'Respons seterusnya' : 'Next response'}
            data-event="branch_next"
          >
            <ChevronRightIcon />
          </button>
        </>
      ) : null}
      {canRegenerate ? (
        <button
          type="button"
          className="branch-navigator__action"
          onClick={onRegenerate}
          aria-label={isMs ? 'Cuba lagi' : 'Try again'}
          title={isMs ? 'Cuba lagi' : 'Try again'}
          data-event="regenerate"
        >
          <RefreshIcon />
        </button>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className="branch-navigator__action"
          onClick={onEdit}
          aria-label={isMs ? 'Edit soalan' : 'Edit question'}
          title={isMs ? 'Edit soalan' : 'Edit question'}
          data-event="edit_message"
        >
          <EditIcon />
        </button>
      ) : null}
    </div>
  );
}
