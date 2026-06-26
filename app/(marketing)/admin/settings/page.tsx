import type { Metadata } from 'next';
import { getCommissionSetting } from '@/lib/affiliate/queries';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { updateSettingsAction } from '../actions';

export const metadata: Metadata = { title: 'Tetapan — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const s = await getCommissionSetting();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Tetapan komisen</h1>
        <p>Tetapkan cara komisen dikira untuk setiap langganan baharu.</p>
      </header>

      <Card className="admin-card--narrow">
        <form action={updateSettingsAction} className="admin-form">
          <Field label="Jenis komisen">
            <Select name="commissionType" defaultValue={s.commissionType}>
              <option value="fixed">Tetap (RM)</option>
              <option value="percentage">Peratusan (%)</option>
            </Select>
          </Field>

          <Field label="Komisen tetap (RM / langganan)">
            <Input type="number" name="fixedAmount" step="0.01" min="0" defaultValue={Number(s.fixedAmount)} />
          </Field>

          <Field label="Kadar peratusan (%)">
            <Input type="number" name="percentageRate" step="0.01" min="0" defaultValue={Number(s.percentageRate)} />
          </Field>

          <Field label="Kadar berulang / renewal (%)">
            <Input type="number" name="recurringRate" step="0.01" min="0" defaultValue={Number(s.recurringRate)} />
          </Field>

          <Field label="Pengeluaran minimum (RM)">
            <Input type="number" name="minPayout" step="0.01" min="0" defaultValue={Number(s.minPayout)} />
          </Field>

          <Button type="submit" variant="primary" size="lg">Simpan tetapan</Button>
        </form>
      </Card>

      <p className="admin-note">
        Tetapan ini digunakan oleh enjin komisen ketika pembayaran disahkan. Jenis &quot;Tetap&quot;
        memberi jumlah RM, &quot;Peratusan&quot; mengira % daripada nilai langganan.
      </p>
    </div>
  );
}
