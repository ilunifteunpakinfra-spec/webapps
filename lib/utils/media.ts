// ============================================
// ILUNI FTE WebApps - Client-Side Media Helpers
// ============================================

/**
 * Downscale and re-encode an image (profile photos, gallery uploads)
 * before it is uploaded to Supabase Storage. Reduces bandwidth and
 * storage cost on the free tier.
 */
export function compressImage(
  file: File,
  maxDimension = 512,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Browser tidak mendukung kompresi gambar.'));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Gagal mengompres gambar.')),
        'image/jpeg',
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca file gambar.'));
    };

    image.src = objectUrl;
  });
}

/** Validate that a file is a PDF within the 2MB BRD limit. */
export function validateResume(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'File resume harus berformat PDF.';
  }
  if (file.size > 2 * 1024 * 1024) {
    return 'Ukuran file resume maksimal 2MB.';
  }
  return null;
}
