import { describe, expect, it } from 'vitest';
import { formatBytes, validateImage } from '../lib/ai/imageUpload';

describe('imageUpload', () => {
  describe('validateImage', () => {
    it('rejects unsupported MIME types', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const result = validateImage(file);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('unsupported-type');
    });

    it('rejects files larger than 5 MB', () => {
      const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', {
        type: 'image/jpeg'
      });
      const result = validateImage(file);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('too-large');
    });

    it('accepts a small JPEG', () => {
      const file = new File([new Uint8Array(100)], 'small.jpg', {
        type: 'image/jpeg'
      });
      const result = validateImage(file);
      expect(result.ok).toBe(true);
    });

    it('accepts PNG and WebP', () => {
      const png = new File([new Uint8Array(100)], 'a.png', { type: 'image/png' });
      const webp = new File([new Uint8Array(100)], 'a.webp', { type: 'image/webp' });
      expect(validateImage(png).ok).toBe(true);
      expect(validateImage(webp).ok).toBe(true);
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });
    it('formats kilobytes', () => {
      expect(formatBytes(2048)).toBe('2.0 KB');
    });
    it('formats megabytes', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });
});
