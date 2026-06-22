'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { decodeRsvpToken, buildGuestSubmitWhatsApp } from '../../../lib/planner/rsvpLink';
import styles from './rsvp.module.css';

export default function RsvpPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
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
          <h1>{ms ? 'Pautan tidak sah' : 'Invalid link'}</h1>
          <p>{ms ? 'Jemputan RSVP ini tidak dapat dibaca. Sila minta pautan baharu daripada pasangan.' : 'This RSVP invite could not be read. Please ask the couple for a fresh link.'}</p>
        </div>
      </main>
    );
  }

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
        <header className={styles.invite}>
          <p className={styles.eyebrow}>{ms ? "Anda Dijemput" : "You're Invited"}</p>
          <h1 className={styles.couple}>{payload.couple}</h1>
          <div className={styles.ornament} aria-hidden="true">✦</div>
          <p className={styles.meta}>
            <span className={styles.metaStrong}>{payload.date}</span>
            {payload.time ? <> · {payload.time}</> : null}
          </p>
          {(payload.venue || payload.location) ? (
            <p className={styles.meta}>{[payload.venue, payload.location].filter(Boolean).join(', ')}</p>
          ) : null}
        </header>

        {submitted ? (
          <section className={styles.card}>
            <div className={styles.thankyou}>
              <div className={styles.tick} aria-hidden="true">✓</div>
              <strong>{ms ? 'Terima kasih!' : 'Thank you!'}</strong>
              <p className={styles.hint}>
                {ms
                  ? 'RSVP anda sedia untuk dihantar melalui WhatsApp. Pastikan anda tekan hantar dalam WhatsApp untuk sahkan kehadiran.'
                  : 'Your RSVP is ready to send via WhatsApp. Make sure you press send in WhatsApp to confirm.'}
              </p>
              <button type="button" className={styles.submit} onClick={() => setSubmitted(false)}>
                {ms ? 'Ubah jawapan' : 'Change response'}
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.field}>
              <label htmlFor="rsvp-name">{ms ? 'Nama Anda' : 'Your Name'}</label>
              <input
                id="rsvp-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={ms ? 'Nama penuh' : 'Full name'}
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rsvp-phone">{ms ? 'Nombor Telefon (pilihan)' : 'Phone Number (optional)'}</label>
              <input
                id="rsvp-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+60123456789"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className={styles.field}>
              <label>{ms ? 'Adakah anda akan hadir?' : 'Will you attend?'}</label>
              <div className={styles.attendance}>
                <button
                  type="button"
                  className={`${styles.attendBtn} ${attending === true ? styles.active : ''}`}
                  aria-pressed={attending === true}
                  onClick={() => setAttending(true)}
                >
                  <span aria-hidden="true">✓</span>
                  {ms ? 'Saya akan hadir' : "I'll be there"}
                </button>
                <button
                  type="button"
                  className={`${styles.attendBtn} ${attending === false ? styles.active : ''}`}
                  aria-pressed={attending === false}
                  onClick={() => setAttending(false)}
                >
                  <span aria-hidden="true">✕</span>
                  {ms ? 'Tidak dapat hadir' : "Can't make it"}
                </button>
              </div>
            </div>

            {attending === true ? (
              <div className={styles.field}>
                <label>{ms ? 'Bilangan kehadiran' : 'Number attending'}</label>
                <div className={styles.stepper}>
                  <button type="button" aria-label={ms ? 'Kurang' : 'Decrease'} onClick={() => setPax((value) => Math.max(1, value - 1))}>−</button>
                  <strong>{pax}</strong>
                  <button type="button" aria-label={ms ? 'Tambah' : 'Increase'} onClick={() => setPax((value) => Math.min(20, value + 1))}>+</button>
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

        <p className={styles.footer}>{ms ? 'Dikuasakan oleh MajlisMate' : 'Powered by MajlisMate'}</p>
      </div>
    </main>
  );
}
