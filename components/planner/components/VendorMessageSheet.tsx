'use client';

import { useMemo, useState } from 'react';
import type { AppLanguage, PlannerProfile, Vendor } from '../types';
import {
  buildVendorMessage,
  intentLabel,
  VENDOR_MESSAGE_INTENTS,
  whatsappLink,
  type VendorMessageIntent
} from '../../../lib/planner/vendorMessages';

type Props = {
  vendor: Vendor;
  profile: PlannerProfile;
  language: AppLanguage;
  onClose: () => void;
};

export default function VendorMessageSheet({ vendor, profile, language, onClose }: Props) {
  const isMs = language === 'ms';
  const [intent, setIntent] = useState<VendorMessageIntent>('enquiry');
  const generated = useMemo(
    () => buildVendorMessage(vendor, profile, intent, language),
    [vendor, profile, intent, language]
  );
  const [draft, setDraft] = useState(generated);
  const [editedIntent, setEditedIntent] = useState<VendorMessageIntent | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-generate when intent changes unless the user has manually edited.
  const message = editedIntent === intent ? draft : generated;

  function pickIntent(next: VendorMessageIntent) {
    setIntent(next);
    setEditedIntent(null);
    setCopied(false);
  }

  function onEdit(value: string) {
    setDraft(value);
    setEditedIntent(intent);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="vendor-msg-backdrop" role="presentation" onClick={onClose}>
      <section
        className="vendor-msg-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-msg-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vendor-msg-head">
          <div>
            <span className="vendor-msg-eyebrow">{isMs ? 'Mesej vendor' : 'Vendor message'}</span>
            <h3 id="vendor-msg-title">{vendor.name}</h3>
            <p className="vendor-msg-sub">{vendor.category}{vendor.negeri ? ` · ${vendor.negeri}` : ''}</p>
          </div>
          <button type="button" className="vendor-msg-close" aria-label={isMs ? 'Tutup' : 'Close'} onClick={onClose}>×</button>
        </header>

        <div className="vendor-msg-intents" role="tablist">
          {VENDOR_MESSAGE_INTENTS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={intent === option}
              className={`vendor-msg-intent${intent === option ? ' is-active' : ''}`}
              onClick={() => pickIntent(option)}
            >
              {intentLabel(option, language)}
            </button>
          ))}
        </div>

        <textarea
          className="vendor-msg-text"
          value={message}
          onChange={(event) => onEdit(event.target.value)}
          rows={10}
          aria-label={isMs ? 'Teks mesej' : 'Message text'}
        />

        <div className="vendor-msg-actions">
          <button type="button" className="vendor-msg-copy" onClick={copy}>
            {copied ? (isMs ? 'Disalin ✓' : 'Copied ✓') : (isMs ? 'Salin' : 'Copy')}
          </button>
          <a
            className="vendor-msg-wa"
            href={whatsappLink(vendor.contact, message)}
            target="_blank"
            rel="noreferrer"
          >
            {isMs ? 'Buka WhatsApp' : 'Open WhatsApp'}
          </a>
        </div>
        <p className="vendor-msg-hint">
          {isMs
            ? 'Tip: semak & ubah mesej sebelum hantar. Harga & tarikh sahkan dengan vendor.'
            : 'Tip: review & edit before sending. Confirm price & dates with the vendor.'}
        </p>
      </section>
    </div>
  );
}
