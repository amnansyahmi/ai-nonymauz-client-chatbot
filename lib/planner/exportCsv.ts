export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Serialise a list of rows into CSV text. Handles quoting for cells
 * containing commas, quotes, or newlines.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCell(column.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(',')
  );
  return [headerLine, ...bodyLines].join('\r\n');
}

/**
 * Trigger a browser download for the given CSV text.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience helper: serialise and download in one call.
 */
export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  downloadCsv(filename, toCsv(rows, columns));
}
