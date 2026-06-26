export function rm(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `RM ${n.toLocaleString('ms-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

// Malay labels + CSS modifier for a status value (affiliate / commission / referral).
export const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'is-pending' },
  approved: { label: 'Diluluskan', cls: 'is-approved' },
  rejected: { label: 'Ditolak', cls: 'is-rejected' },
  suspended: { label: 'Digantung', cls: 'is-rejected' },
  paid: { label: 'Dibayar', cls: 'is-paid' },
  active: { label: 'Aktif', cls: 'is-approved' },
  trial: { label: 'Percubaan', cls: 'is-pending' },
  registered: { label: 'Berdaftar', cls: 'is-neutral' }
};

export function statusMeta(status: string): { label: string; cls: string } {
  return STATUS_META[status] ?? { label: status, cls: 'is-neutral' };
}
