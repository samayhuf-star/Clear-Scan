import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { addPagesToDoc, captureWithCamera, pickFromLibrary, saveScan, type Progress, type ScanMode } from './scan';
import { noteSuccess } from './reviewPrompt';

/** Shared scan flow: capture, read text on-device, save, open the result. */
export function useScan() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [mode, setMode] = useState<ScanMode>('doc');

  const run = useCallback(async (source: 'camera' | 'library') => {
    try {
      const uris = source === 'camera' ? await captureWithCamera() : await pickFromLibrary();
      if (!uris) return null;
      setProgress({ step: 'prepare', page: 1, total: uris.length });
      const id = await saveScan(uris, setProgress, mode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProgress(null);
      router.push({ pathname: '/doc/[id]', params: { id, fresh: '1' } });
      noteSuccess(2); // rating prompt after the 2nd saved scan
      return id;
    } catch (e: any) {
      setProgress(null);
      Alert.alert('Could not scan', e?.message ?? 'Something went wrong. Please try again.');
      return null;
    }
  }, [mode]);

  /** Scan more pages into an existing document. Returns true if pages were added. */
  const addTo = useCallback(async (docId: string, source: 'camera' | 'library' = 'camera') => {
    try {
      const uris = source === 'camera' ? await captureWithCamera() : await pickFromLibrary();
      if (!uris) return false;
      setProgress({ step: 'prepare', page: 1, total: uris.length });
      await addPagesToDoc(docId, uris, setProgress, mode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProgress(null);
      return true;
    } catch (e: any) {
      setProgress(null);
      Alert.alert('Could not add pages', e?.message ?? 'Something went wrong. Please try again.');
      return false;
    }
  }, [mode]);

  return { progress, mode, setMode, addTo, scan: () => run('camera'), importPhotos: () => run('library') };
}
