/**
 * Image upload utility. Validates, reads as data URL, and creates
 * preview-ready objects. Used by the chat composer to attach photos
 * (venue, baju pengantin, decor) for future multi-modal AI support.
 */

export type AttachedImage = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  width?: number;
  height?: number;
  capturedAt: string;
};

export type ImageValidationError = {
  ok: false;
  reason: 'too-large' | 'unsupported-type' | 'read-failed';
  message: string;
};

export type ImageValidationResult =
  | { ok: true; image: AttachedImage }
  | ImageValidationError;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateImage(file: File): ImageValidationResult {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return {
      ok: false,
      reason: 'unsupported-type',
      message: 'Hanya gambar JPEG, PNG, atau WebP yang disokong.'
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      ok: false,
      reason: 'too-large',
      message: `Gambar terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimum 5MB.`
    };
  }
  return { ok: true, image: { id: '', name: '', size: 0, type: '', dataUrl: '', capturedAt: '' } as unknown as AttachedImage };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Gagal membaca gambar'));
    reader.readAsDataURL(file);
  });
}

function probeDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function readImage(file: File): Promise<ImageValidationResult> {
  const result = validateImage(file);
  if (!result.ok) return result;
  try {
    const dataUrl = await readAsDataUrl(file);
    const dimensions = await probeDimensions(dataUrl);
    return {
      ok: true,
      image: {
        id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        width: dimensions?.width,
        height: dimensions?.height,
        capturedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'read-failed',
      message: error instanceof Error ? error.message : 'Gagal membaca gambar'
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
