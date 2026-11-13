import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import * as FS from 'expo-file-system/legacy';
import { copyIn, ensureDir, abs, exists } from './files';
import { classify, smartTitle } from './classify';
import { insertDoc } from './db';

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

// Sim-QA only: flow.sh copies the fixture invoice here so import can skip the
// system photo picker. The file is never shipped with the app.
const QA_INBOX = '.clearscan-qa-inbox.jpg';

export async function pickFromLibrary(): Promise<string[] | null> {
  if (await exists(QA_INBOX)) {
    return [abs(QA_INBOX)];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: 40,
  });
  if (res.canceled || !res.assets.length) return null;
  return res.assets.map((a) => a.uri);
}

function looksLikeFileProvider(uri: string): boolean {
  return /File Provider|File%20Provider|photospicker/i.test(uri);
}

function timed<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** Copy a PHPicker / File Provider URI into the cache so ImageManipulator can open it. */
async function materializeLocally(uri: string): Promise<string> {
  if (!looksLikeFileProvider(uri)) return uri;
  const dest = `${FS.cacheDirectory ?? ''}clearscan-import-${Date.now()}.jpg`;
  await timed(FS.copyAsync({ from: uri, to: dest }), 8000, 'copy-timeout');
  return dest;
}

async function normalizeJpeg(uri: string): Promise<string> {
  let src = uri;
  try {
    src = await materializeLocally(uri);
  } catch {
    src = uri;
  }
  try {
    const norm = await timed(
      ImageManipulator.manipulateAsync(src, [], {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      }),
      12000,
      'normalize-timeout'
    );
    return norm.uri;
  } catch {
    return src;
  }
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

/**
 * Saves scanned images as a document: copies them into the app, reads the text on-device,
 * names and sorts the document, and stores everything locally.
 */
async function holdIfQaRequested() {
  // Used only by the sim-QA runner: a marker file in Documents keeps the
  // in-app scanning overlay on screen long enough for a clean screenshot.
  // The file is never shipped with the app and is absent in App Store builds.
  try {
    if (await exists('.clearscan-qa-hold')) {
      await new Promise((r) => setTimeout(r, 2800));
    }
  } catch {
    /* ignore */
  }
}

export async function saveScan(uris: string[], onProgress?: (p: Progress) => void): Promise<string> {
  const id = newId();
  const created = Date.now();
  await holdIfQaRequested();
  await ensureDir(`scans/${id}`);

  const pages: { image: string; text: string }[] = [];
  for (let i = 0; i < uris.length; i++) {
    onProgress?.({ step: 'prepare', page: i + 1, total: uris.length });
    // Normalise to an upright JPEG so every viewer and the OCR agree on orientation.
    // PHPicker File Provider URIs can hang ImageManipulator on the iOS simulator;
    // materialize them first and fall back to the source file if normalize times out.
    const normUri = await normalizeJpeg(uris[i]);
    const rel = `scans/${id}/page-${i + 1}.jpg`;
    await copyIn(normUri, rel);

    onProgress?.({ step: 'ocr', page: i + 1, total: uris.length });
    const text = await recognise(abs(rel));
    pages.push({ image: rel, text });
  }

  onProgress?.({ step: 'save', page: uris.length, total: uris.length });
  const all = pages.map((p) => p.text).join('\n');
  insertDoc(
    { id, title: smartTitle(all, created), kind: classify(all), created, pages: pages.length, favorite: 0 },
    pages
  );
  return id;
}
