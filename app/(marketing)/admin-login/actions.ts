'use server';

import { redirect } from 'next/navigation';
import { getAdminUserByEmail } from '@/lib/admin/users';
import { setAdminSession, clearAdminSession, type AdminRole } from '@/lib/admin/session';

/**
 * Admin login. For now the password is collected but NOT verified — any password
 * is accepted as long as the email belongs to a registered admin user. Password
 * hashing will be enforced later via admin_user.passwordHash.
 */
export async function adminLogin(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect('/admin-login?error=1');

  const user = await getAdminUserByEmail(email);
  if (!user) redirect('/admin-login?error=1');

  await setAdminSession({
    email: user.email,
    name: user.name || email.split('@')[0],
    role: user.role as AdminRole
  });
  redirect('/admin');
}

export async function adminLogout() {
  await clearAdminSession();
  redirect('/admin-login');
}
