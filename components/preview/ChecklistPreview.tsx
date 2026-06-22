'use client';

import type { AppLanguage, ChecklistItem } from '../planner/types';
import { getCategoryLabel } from '../../lib/planner/checklistCategories';

export const MAX_VISIBLE_ITEMS = 25;

type Props = {
  items: ChecklistItem[];
  language: AppLanguage;
};

function getPhaseColor(phase?: string): string {
  if (!phase) return 'gray';
  const p = phase.toLowerCase();
  if (p.includes('12+') || p.includes('9-12')) return 'green';
  if (p.includes('6-9') || p.includes('3-6')) return 'blue';
  if (p.includes('1-3 bulan') || p.includes('1-3 month') || p.includes('1 bulan') || p.includes('1 month')) return 'amber';
  if (p.includes('2 minggu') || p.includes('1 minggu') || p.includes('2 week') || p.includes('1 week') || p.includes('hari majlis') || p.includes('wedding day')) return 'red';
  if (p.includes('selepas') || p.includes('after')) return 'gray';
  return 'gray';
}

function PhaseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function ChecklistPreview({ items, language }: Props) {
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);

  return (
    <div className="preview-checklist__list">
      {visibleItems.map((item, index) => {
        const phaseColor = getPhaseColor(item.phase);
        return (
          <div
            key={item.id}
            className="preview-checklist__row"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`preview-checklist__number preview-checklist__number--${phaseColor}`}>
              {index + 1}
            </div>
            <div className="preview-checklist__content">
              <span className="preview-checklist__text">
                {language === 'en' ? (item.textEn || item.text) : (item.textMs || item.text)}
              </span>
              <div className="preview-checklist__meta">
                {item.phase && (
                  <span className={`preview-checklist__phase preview-checklist__phase--${phaseColor}`}>
                    <PhaseIcon />
                    {language === 'en' ? (item.phaseEn || item.phase || '') : (item.phaseMs || item.phase || '')}
                  </span>
                )}
                {item.category && (
                  <span className="preview-checklist__category">
                    {getCategoryLabel(item.category, language)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {items.length > MAX_VISIBLE_ITEMS && (
        <div className="preview-checklist__blurred" aria-hidden="true">
          {items.slice(MAX_VISIBLE_ITEMS, MAX_VISIBLE_ITEMS + 6).map((item, index) => (
            <div
              key={item.id}
              className="preview-checklist__row preview-checklist__row--blurred"
              style={{ animationDelay: `${(MAX_VISIBLE_ITEMS + index) * 50}ms` }}
            >
              <div className="preview-checklist__number">
                {MAX_VISIBLE_ITEMS + index + 1}
              </div>
              <div className="preview-checklist__content">
                <span className="preview-checklist__text">
                  {language === 'en' ? (item.textEn || item.text) : (item.textMs || item.text)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
