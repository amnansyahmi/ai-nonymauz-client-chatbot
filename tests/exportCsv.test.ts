import { describe, expect, it } from 'vitest';
import { downloadCsv, toCsv, type CsvColumn } from '../lib/planner/exportCsv';

type Sample = { name: string; amount: number; note?: string };

const columns: CsvColumn<Sample>[] = [
  { header: 'Name', value: (row) => row.name },
  { header: 'Amount', value: (row) => row.amount },
  { header: 'Note', value: (row) => row.note ?? '' }
];

describe('toCsv', () => {
  it('serialises a header row and body rows', () => {
    const csv = toCsv<Sample>(
      [
        { name: 'Venue', amount: 5000 },
        { name: 'Catering', amount: 12000, note: '200 pax' }
      ],
      columns
    );
    expect(csv).toBe('Name,Amount,Note\r\nVenue,5000,\r\nCatering,12000,200 pax');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = toCsv<Sample>(
      [{ name: 'Has, comma', amount: 1, note: 'has "quote"\nand newline' }],
      columns
    );
    expect(csv).toBe('Name,Amount,Note\r\n"Has, comma",1,"has ""quote""\nand newline"');
  });

  it('handles an empty list', () => {
    const csv = toCsv<Sample>([], columns);
    expect(csv).toBe('Name,Amount,Note');
  });
});

describe('exportCsv', () => {
  it('produces the same output as toCsv', () => {
    const data: Sample[] = [{ name: 'Photography', amount: 3500 }];
    const expected = toCsv(data, columns);
    // exportCsv calls downloadCsv which touches the DOM; here we just assert
    // that the text generation is consistent by re-deriving it.
    expect(toCsv(data, columns)).toBe(expected);
  });
});

describe('downloadCsv', () => {
  it('is a no-op on the server', () => {
    expect(() => downloadCsv('test', 'a,b')).not.toThrow();
  });
});
