'use client';

import { useEffect, useState } from 'react';
import type { AppLanguage } from '../planner/types';
import { getPreviewStrings } from '@/lib/preview/i18n';

type Props = {
  language: AppLanguage;
};

export default function DraftingAnimation({ language }: Props) {
  const lines = getPreviewStrings(language).draftingLines;
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setCurrentLine((prev) => Math.min(prev + 1, lines.length - 1));
    }, 700);

    return () => clearInterval(lineInterval);
  }, [lines.length]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 100));
    }, 70);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="drafting">
      <div className="drafting__container">
        <div className="drafting__document">
          <div className="drafting__paper">
            <div className="drafting__header">
              <div className="drafting__logo">
                <span className="drafting__logo-icon">💕</span>
                <span className="drafting__logo-text">MajlisMate.ai</span>
              </div>
            </div>

            <div className="drafting__content">
              <div className="drafting__title-line">
                <div className="drafting__skeleton drafting__skeleton--title" />
              </div>

              <div className="drafting__lines">
                {lines.slice(0, currentLine + 1).map((line, index) => (
                  <div
                    key={line}
                    className={`drafting__line ${index === currentLine ? 'drafting__line--active' : ''}`}
                  >
                    <span className="drafting__line-icon">
                      {index < currentLine ? '✓' : '○'}
                    </span>
                    <span className="drafting__line-text">{line}</span>
                  </div>
                ))}
              </div>

              <div className="drafting__progress">
                <div className="drafting__progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="drafting__sparkles" aria-hidden="true">
          <span className="drafting__sparkle drafting__sparkle--1">✨</span>
          <span className="drafting__sparkle drafting__sparkle--2">✨</span>
          <span className="drafting__sparkle drafting__sparkle--3">✨</span>
        </div>
      </div>
    </div>
  );
}
