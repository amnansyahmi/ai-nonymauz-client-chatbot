import Resend from 'next-auth/providers/resend';

/**
 * Passwordless magic-link sign-in for the app (/planner).
 *
 * Uses Auth.js's `email` provider flow: a one-time token is stored in the
 * `verificationToken` table (via the Drizzle adapter) and emailed as a link.
 * Clicking it proves the person owns the inbox — closing the gap where the
 * demo Credentials provider onboarded any typed email instantly.
 *
 * Delivery is "real when configured, demo otherwise":
 *  - RESEND_API_KEY set  → send a real email through Resend's HTTP API.
 *  - not set             → log the link to the server console so local dev
 *                          and unconfigured deploys still work, no inbox needed.
 */
export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'MajlisMate <onboarding@resend.dev>';

type SendParams = {
  identifier: string;
  url: string;
  provider: { from?: string };
};

async function sendVerificationRequest(params: SendParams): Promise<void> {
  const { identifier: to, url } = params;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Demo / local fallback — no email service wired. Surface the link so the
    // developer (or a self-hosted operator) can complete sign-in by hand.
    // eslint-disable-next-line no-console
    console.log(
      `\n🔗 [magic-link] Sign-in link for ${to}:\n${url}\n(Set RESEND_API_KEY to email this instead.)\n`
    );
    return;
  }

  const host = new URL(url).host;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `Log masuk ke ${host} — MajlisMate.ai`,
      html: magicLinkEmailHtml(url, host),
      text: `Log masuk ke MajlisMate.ai:\n${url}\n\nJika anda tidak meminta e-mel ini, abaikan sahaja.`
    })
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${JSON.stringify(await res.json())}`);
  }
}

function magicLinkEmailHtml(url: string, host: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 8px">Log masuk ke MajlisMate.ai</h2>
    <p style="margin:0 0 20px;color:#555">Klik butang di bawah untuk log masuk dan teruskan rancangan majlis anda.</p>
    <a href="${url}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Log masuk</a>
    <p style="margin:20px 0 0;color:#888;font-size:13px">Atau salin pautan ini:<br>${url}</p>
    <p style="margin:16px 0 0;color:#aaa;font-size:12px">Jika anda tidak meminta e-mel ini (${host}), abaikan sahaja.</p>
  </div>`;
}

/**
 * The magic-link provider. Built on the Resend factory (pure fetch, no extra
 * dependency) but with our own sender so it degrades to console logging.
 */
export const magicLinkProvider = {
  ...Resend({ apiKey: process.env.RESEND_API_KEY || 'unconfigured', from: FROM }),
  id: 'magic-link',
  name: 'Magic Link',
  from: FROM,
  // 15-minute link validity.
  maxAge: 15 * 60,
  sendVerificationRequest
};
