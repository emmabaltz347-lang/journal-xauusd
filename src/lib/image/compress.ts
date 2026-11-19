export interface CompressedImage {
  blob: Blob;
  ext: 'webp' | 'jpg';
  width: number;
  height: number;
}

const MAX_WIDTH = 1600;

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // l'image est décodée, l'URL peut être libérée après le dessin
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Redimensionne à 1600 px de large maximum et encode en WebP.
 * Si le navigateur ne sait pas encoder le WebP (anciens Safari), repli en JPEG.
 */
export async function compressImage(file: Blob, quality = 0.82): Promise<CompressedImage> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob('image/webp');
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp', width, height };
  const jpg = await toBlob('image/jpeg');
  if (!jpg) throw new Error("Impossible de compresser l'image");
  return { blob: jpg, ext: 'jpg', width, height };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
