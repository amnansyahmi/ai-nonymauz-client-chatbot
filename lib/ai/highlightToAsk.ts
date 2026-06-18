/**
 * Highlight-to-ask helper. Detects text selections inside a container
 * (typically a chat bubble) and returns the selected text + bounding
 * rect so a floating button can be positioned next to the highlight.
 */

export type HighlightInfo = {
  text: string;
  rect: { top: number; left: number; bottom: number; right: number };
  containerRect: { top: number; left: number; bottom: number; right: number };
};

export function getSelectionInfo(container: HTMLElement | null, maxLength = 280): HighlightInfo | null {
  if (typeof window === 'undefined' || !container) return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  const text = selection.toString().trim();
  if (text.length < 2 || text.length > maxLength) return null;

  // Make sure the selection is inside our container
  if (!container.contains(selection.anchorNode)) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    text,
    rect: {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    },
    containerRect: {
      top: containerRect.top,
      left: containerRect.left,
      bottom: containerRect.bottom,
      right: containerRect.right
    }
  };
}

export function clearSelection(): void {
  if (typeof window === 'undefined') return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
}

/**
 * Format a question prompt that pre-fills the chat input with the
 * highlighted context.
 */
export function buildHighlightPrompt(highlightedText: string, language: 'ms' | 'en' = 'ms'): string {
  const trimmed = highlightedText.length > 200 ? `${highlightedText.slice(0, 200)}…` : highlightedText;
  if (language === 'ms') {
    return `Tentang ni: "${trimmed}" — apa maksudnya?`;
  }
  return `About this: "${trimmed}" — what does it mean?`;
}
