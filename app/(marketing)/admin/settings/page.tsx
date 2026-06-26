import type { Metadata } from 'next';
import { getCommissionSetting } from '../../../../lib/affiliate/queries';
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

      <section className="admin-card admin-card--narrow">
        <form action={updateSettingsAction} className="admin-form">
          <label className="admin-field">
            <span>Jenis komisen</span>
            <select name="commissionType" defaultValue={s.commissionType}>
              <option value="fixed">Tetap (RM)</option>
              <option value="percentage">Peratusan (%)</option>
            </select>
          </label>

          <label className="admin-field">
            <span>Komisen tetap (RM / langganan)</span>
            <input type="number" name="fixedAmount" step="0.01" min="0" defaultValue={Number(s.fixedAmount)} />
          </label>

          <label className="admin-field">
            <span>Kadar peratusan (%)</span>
            <input type="number" name="percentageRate" step="0.01" min="0" defaultValue={Number(s.percentageRate)} />
          </label>

          <label className="admin-field">
            <span>Kadar berulang / renewal (%)</span>
            <input type="number" name="recurringRate" step="0.01" min="0" defaultValue={Number(s.recurringRate)} />
          </label>

          <label className="admin-field">
            <span>Pengeluaran minimum (RM)</span>
            <input type="number" name="minPayout" step="0.01" min="0" defaultValue={Number(s.minPayout)} />
          </label>

          <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg">Simpan tetapan</button>
        </form>
      </section>

      <p className="admin-note">
        Tetapan ini digunakan oleh enjin komisen ketika pembayaran disahkan. Jenis &quot;Tetap&quot;
        memberi jumlah RM, &quot;Peratusan&quot; mengira % daripada nilai langganan.
      </p>
    </div>
  );
}
