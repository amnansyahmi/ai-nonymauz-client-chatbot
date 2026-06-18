'use client';

import { SOURCE_CONFIDENCE_LABEL, getSourceConfidence } from '../../lib/ai/sourceConfidence';
import type { SourceItem } from '../../lib/ai/sourceConfidence';

type SourceChipsProps = {
  sources: SourceItem[];
  language?: 'ms' | 'en';
};

export default function SourceChips({ sources, language = 'ms' }: SourceChipsProps) {
  if (!sources || sources.length === 0) return null;
  const isMs = language === 'ms';

  return (
    <div className="source-chips" aria-label={isMs ? 'Sumber' : 'Sources'}>
      <span className="source-chips__label">{isMs ? 'Sumber' : 'Sources'}</span>
      <div className="source-chips__list">
        {sources.map((source, index) => {
          const confidence = getSourceConfidence(source, index);
          const label = isMs ? SOURCE_CONFIDENCE_LABEL[confidence].ms : SOURCE_CONFIDENCE_LABEL[confidence].en;
          return (
            <span key={source.id} className={`source-chip source-chip--${confidence}`}>
              <span className="source-chip__title">{source.title}</span>
              <span className="source-chip__confidence" aria-label={label}>
                {confidence === 'pasti' && '✅ '}
                {confidence === 'mungkin' && '🟡 '}
                {confidence === 'lazim' && '⚪ '}
                {label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
