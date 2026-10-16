/**
 * Client-side image compression, run before upload so phone photos
 * (often 4–12 MB) become a few hundred KB. Resizes so the longest edge
 * is <= MAX_EDGE and re-encodes as WebP (JPEG fallback). Never throws:
 * on any failure, or if the result isn't smaller, the original file is
 * returned so sending still works. The server applies its own 1600px
 * limit as a backstop.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.8;
const SKIP_BELOW_BYTES = 150 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function compressImage(file) {
  try {
    if (file.size < SKIP_BELOW_BYTES) return file;
    if (typeof createImageBitmap !== 'function') return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      // Browser can't encode WebP — JPEG has no alpha, so paint white first.
      const flat = document.createElement('canvas');
      flat.width = width;
      flat.height = height;
      const fctx = flat.getContext('2d');
      fctx.fillStyle = '#fff';
      fctx.fillRect(0, 0, width, height);
      fctx.drawImage(canvas, 0, 0);
      blob = await canvasToBlob(flat, 'image/jpeg', QUALITY);
      ext = 'jpg';
    }
    if (!blob || blob.size >= file.size) return file;

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
