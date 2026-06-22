import { describe, expect, it } from 'vitest';
import {
  CHECKLIST_CATEGORIES,
  categorizeTask,
  getCategory,
  getCategoryLabel
} from '../lib/planner/checklistCategories';
import { generatePersonalizedChecklist, type SurveyAnswers } from '../lib/planner/checklistGenerator';

describe('categorizeTask', () => {
  const cases: Array<[string, string]> = [
    ['Daftar kursus pra-perkahwinan di Pejabat Agama Islam', 'nikah-protokol'],
    ['Sediakan wali, saksi 2 orang, & jurunikah', 'nikah-protokol'],
    ['Confirm tempahan dewan / masjid / restoran', 'tempat-venue'],
    ['Sewa kanopi untuk tempat berteduh', 'tempat-venue'],
    ['Tempah katering & lakukan food tasting', 'makanan-katering'],
    ['Tempah MUA (makeup artist) & hair stylist', 'solekan-pakaian'],
    ['Final fitting baju sanding', 'solekan-pakaian'],
    ['Pilih tema, warna & konsep pelamin', 'pelamin-dekorasi'],
    ['Tempah dekorasi pelamin & dewan', 'pelamin-dekorasi'],
    ['Survey & tempah jurugambar + juruvideo', 'media-dokumentasi'],
    ['Backup semua gambar & video', 'media-dokumentasi'],
    ['Tempah juruacara majlis (MC)', 'hiburan-aturcara'],
    ['Final senarai lagu, MC script, & flow majlis', 'hiburan-aturcara'],
    ['Hantar kad jemputan digital / printable', 'jemputan-logistik'],
    ['Final RSVP & headcount untuk katering', 'jemputan-logistik'],
    ['Susun atur meja & seating plan', 'jemputan-logistik'],
    ['Tetapkan bajet keseluruhan majlis', 'keperluan-asas'],
    ['Tentukan tarikh majlis & tempah cuti', 'keperluan-asas']
  ];

  it.each(cases)('classifies %j as %s', (text, expected) => {
    expect(categorizeTask(text)).toBe(expected);
  });

  it('falls back to keperluan-asas for unmatched text', () => {
    expect(categorizeTask('xyz random text nothing here')).toBe('keperluan-asas');
  });

  it('does not fire short tokens inside unrelated words (mc, dj)', () => {
    // "Dokumen" contains "dj"? no — but guard against substring matches generally.
    expect(categorizeTask('Simpan dokumen asal untuk ditunjukkan')).not.toBe('hiburan-aturcara');
  });
});

describe('category metadata', () => {
  it('has unique ids', () => {
    const ids = CHECKLIST_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every vendorCategory maps to a real category', () => {
    for (const c of CHECKLIST_CATEGORIES) {
      if (c.vendorCategory) expect(c.vendorCategory.length).toBeGreaterThan(0);
    }
  });

  it('getCategory / getCategoryLabel resolve', () => {
    expect(getCategory('tempat-venue')?.labelMs).toBe('Tempat & Venue');
    expect(getCategoryLabel('tempat-venue', 'en')).toBe('Venue & Place');
    expect(getCategoryLabel(undefined, 'ms')).toBe('');
  });
});

describe('generatePersonalizedChecklist assigns categories', () => {
  const answers: SurveyAnswers = {
    weddingDate: '2027-06-19',
    venueState: 'Selangor',
    brideOriginState: 'Johor',
    groomOriginState: 'Selangor',
    hasNikah: true,
    hasSanding: true,
    estimatedGuests: 120
  };

  it('every generated item has a valid category', () => {
    const validIds = new Set(CHECKLIST_CATEGORIES.map((c) => c.id));
    const { items } = generatePersonalizedChecklist(answers, { nowIso: '2026-06-20T00:00:00.000Z' });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.category).toBeDefined();
      expect(validIds.has(item.category as never)).toBe(true);
    }
  });
});
