import { downloadBlob, stamp } from './json';

const BG = '#0b0f2a';

async function capture(node: HTMLElement): Promise<string> {
  const { toJpeg } = await import('html-to-image');
  return toJpeg(node, {
    quality: 0.92,
    pixelRatio: 2,
    backgroundColor: BG,
    cacheBust: true,
    // les éléments marqués data-no-export (boutons, filtres) ne sont pas capturés
    filter: (el) => !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
  });
}

export async function exportJpg(node: HTMLElement, name = 'dashboard') {
  const dataUrl = await capture(node);
  const blob = await (await fetch(dataUrl)).blob();
  downloadBlob(blob, `journal-xauusd-${name}-${stamp()}.jpg`);
}

/** PDF A4 portrait ; l'image est découpée proprement sur plusieurs pages si nécessaire */
export async function exportPdf(node: HTMLElement, name = 'dashboard') {
  const [{ jsPDF }, dataUrl] = await Promise.all([import('jspdf'), capture(node)]);
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const w = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const pxPerMm = img.width / w;
  const slicePx = Math.floor(usableH * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0, page = 0; y < img.height; y += slicePx, page++) {
    const h = Math.min(slicePx, img.height - y);
    canvas.height = h;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, h);
    ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
    if (page > 0) pdf.addPage();
    pdf.setFillColor(BG);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, h / pxPerMm);
  }
  pdf.save(`journal-xauusd-${name}-${stamp()}.pdf`);
}
