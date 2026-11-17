import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { copyIn, ensureDir, abs } from './files';
import { classify, smartTitle } from './classify';
import { insertDoc, appendPages, getPages } from './db';

export type Progress = { step: 'prepare' | 'ocr' | 'save'; page: number; total: number };

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Opens the system document camera (VisionKit on iPhone). Returns image URIs, or null if cancelled. */
export async function captureWithCamera(): Promise<string[] | null> {
  const res = await DocumentScanner.scanDocument({ croppedImageQuality: 100, maxNumDocuments: 40 });
  if (res.status !== ScanDocumentResponseStatus.Success || !res.scannedImages?.length) return null;
  return res.scannedImages;
}

export async function pickFromLibrary(): Promise<string[] | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: 40,
  });
  if (res.canceled || !res.assets.length) return null;
  return res.assets.map((a) => a.uri);
}

async function recognise(uri: string): Promise<string> {
  try {
    if (!isSupported) return '';
    const lines = await extractTextFromImage(uri);
    return lines.join('\n');
  } catch {
    return '';
  }
}

export type ScanMode = 'doc' | 'book';

async function preparePages(
  id: string,
  uris: string[],
  startIdx: number,
  mode: ScanMode,
  onProgress?: (p: Progress) => void
): Promise<{ image: string; text: string }[]> {
  const out: { image: string; text: string }[] = [];
  // Book mode turns every photo of an open book into two pages, left then right.
  const jobs: { uri: string; crop?: 'left' | 'right' }[] = [];
  for (const u of uris) {
    if (mode === 'book') {
      jobs.push({ uri: u, crop: 'left' }, { uri: u, crop: 'right' });
    } else jobs.push({ uri: u });
  }
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    onProgress?.({ step: 'prepare', page: i + 1, total: jobs.length });
    // Normalise to an upright JPEG so every viewer and the OCR agree on orientation.
    let actions: ImageManipulator.Action[] = [];
    if (job.crop) {
      const base = await ImageManipulator.manipulateAsync(job.uri, [], { format: ImageManipulator.SaveFormat.JPEG });
      const half = Math.floor(base.width / 2);
      actions = [{ crop: { originX: job.crop === 'left' ? 0 : half, originY: 0, width: half, height: base.height } }];
    }
    const norm = await ImageManipulator.manipulateAsync(job.uri, actions, {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const rel = `scans/${id}/page-${startIdx + i + 1}.jpg`;
    await copyIn(norm.uri, rel);
    onProgress?.({ step: 'ocr', page: i + 1, total: jobs.length });
    out.push({ image: rel, text: await recognise(abs(rel)) });
  }
  return out;
}

/**
 * Saves scanned images as a document: copies them into the app, reads the text on-device,
 * names and sorts the document, and stores everything locally.
 */
export async function saveScan(uris: string[], onProgress?: (p: Progress) => void, mode: ScanMode = 'doc'): Promise<string> {
  const id = newId();
  const created = Date.now();
  await ensureDir(`scans/${id}`);
  const pages = await preparePages(id, uris, 0, mode, onProgress);
  onProgress?.({ step: 'save', page: pages.length, total: pages.length });
  const all = pages.map((p) => p.text).join('\n');
  insertDoc(
    { id, title: smartTitle(all, created), kind: classify(all), created, pages: pages.length, favorite: 0 },
    pages
  );
  return id;
}

/** Adds more pages to an existing document so it stays one PDF. */
export async function addPagesToDoc(docId: string, uris: string[], onProgress?: (p: Progress) => void, mode: ScanMode = 'doc') {
  const existing = getPages(docId).length;
  await ensureDir(`scans/${docId}`);
  const pages = await preparePages(docId, uris, existing, mode, onProgress);
  appendPages(docId, pages);
}

/** Turns a page a quarter turn clockwise (fixes a sideways scan). */
export async function rotatePage(rel: string) {
  const r = await ImageManipulator.manipulateAsync(abs(rel), [{ rotate: 90 }], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  await copyIn(r.uri, rel);
}
