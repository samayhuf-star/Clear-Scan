import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import { abs, ensureDir, move } from './files';
import type { PageRow } from './db';

export type Quality = 'small' | 'medium' | 'original';

export const QUALITY: Record<Quality, { label: string; hint: string; width: number; compress: number }> = {
  small: { label: 'Small', hint: 'Best for email and portals', width: 1000, compress: 0.5 },
  medium: { label: 'Medium', hint: 'Balanced, recommended', width: 1600, compress: 0.7 },
  original: { label: 'Original', hint: 'Sharpest, largest file', width: 2400, compress: 0.88 },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Builds a searchable PDF: each page is the scanned image with the recognised text laid over it as
 * invisible text, so the PDF can be searched and selected in any viewer. No watermark, ever.
 */
export async function buildPdf(docId: string, pages: PageRow[], quality: Quality = 'medium'): Promise<string> {
  const q = QUALITY[quality];
  const sections: string[] = [];

  for (const p of pages) {
    const out = await ImageManipulator.manipulateAsync(abs(p.image), [{ resize: { width: q.width } }], {
      compress: q.compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    const text = esc(p.text).replace(/\n/g, '<br/>');
    sections.push(`
      <section class="page">
        <img src="data:image/jpeg;base64,${out.base64}" />
        <div class="ocr">${text}</div>
      </section>`);
  }

  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; }
      .page { position: relative; width: 595px; height: 842px; page-break-after: always; overflow: hidden; background: #fff; }
      .page:last-child { page-break-after: auto; }
      .page img { position: absolute; inset: 0; width: 595px; height: 842px; object-fit: contain; }
      .ocr { position: absolute; inset: 0; color: transparent; font-size: 9px; line-height: 11px; padding: 24px; overflow: hidden; }
    </style></head><body>${sections.join('')}</body></html>`;

  const res = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const rel = `scans/${docId}/document-${quality}.pdf`;
  await ensureDir(`scans/${docId}`);
  await move(res.uri, rel);
  return abs(rel);
}
