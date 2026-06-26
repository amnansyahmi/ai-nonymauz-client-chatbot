'use client';

import { useState } from 'react';
import { SOURCE_CONFIDENCE_LABEL, getSourceConfidence } from '@/lib/ai/sourceConfidence';
import type { SourceItem } from '@/lib/ai/sourceConfidence';

type SourceChipsProps = {
  sources: SourceItem[];
  language?: 'ms' | 'en';
};

export default function SourceChips({ sources, language = 'ms' }: SourceChipsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;
  const isMs = language === 'ms';
  const label = isMs ? 'Sumber' : 'Sources';

  return (
    <div className="source-chips" aria-label={label}>
      <button
        type="button"
        className="source-chips__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="source-chips__toggle-icon" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        {label} ({sources.length})
      </button>

      {expanded && (
        <div className="source-chips__list">
          {sources.map((source, index) => {
            const confidence = getSourceConfidence(source, index);
            const confidenceLabel = isMs
              ? SOURCE_CONFIDENCE_LABEL[confidence].ms
              : SOURCE_CONFIDENCE_LABEL[confidence].en;
            return (
              <span key={source.id} className={`source-chip source-chip--${confidence}`}>
                <span className="source-chip__title">{source.title}</span>
                <span className="source-chip__confidence" aria-label={confidenceLabel}>
                  {confidence === 'pasti' && '✅ '}
                  {confidence === 'mungkin' && '🟡 '}
                  {confidence === 'lazim' && '⚪ '}
                  {confidenceLabel}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
