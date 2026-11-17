// Web preview build: the camera and on-device text reading only exist in the iPhone app.
export type Progress = { step: 'prepare' | 'ocr' | 'save'; page: number; total: number };

export async function captureWithCamera(): Promise<string[] | null> {
  return null;
}
export async function pickFromLibrary(): Promise<string[] | null> {
  return null;
}
export type ScanMode = 'doc' | 'book';
export async function saveScan(_uris: string[], _onProgress?: (p: Progress) => void, _mode: ScanMode = 'doc'): Promise<string> {
  throw new Error('Scanning needs the iPhone app.');
}
export async function addPagesToDoc(_docId: string, _uris: string[], _onProgress?: (p: Progress) => void, _mode: ScanMode = 'doc'): Promise<void> {
  throw new Error('Scanning needs the iPhone app.');
}
export async function rotatePage(_rel: string): Promise<void> {
  throw new Error('Rotating needs the iPhone app.');
}
