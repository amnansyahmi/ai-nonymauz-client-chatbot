'use client';

import { useCallback, useMemo, useState } from 'react';
import { storageKeys } from '../data';
import type { Guest } from '../types';
import { downloadTextFile, rsvpLabel } from '../utils';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

export type GuestDraft = {
  id: string;
  name: string;
  phone: string;
  group: string;
  pax: number;
  status: 'pending' | 'confirmed' | 'declined';
};

const EMPTY_DRAFT: GuestDraft = {
  id: '',
  name: '',
  phone: '',
  group: 'Kawan-kawan',
  pax: 1,
  status: 'pending'
};

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let isQuoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === ',' && !isQuoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

export type UseGuestsResult = {
  guests: Guest[];
  draft: GuestDraft;
  setDraft: (updater: (current: GuestDraft) => GuestDraft) => void;
  resetDraft: () => void;
  add: (next?: Partial<GuestDraft>) => void;
  update: (id: string, patch: Partial<Guest>) => void;
  remove: (id: string) => void;
  addMany: (guests: Guest[]) => number;
  exportCsv: () => void;
  importCsv: (file: File) => Promise<{ imported: number; status: 'ok' | 'empty' | 'no-rows' }>;
  confirmedPax: number;
  declinedPax: number;
  pendingPax: number;
  importFeedback: string | null;
  setImportFeedback: (value: string | null) => void;
  hydrated: boolean;
};

export function useGuests(): UseGuestsResult {
  const [guests, setGuests, hydrated] = useLocalStorage<Guest[]>(storageKeys.guests, []);
  const [draft, setDraftRaw, draftHydrated] = useLocalStorage<GuestDraft>(storageKeys.guestDraft, EMPTY_DRAFT);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const setDraft = useCallback(
    (updater: (current: GuestDraft) => GuestDraft) => {
      setDraftRaw((current) => updater(current));
    },
    [setDraftRaw]
  );

  const resetDraft = useCallback(() => {
    setDraftRaw(EMPTY_DRAFT);
  }, [setDraftRaw]);

  const add = useCallback(
    (next?: Partial<GuestDraft>) => {
      setGuests((current) => {
        const merged: GuestDraft = { ...draft, ...next };
        const name = merged.name.trim();
        if (!name) return current;
        const guest: Guest = {
          id: `${Date.now()}-${current.length}`,
          name,
          phone: merged.phone.trim(),
          group: merged.group.trim() || 'Kawan-kawan',
          pax: Number(merged.pax) || 1,
          status: merged.status
        };
        return [...current, guest];
      });
    },
    [setGuests, draft]
  );

  const update = useCallback(
    (id: string, patch: Partial<Guest>) => {
      setGuests((current) => current.map((guest) => (guest.id === id ? { ...guest, ...patch } : guest)));
    },
    [setGuests]
  );

  const remove = useCallback(
    (id: string) => {
      setGuests((current) => current.filter((guest) => guest.id !== id));
    },
    [setGuests]
  );

  const addMany = useCallback(
    (incoming: Guest[]) => {
      let added = 0;
      setGuests((current) => {
        const next = [...current];
        for (const guest of incoming) {
          if (!guest.name) continue;
          next.push({ ...guest, id: `${Date.now()}-${next.length}` });
          added += 1;
        }
        return next;
      });
      return added;
    },
    [setGuests]
  );

  const exportCsv = useCallback(() => {
    const rows = [
      ['name', 'phone', 'group', 'pax', 'status'],
      ...guests.map((guest) => [guest.name, guest.phone, guest.group, String(guest.pax), rsvpLabel(guest.status)])
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    downloadTextFile('majlismate-guests.csv', csv, 'text/csv');
  }, [guests]);

  const importCsv = useCallback(
    (file: File) => {
      return new Promise<{ imported: number; status: 'ok' | 'empty' | 'no-rows' }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const lines = String(reader.result || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          if (lines.length === 0) {
            setImportFeedback('No guest rows found in that CSV.');
            resolve({ imported: 0, status: 'no-rows' });
            return;
          }

          const firstRow = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
          const hasHeader = firstRow.some((cell) => ['name', 'phone', 'group', 'pax', 'status'].includes(cell));
          const dataLines = hasHeader ? lines.slice(1) : lines;
          const imported: Guest[] = dataLines
            .map((line, index) => {
              const [name, phone = '', group = 'Kawan-kawan', pax = '1', status = 'pending'] = parseCsvLine(line);
              const normalizedStatus = status.toLowerCase();
              const guestStatus: Guest['status'] =
                normalizedStatus.includes('confirm') || normalizedStatus.includes('hadir')
                  ? 'confirmed'
                  : normalizedStatus.includes('decline') || normalizedStatus.includes('tidak')
                    ? 'declined'
                    : 'pending';
              return {
                id: `${Date.now()}-${index}`,
                name: name?.trim(),
                phone: phone.trim(),
                group: group.trim() || 'Kawan-kawan',
                pax: Math.max(Number(pax) || 1, 1),
                status: guestStatus
              };
            })
            .filter((guest): guest is Guest => Boolean(guest.name));

          if (imported.length === 0) {
            setImportFeedback('No valid guest names found in that CSV.');
            resolve({ imported: 0, status: 'empty' });
            return;
          }

          const added = addMany(imported);
          setImportFeedback(`${added} guest${added === 1 ? '' : 's'} imported.`);
          resolve({ imported: added, status: 'ok' });
        };
        reader.readAsText(file);
      });
    },
    [addMany]
  );

  const confirmedPax = useMemo(
    () => guests.filter((guest) => guest.status === 'confirmed').reduce((sum, guest) => sum + guest.pax, 0),
    [guests]
  );
  const declinedPax = useMemo(
    () => guests.filter((guest) => guest.status === 'declined').reduce((sum, guest) => sum + guest.pax, 0),
    [guests]
  );
  const pendingPax = useMemo(
    () => guests.filter((guest) => guest.status === 'pending').reduce((sum, guest) => sum + guest.pax, 0),
    [guests]
  );

  return {
    guests,
    draft,
    setDraft,
    resetDraft,
    add,
    update,
    remove,
    addMany,
    exportCsv,
    importCsv,
    confirmedPax,
    declinedPax,
    pendingPax,
    importFeedback,
    setImportFeedback,
    hydrated: hydrated && draftHydrated
  };
}
