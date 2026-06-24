'use client';

import { useMemo, useState } from 'react';
import { decodeRsvpToken, buildGuestSubmitWhatsApp } from '../../../lib/planner/rsvpLink';
import styles from './rsvp.module.css';

export default function RsvpClient({ token }: { token: string }) {
  const payload = useMemo(() => decodeRsvpToken(token || ''), [token]);

  const ms = (payload?.lang ?? 'ms') === 'ms';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pax, setPax] = useState(1);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!payload) {
    return (
      <main className={styles.page}>
        <div className={styles.invalid}>
          <span className={styles.invalidIcon} aria-hidden="true">✦</span>
          <h1>{ms ? 'Pautan tidak sah' : 'Invalid link'}</h1>
          <p>{ms ? 'Jemputan RSVP ini tidak dapat dibaca. Sila minta pautan baharu daripada pasangan.' : 'This RSVP invite could not be read. Please ask the couple for a fresh link.'}</p>
        </div>
      </main>
    );
  }

  // Split "Name1 & Name2" into two display lines
  const nameParts = payload.couple.split(/\s*&\s*|\s+dan\s+/i);
  const name1 = nameParts[0]?.trim() || payload.couple;
  const name2 = nameParts[1]?.trim() || '';

  const canSubmit = name.trim().length > 0 && attending !== null;

  function handleSubmit() {
    if (!payload || attending === null || !name.trim()) return;
    const url = buildGuestSubmitWhatsApp(payload, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      pax: attending ? pax : undefined,
      attending
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* ── Invitation header ─────────────────────────── */}
        <header className={styles.invite}>
          <p className={styles.eyebrow}>
            {ms ? 'Anda Dijemput · Sila Maklumkan Kehadiran Anda' : "You're Invited · Please Let Us Know If You Can Make It"}
          </p>

          <div className={styles.coupleBlock}>
            <h1 className={styles.coupleName}>{name1}</h1>
            {name2 ? (
              <>
                <span className={styles.ampersand}>&amp;</span>
                <h1 className={styles.coupleName}>{name2}</h1>
              </>
            ) : null}
          </div>

          {/* Date + time */}
          {payload.date ? (
            <div className={styles.dateLine}>
              <span className={styles.diamond} aria-hidden="true">◆</span>
              <span className={styles.dateText}>{payload.date}</span>
              <span className={styles.diamond} aria-hidden="true">◆</span>
            </div>
          ) : null}
          {payload.time ? (
            <p className={styles.timeLine}>( {payload.time} )</p>
          ) : null}

          {/* Venue separator */}
          {(payload.venue || payload.location) ? (
            <>
              <div className={styles.divider} aria-hidden="true" />
              <p className={styles.venue}>
                {[payload.venue, payload.location].filter(Boolean).join(', ')}
              </p>
              <div className={styles.divider} aria-hidden="true" />
            </>
          ) : null}

          <span className={styles.ornament} aria-hidden="true">◆</span>
        </header>

        {/* ── Form ──────────────────────────────────────── */}
        {submitted ? (
          <section className={styles.thankyou}>
            <div className={styles.tickCircle} aria-hidden="true">✓</div>
            <strong className={styles.thankyouTitle}>{ms ? 'Terima kasih!' : 'Thank you!'}</strong>
            <p className={styles.hint}>
              {ms
                ? 'RSVP anda sedia untuk dihantar melalui WhatsApp. Pastikan anda tekan hantar dalam WhatsApp untuk sahkan kehadiran.'
                : 'Your RSVP is ready to send via WhatsApp. Make sure you press send in WhatsApp to confirm.'}
            </p>
            <button type="button" className={styles.changeBtn} onClick={() => setSubmitted(false)}>
              {ms ? 'Ubah jawapan' : 'Change response'}
            </button>
          </section>
        ) : (
          <section className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="rsvp-name" className={styles.label}>
                {ms ? 'Nama Anda' : 'Your Name'}
              </label>
              <input
                id="rsvp-name"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ms ? 'Nama penuh' : 'Enter your full name'}
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rsvp-phone" className={styles.label}>
                {ms ? 'Nombor Telefon (pilihan)' : 'Phone Number (optional)'}
              </label>
              <input
                id="rsvp-phone"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+60123456789"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{ms ? 'Adakah anda akan hadir?' : 'Will you attend?'}</label>
              <div className={styles.attendGrid}>
                <button
                  type="button"
                  className={`${styles.attendBtn} ${attending === true ? styles.attendYes : ''}`}
                  aria-pressed={attending === true}
                  onClick={() => setAttending(true)}
                >
                  <span className={styles.attendIcon} aria-hidden="true">{attending === true ? '✓' : '○'}</span>
                  {ms ? 'Saya akan hadir' : "I'll be there"}
                </button>
                <button
                  type="button"
                  className={`${styles.attendBtn} ${attending === false ? styles.attendNo : ''}`}
                  aria-pressed={attending === false}
                  onClick={() => setAttending(false)}
                >
                  <span className={styles.attendIcon} aria-hidden="true">{attending === false ? '✕' : '○'}</span>
                  {ms ? 'Tidak dapat hadir' : "Can't make it"}
                </button>
              </div>
            </div>

            {attending === true ? (
              <div className={styles.field}>
                <label className={styles.label}>{ms ? 'Bilangan kehadiran' : 'Number attending'}</label>
                <div className={styles.stepper}>
                  <button type="button" aria-label={ms ? 'Kurang' : 'Decrease'} onClick={() => setPax((v) => Math.max(1, v - 1))}>−</button>
                  <strong>{pax}</strong>
                  <button type="button" aria-label={ms ? 'Tambah' : 'Increase'} onClick={() => setPax((v) => Math.min(20, v + 1))}>+</button>
                </div>
              </div>
            ) : null}

            <button type="button" className={styles.submit} disabled={!canSubmit} onClick={handleSubmit}>
              {ms ? 'Hantar RSVP' : 'Submit RSVP'}
            </button>
            <p className={styles.hint}>
              {ms
                ? 'RSVP anda akan dihantar kepada pasangan melalui WhatsApp.'
                : 'Your RSVP will be sent to the couple via WhatsApp.'}
            </p>
          </section>
        )}

        <p className={styles.footer}>
          <span className={styles.footerDot} aria-hidden="true">◆</span>
          {ms ? 'Dikuasakan oleh MajlisMate' : 'Powered by MajlisMate'}
        </p>
      </div>
    </main>
  );
}
