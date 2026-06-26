import type { Metadata } from 'next';
import { requireSuperuser } from '../../../../lib/admin/session';
import { listAdminUsers } from '../../../../lib/admin/users';
import { fmtDate } from '../../../../lib/affiliate/format';
import { addAdminUserAction, removeAdminUserAction } from '../actions';

export const metadata: Metadata = { title: 'Pentadbir — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const me = await requireSuperuser();
  const admins = await listAdminUsers();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Pentadbir</h1>
        <p>Urus akaun admin dan peranan. Hanya superuser boleh akses halaman ini.</p>
      </header>

      <section className="admin-card admin-card--narrow">
        <h2>Tambah admin</h2>
        <form action={addAdminUserAction} className="admin-form">
          <label className="admin-field">
            <span>E-mel</span>
            <input type="email" name="email" placeholder="admin@majlismate.ai" required />
          </label>
          <label className="admin-field">
            <span>Nama</span>
            <input type="text" name="name" placeholder="Nama admin" />
          </label>
          <label className="admin-field">
            <span>Peranan</span>
            <select name="role" defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="superuser">Superuser</option>
            </select>
          </label>
          <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg">Tambah admin</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Senarai admin ({admins.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>E-mel</th><th>Nama</th><th>Peranan</th><th>Sertai</th><th>Tindakan</th></tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.email}</td>
                  <td>{a.name || '—'}</td>
                  <td>
                    <span className={`admin-badge ${a.role === 'superuser' ? 'is-approved' : 'is-neutral'}`}>
                      {a.role === 'superuser' ? 'Superuser' : 'Admin'}
                    </span>
                  </td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>
                    {a.email === me.email ? (
                      <span className="admin-sub">Anda</span>
                    ) : (
                      <form action={removeAdminUserAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="ui-btn ui-btn--sm ui-btn--danger">Buang</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
