import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { abs, ensureDir, writeText } from './files';
import { buildPdf, type Quality } from './pdf';
import type { Doc, PageRow } from './db';

const safeName = (s: string) => s.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 60) || 'Scan';

export async function sharePdf(doc: Doc, pages: PageRow[], quality: Quality) {
  const uri = await buildPdf(doc.id, pages, quality);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.title });
}

export async function shareImages(doc: Doc, pages: PageRow[]) {
  // Share the first page image; the share sheet handles one file at a time.
  await Sharing.shareAsync(abs(pages[0].image), { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: doc.title });
}

export async function shareText(doc: Doc, pages: PageRow[]) {
  await Share.share({ message: pages.map((p) => p.text).join('\n\n'), title: doc.title });
}

/** Pro: Markdown file with one heading per page. */
export async function shareMarkdown(doc: Doc, pages: PageRow[]) {
  await ensureDir(`scans/${doc.id}`);
  const rel = `scans/${doc.id}/${safeName(doc.title)}.md`;
  const body = `# ${doc.title}\n\n` + pages.map((p, i) => `## Page ${i + 1}\n\n${p.text}\n`).join('\n');
  await writeText(rel, body);
  await Sharing.shareAsync(abs(rel), { mimeType: 'text/markdown', UTI: 'net.daringfireball.markdown', dialogTitle: doc.title });
}

/** Pro: Word-compatible file (HTML saved as .doc opens in Word and Pages). */
export async function shareWord(doc: Doc, pages: PageRow[]) {
  await ensureDir(`scans/${doc.id}`);
  const rel = `scans/${doc.id}/${safeName(doc.title)}.doc`;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(doc.title)}</title></head><body>` +
    `<h1>${esc(doc.title)}</h1>` +
    pages.map((p, i) => `<h2>Page ${i + 1}</h2><p>${esc(p.text).replace(/\n/g, '<br/>')}</p>`).join('') +
    `</body></html>`;
  await writeText(rel, html);
  await Sharing.shareAsync(abs(rel), { mimeType: 'application/msword', UTI: 'com.microsoft.word.doc', dialogTitle: doc.title });
}
