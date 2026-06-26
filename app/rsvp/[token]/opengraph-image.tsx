import { ImageResponse } from 'next/og';
import { decodeRsvpToken } from '@/lib/planner/rsvpLink';

export const alt = 'RSVP Invitation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = decodeRsvpToken(token);
  const couple = payload?.couple || 'MajlisMate';
  const date = payload?.date || '';
  const ms = (payload?.lang ?? 'ms') === 'ms';

  // Split "Name1 & Name2" into two lines
  const parts = couple.split(/\s*&\s*|\s+dan\s+/i);
  const name1 = parts[0]?.trim() || couple;
  const name2 = parts[1]?.trim() || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f5ede0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Corner border decoration */}
        <div style={{
          position: 'absolute', inset: '24px', border: '1.5px solid #d4b48a',
          borderRadius: '4px', display: 'flex',
        }} />

        {/* Tagline */}
        <p style={{
          color: '#b08a52', fontSize: 18, letterSpacing: '0.32em',
          margin: '0 0 36px', textTransform: 'uppercase', display: 'flex',
        }}>
          {ms ? 'Anda Dijemput' : "You're Invited"}
        </p>

        {/* Couple names */}
        <p style={{
          color: '#1e1a17', fontSize: 80, fontStyle: 'italic', fontWeight: 400,
          textAlign: 'center', margin: 0, lineHeight: 1.05, display: 'flex',
        }}>
          {name1}
        </p>
        {name2 ? (
          <>
            <p style={{ color: '#b08a52', fontSize: 36, margin: '8px 0', display: 'flex' }}>&</p>
            <p style={{
              color: '#1e1a17', fontSize: 80, fontStyle: 'italic', fontWeight: 400,
              textAlign: 'center', margin: 0, lineHeight: 1.05, display: 'flex',
            }}>
              {name2}
            </p>
          </>
        ) : null}

        {/* Date */}
        {date ? (
          <p style={{
            color: '#8a8178', fontSize: 24, letterSpacing: '0.24em',
            margin: '32px 0 0', textTransform: 'uppercase', display: 'flex',
          }}>
            ◆  {date}  ◆
          </p>
        ) : null}

        {/* Footer branding */}
        <p style={{
          position: 'absolute', bottom: '44px',
          color: '#b08a52', fontSize: 16, letterSpacing: '0.28em',
          textTransform: 'uppercase', margin: 0, display: 'flex',
        }}>
          MajlisMate
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
