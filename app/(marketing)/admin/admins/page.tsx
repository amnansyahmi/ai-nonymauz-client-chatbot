import type { Metadata } from 'next';
import { requireSuperuser } from '@/lib/admin/session';
import { listAdminUsers } from '@/lib/admin/users';
import { fmtDate } from '@/lib/affiliate/format';
import { Button, Badge, Card, Field, Input, Select } from '@/components/ui';
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

      <Card className="admin-card--narrow">
        <h2>Tambah admin</h2>
        <form action={addAdminUserAction} className="admin-form">
          <Field label="E-mel">
            <Input type="email" name="email" placeholder="admin@majlismate.ai" required />
          </Field>
          <Field label="Nama">
            <Input type="text" name="name" placeholder="Nama admin" />
          </Field>
          <Field label="Peranan">
            <Select name="role" defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="superuser">Superuser</option>
            </Select>
          </Field>
          <Button type="submit" variant="primary" size="lg">Tambah admin</Button>
        </form>
      </Card>

      <Card>
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
                    <Badge variant={a.role === 'superuser' ? 'success' : 'neutral'}>
                      {a.role === 'superuser' ? 'Superuser' : 'Admin'}
                    </Badge>
                  </td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>
                    {a.email === me.email ? (
                      <span className="admin-sub">Anda</span>
                    ) : (
                      <form action={removeAdminUserAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="danger" size="sm">Buang</Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
