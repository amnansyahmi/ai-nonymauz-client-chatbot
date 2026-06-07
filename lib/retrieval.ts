import knowledge from '@/data/knowledge.json';

type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  content: string;
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'you', 'your', 'apa', 'yang', 'dan', 'untuk', 'saya', 'kami', 'awak', 'boleh', 'atau', 'dengan', 'how', 'what', 'when', 'where', 'why', 'can', 'do', 'does', 'is', 'are'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

export function getClientName(): string {
  return process.env.CLIENT_NAME || knowledge.clientName || 'Client Company';
}

export function retrieveContext(question: string, maxDocs = 4): KnowledgeDoc[] {
  const queryTerms = tokenize(question);
  const docs = knowledge.documents as KnowledgeDoc[];

  if (queryTerms.length === 0) {
    return docs.slice(0, maxDocs);
  }

  return docs
    .map((doc) => {
      const haystack = tokenize(`${doc.title} ${doc.category} ${doc.content}`);
      const termFrequency = new Map<string, number>();
      for (const term of haystack) {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      }

      let score = 0;
      for (const term of queryTerms) {
        const count = termFrequency.get(term) || 0;
        if (count > 0) {
          score += 1 + Math.log(count);
        }
      }

      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .map((item) => item.doc);
}

export function formatContext(docs: KnowledgeDoc[]): string {
  if (docs.length === 0) {
    return 'No matching internal knowledge found.';
  }

  return docs
    .map((doc, index) => {
      return `[Source ${index + 1}: ${doc.title} | ${doc.category}]\n${doc.content}`;
    })
    .join('\n\n');
}
