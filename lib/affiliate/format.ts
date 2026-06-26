export function rm(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `RM ${n.toLocaleString('ms-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

// Malay labels + <Badge> variant for a status value (affiliate / commission / referral).
import type { BadgeVariant } from '../../components/ui/Badge';

export const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Menunggu', variant: 'pending' },
  approved: { label: 'Diluluskan', variant: 'success' },
  rejected: { label: 'Ditolak', variant: 'danger' },
  suspended: { label: 'Digantung', variant: 'danger' },
  paid: { label: 'Dibayar', variant: 'info' },
  active: { label: 'Aktif', variant: 'success' },
  trial: { label: 'Percubaan', variant: 'pending' },
  registered: { label: 'Berdaftar', variant: 'neutral' }
};

export function statusMeta(status: string): { label: string; variant: BadgeVariant } {
  return STATUS_META[status] ?? { label: status, variant: 'neutral' };
}
