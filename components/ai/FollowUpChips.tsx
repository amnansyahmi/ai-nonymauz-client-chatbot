'use client';

import { suggestFollowUps, type FollowUp } from '../../lib/ai/followUps';

type FollowUpChipsProps = {
  answer: string;
  language?: 'ms' | 'en';
  onPick: (followUp: FollowUp) => void;
};

export default function FollowUpChips({ answer, language = 'ms', onPick }: FollowUpChipsProps) {
  const followUps = suggestFollowUps(answer, language);
  if (followUps.length === 0) return null;

  const isMs = language === 'ms';

  return (
    <div className="follow-up-chips" aria-label={isMs ? 'Cuba tanya' : 'Try asking'}>
      <span className="follow-up-chips__label">{isMs ? 'Cuba tanya' : 'Try asking'}</span>
      <div className="follow-up-chips__list">
        {followUps.map((followUp) => (
          <button
            key={followUp.id}
            type="button"
            className="follow-up-chips__chip"
            onClick={() => onPick(followUp)}
            data-event={`follow_up_${followUp.id}`}
          >
            {isMs ? followUp.labelMs : followUp.labelEn}
          </button>
        ))}
      </div>
    </div>
  );
}
