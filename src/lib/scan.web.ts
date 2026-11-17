// Web preview build: the camera and on-device text reading only exist in the iPhone app.
export type Progress = { step: 'prepare' | 'ocr' | 'save'; page: number; total: number };

export async function captureWithCamera(): Promise<string[] | null> {
  return null;
}
export async function pickFromLibrary(): Promise<string[] | null> {
  return null;
}
export async function saveScan(_uris: string[], _onProgress?: (p: Progress) => void): Promise<string> {
  throw new Error('Scanning needs the iPhone app.');
}
