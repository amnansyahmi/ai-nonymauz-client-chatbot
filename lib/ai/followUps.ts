export type FollowUp = {
  id: string;
  labelMs: string;
  labelEn: string;
};

/**
 * Deterministically extract a small pool of follow-up questions from the
 * assistant's last message. No API call — pure client-side heuristic so
 * non-IT users always see "Cuba tanya" suggestions.
 */
export function suggestFollowUps(answer: string, _language: 'ms' | 'en' = 'ms'): FollowUp[] {
  const lower = answer.toLowerCase();

  const candidates: FollowUp[] = [];

  if (/(checklist|senarai|todo|to-do)/i.test(lower)) {
    candidates.push({
      id: 'follow_checklist',
      labelMs: 'Tambah ke checklist',
      labelEn: 'Add to my checklist'
    });
  }

  if (/(budget|bajet|harga|cost|rm\s?\d|ringgit)/i.test(lower)) {
    candidates.push({
      id: 'follow_budget',
      labelMs: 'Masuk dalam bajet',
      labelEn: 'Add to my budget'
    });
  }

  if (/(vendor|jurugambar|katering|caterer|andaman|mua|dewan)/i.test(lower)) {
    candidates.push({
      id: 'follow_vendor',
      labelMs: 'Cari vendor berdekatan',
      labelEn: 'Find nearby vendors'
    });
  }

  if (/(appointment|temujanji|janji temu|tarikh|date)/i.test(lower)) {
    candidates.push({
      id: 'follow_appointment',
      labelMs: 'Buat appointment',
      labelEn: 'Schedule it'
    });
  }

  // Always-available fallbacks
  candidates.push({
    id: 'follow_example',
    labelMs: 'Boleh contoh?',
    labelEn: 'Show me an example'
  });
  candidates.push({
    id: 'follow_simple',
    labelMs: 'Ringkaskan lagi',
    labelEn: 'Make it shorter'
  });

  return candidates.slice(0, 3);
}
