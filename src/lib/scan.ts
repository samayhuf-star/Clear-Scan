import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { copyIn, ensureDir, abs } from './files';
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

/**
 * Saves scanned images as a document: copies them into the app, reads the text on-device,
 * names and sorts the document, and stores everything locally.
 */
export async function saveScan(uris: string[], onProgress?: (p: Progress) => void): Promise<string> {
  const id = newId();
  const created = Date.now();
  await ensureDir(`scans/${id}`);

  const pages: { image: string; text: string }[] = [];
  for (let i = 0; i < uris.length; i++) {
    onProgress?.({ step: 'prepare', page: i + 1, total: uris.length });
    // Normalise to an upright JPEG so every viewer and the OCR agree on orientation.
    const norm = await ImageManipulator.manipulateAsync(uris[i], [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const rel = `scans/${id}/page-${i + 1}.jpg`;
    await copyIn(norm.uri, rel);

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
