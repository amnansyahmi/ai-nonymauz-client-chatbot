'use server';

import { z } from 'zod';
import { createOrGetAffiliate } from '../../../../lib/affiliate/queries';

const applicationSchema = z.object({
  name: z.string().trim().min(2, 'Sila masukkan nama penuh.'),
  email: z.string().trim().email('E-mel tidak sah.'),
  phone: z.string().trim().optional(),
  social: z.string().trim().optional(),
  accepted: z.boolean()
});

export type ApplicationResult =
  | { ok: true; code: string; link: string }
  | { ok: false; error: string };

export async function submitApplication(input: unknown): Promise<ApplicationResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Maklumat tidak sah.' };
  }
  if (!parsed.data.accepted) {
    return { ok: false, error: 'Sila terima terma & syarat.' };
  }

  try {
    const affiliate = await createOrGetAffiliate({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      social: parsed.data.social
    });
    return {
      ok: true,
      code: affiliate.code,
      link: `majlismate.ai/ref/${affiliate.code.toLowerCase()}`
    };
  } catch (error) {
    console.error('[affiliate.submitApplication]', error);
    return { ok: false, error: 'Ralat menyimpan permohonan. Sila cuba lagi.' };
  }
}
