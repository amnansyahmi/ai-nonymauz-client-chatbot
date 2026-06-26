'use client';

import { useRef, useState } from 'react';
import type { AttachedImage } from '@/lib/ai/imageUpload';
import { formatBytes, readImage } from '@/lib/ai/imageUpload';
import { trackEvent } from '@/lib/analytics';

type ImageUploadButtonProps = {
  onAttach: (image: AttachedImage) => void;
  onError?: (message: string) => void;
  language?: 'ms' | 'en';
  accept?: string;
};

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export default function ImageUploadButton({
  onAttach,
  onError,
  language = 'ms',
  accept = 'image/jpeg,image/png,image/webp,image/gif'
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AttachedImage | null>(null);
  const [error, setError] = useState('');
  const isMs = language === 'ms';

  async function handleFile(file: File) {
    setError('');
    const result = await readImage(file);
    if (!result.ok) {
      setError(result.message);
      onError?.(result.message);
      trackEvent('image_upload_error', { reason: result.reason });
      return;
    }
    setPreview(result.image);
    onAttach(result.image);
    trackEvent('image_uploaded', { size: result.image.size, type: result.image.type });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleFile(file);
    event.target.value = '';
  }

  function clearPreview() {
    setPreview(null);
    setError('');
  }

  return (
    <div className="image-upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="image-upload__input"
        aria-label={isMs ? 'Lampirkan gambar' : 'Attach image'}
      />
      <button
        type="button"
        className="image-upload__btn"
        onClick={() => inputRef.current?.click()}
        aria-label={isMs ? 'Lampirkan gambar' : 'Attach image'}
        title={isMs ? 'Lampirkan gambar' : 'Attach image'}
        data-event="image_attach"
      >
        <CameraIcon />
      </button>
      {preview ? (
        <div className="image-upload__preview" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.dataUrl} alt={preview.name} />
          <div className="image-upload__preview-info">
            <span className="image-upload__preview-name">{preview.name}</span>
            <span className="image-upload__preview-size">{formatBytes(preview.size)}</span>
          </div>
          <button
            type="button"
            className="image-upload__clear"
            onClick={clearPreview}
            aria-label={isMs ? 'Buang gambar' : 'Remove image'}
            data-event="image_clear"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}
      {error ? (
        <span className="image-upload__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
