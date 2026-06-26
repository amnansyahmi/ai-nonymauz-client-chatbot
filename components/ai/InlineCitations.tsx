'use client';

import { useState } from 'react';
import { SOURCE_CONFIDENCE_LABEL, getSourceConfidence, type SourceItem } from '@/lib/ai/sourceConfidence';

type InlineCitationsProps = {
  sources: SourceItem[];
  language?: 'ms' | 'en';
};

export default function InlineCitations({ sources, language = 'ms' }: InlineCitationsProps) {
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!sources || sources.length === 0) return null;
  const isMs = language === 'ms';

  return (
    <>
      <div className="inline-citations">
        <button
          type="button"
          className="inline-citations__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {isMs ? `Lihat sumber (${sources.length})` : `View sources (${sources.length})`}
        </button>
        {expanded && (
          <div className="inline-citations__chips">
            {sources.map((source, index) => {
              const confidence = getSourceConfidence(source, index);
              const label = isMs ? SOURCE_CONFIDENCE_LABEL[confidence].ms : SOURCE_CONFIDENCE_LABEL[confidence].en;
              return (
                <button
                  key={source.id}
                  type="button"
                  className={`inline-citations__chip inline-citations__chip--${confidence}`}
                  onClick={() => setOpenIndex(index)}
                  data-event={`citation_open_${source.id}`}
                  title={label}
                >
                  <span aria-hidden="true">
                    {confidence === 'pasti' && '✓'}
                    {confidence === 'mungkin' && '~'}
                    {confidence === 'lazim' && '•'}
                  </span>
                  {source.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {openIndex !== null && sources[openIndex] ? (
        <CitationPanel
          source={sources[openIndex]}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          language={language}
        />
      ) : null}
    </>
  );
}

function CitationPanel({
  source,
  index,
  onClose,
  language
}: {
  source: SourceItem;
  index: number;
  onClose: () => void;
  language: 'ms' | 'en';
}) {
  const isMs = language === 'ms';
  const confidence = getSourceConfidence(source, index);
  const label = isMs ? SOURCE_CONFIDENCE_LABEL[confidence].ms : SOURCE_CONFIDENCE_LABEL[confidence].en;

  return (
    <div className="citation-panel" role="dialog" aria-modal="true" aria-label={source.title}>
      <button type="button" className="citation-panel__backdrop" onClick={onClose} aria-label={isMs ? 'Tutup' : 'Close'} />
      <aside className="citation-panel__drawer">
        <header className="citation-panel__header">
          <div>
            <span className="citation-panel__confidence">
              {label}
            </span>
            <h3>{source.title}</h3>
            {source.category ? (
              <p className="citation-panel__category">{source.category}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="citation-panel__close"
            onClick={onClose}
            aria-label={isMs ? 'Tutup' : 'Close'}
            data-event="citation_close"
          >
            ×
          </button>
        </header>
        <p className="citation-panel__hint">
          {isMs
            ? 'Teks penuh sumber akan ditambah selepas integrasi pangkalan pengetahuan.'
            : 'Full source text will be added after knowledge base integration.'}
        </p>
      </aside>
    </div>
  );
}
