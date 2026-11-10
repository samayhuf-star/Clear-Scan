import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { kvGet } from '../lib/db';
import { initPurchases } from '../lib/purchases';
import { Press } from '../components/Press';

function LockGate({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [locked, setLocked] = useState(() => kvGet('lock') === '1');
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock ClearScan' });
      if (res.success) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' && kvGet('lock') === '1') setLocked(true);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View style={[s.lock, { backgroundColor: t.navy }]}>
          <Ionicons name="lock-closed" size={44} color="#fff" />
          <Text style={s.lockTitle}>ClearScan is locked</Text>
          <Press onPress={unlock} style={s.lockBtn}>
            <Text style={s.lockBtnText}>Unlock</Text>
          </Press>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const t = useTheme();
  useEffect(() => {
    initPurchases();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <LockGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="doc/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          </Stack>
        </LockGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  lock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 100 },
  lockTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  lockBtn: { backgroundColor: '#1F6BFF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 },
  lockBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
