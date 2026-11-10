import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { captureWithCamera, pickFromLibrary, saveScan, type Progress } from './scan';

/** Shared scan flow: capture, read text on-device, save, open the result. */
export function useScan() {
  const [progress, setProgress] = useState<Progress | null>(null);

  const run = useCallback(async (source: 'camera' | 'library') => {
    try {
      const uris = source === 'camera' ? await captureWithCamera() : await pickFromLibrary();
      if (!uris) return null;
      setProgress({ step: 'prepare', page: 1, total: uris.length });
      const id = await saveScan(uris, setProgress);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProgress(null);
      router.push({ pathname: '/doc/[id]', params: { id, fresh: '1' } });
      return id;
    } catch (e: any) {
      setProgress(null);
      Alert.alert('Could not scan', e?.message ?? 'Something went wrong. Please try again.');
      return null;
    }
  }, []);

  return { progress, scan: () => run('camera'), importPhotos: () => run('library') };
}
