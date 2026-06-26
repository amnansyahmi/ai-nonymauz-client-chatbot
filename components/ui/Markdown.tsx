'use client';

import { type ReactNode } from 'react';

// Matches **bold**, *italic*, `code` — bold must come before italic in alternation
const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function parseInline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className="md-inline-code">{part.slice(1, -1)}</code>;
    }
    return part || null;
  });
}

type Block =
  | { type: 'p'; lines: string[] }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'pre'; lang: string; code: string }
  | { type: 'table'; header: string[]; align: ('left' | 'center' | 'right')[]; rows: string[][] };

// Splits a markdown table row into trimmed cells, tolerating optional
// leading/trailing pipes: "| a | b |" → ["a", "b"].
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

// A separator row is the second line of a GFM table: each cell is dashes with
// optional leading/trailing colons for alignment, e.g. "| :--- | ---: |".
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function parseBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'pre', lang, code: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'h', level, text: headingMatch[2] });
      i++;
      continue;
    }

    // Table — a header row with pipes followed by a separator row.
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1])) {
      const header = splitTableRow(line);
      const align = splitTableRow(lines[i + 1]).map((cell): 'left' | 'center' | 'right' => {
        const left = cell.startsWith(':');
        const right = cell.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
      });
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, align, rows });
      continue;
    }

    // Unordered list — collect consecutive bullet lines
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list — collect consecutive numbered lines
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line — skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) blocks.push({ type: 'p', lines: paraLines });
  }

  return blocks;
}

type MarkdownProps = {
  content: string;
  streaming?: boolean;
};

const CURSOR = <span className="md-cursor" aria-hidden="true" />;

export default function Markdown({ content, streaming = false }: MarkdownProps) {
  if (!content) {
    return streaming ? <p>{CURSOR}</p> : null;
  }

  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return streaming ? <p>{CURSOR}</p> : null;
  }

  return (
    <>
      {blocks.map((block, bi) => {
        const isLast = bi === blocks.length - 1;

        switch (block.type) {
          case 'h': {
            const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1];
            return (
              <Tag key={bi} className={`md-heading md-h${block.level}`}>
                {parseInline(block.text)}
                {streaming && isLast && CURSOR}
              </Tag>
            );
          }

          case 'ul':
            return (
              <ul key={bi} className="md-list">
                {block.items.map((item, ii) => (
                  <li key={ii}>
                    {parseInline(item)}
                    {streaming && isLast && ii === block.items.length - 1 && CURSOR}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={bi} className="md-list md-ol">
                {block.items.map((item, ii) => (
                  <li key={ii}>
                    {parseInline(item)}
                    {streaming && isLast && ii === block.items.length - 1 && CURSOR}
                  </li>
                ))}
              </ol>
            );

          case 'pre':
            return (
              <pre key={bi} className="md-pre">
                <code>{block.code}</code>
                {streaming && isLast && CURSOR}
              </pre>
            );

          case 'table':
            return (
              <div key={bi} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      {block.header.map((cell, ci) => (
                        <th key={ci} style={{ textAlign: block.align[ci] ?? 'left' }}>
                          {parseInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {block.header.map((_, ci) => (
                          <td key={ci} style={{ textAlign: block.align[ci] ?? 'left' }}>
                            {parseInline(row[ci] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {streaming && isLast && CURSOR}
              </div>
            );

          default:
            // 'p' — may span multiple lines
            return block.lines.map((line, li) => (
              <p key={`${bi}-${li}`}>
                {parseInline(line)}
                {streaming && isLast && li === block.lines.length - 1 && CURSOR}
              </p>
            ));
        }
      })}
    </>
  );
}
