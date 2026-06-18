export type SourceItem = {
  id: string;
  title: string;
  category?: string;
};

export type SourceConfidence = 'pasti' | 'mungkin' | 'lazim';

export function getSourceConfidence(source: SourceItem | undefined, index: number): SourceConfidence {
  if (!source) return 'lazim';
  const title = source.title.toLowerCase();
  const category = source.category?.toLowerCase() ?? '';
  // Heuristic: sources about explicitly matched categories are "pasti",
  // general titles are "lazim", everything else is "mungkin".
  const specificKeywords = ['venue', 'dewan', 'catering', 'katering', 'photographer', 'jurugambar', 'pelamin', 'baju', 'hantaran', 'tetamu'];
  if (specificKeywords.some((keyword) => title.includes(keyword) || category.includes(keyword))) {
    return 'pasti';
  }
  if (index === 0) return 'mungkin';
  return 'lazim';
}

export type SourceConfidenceLabel = {
  ms: string;
  en: string;
};

export const SOURCE_CONFIDENCE_LABEL: Record<SourceConfidence, SourceConfidenceLabel> = {
  pasti: { ms: 'Pasti', en: 'Confident' },
  mungkin: { ms: 'Mungkin', en: 'Likely' },
  lazim: { ms: 'Lazim', en: 'General' }
};
