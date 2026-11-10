import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Progress } from '../lib/scan';

export function ProcessingOverlay({ progress }: { progress: Progress | null }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [spin]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  if (!progress) return null;

  const label =
    progress.step === 'ocr' ? 'Reading text on your iPhone' : progress.step === 'save' ? 'Saving' : 'Preparing pages';
  const pct = Math.round(((progress.page - (progress.step === 'ocr' ? 0.5 : 1)) / progress.total) * 100);

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(200)} style={s.wrap}>
      <View style={s.card}>
        <Animated.View style={a}>
          <Ionicons name="sync" size={34} color="#5B97FF" />
        </Animated.View>
        <Text style={s.title}>{label}</Text>
        <Text style={s.sub}>
          Page {Math.min(progress.page, progress.total)} of {progress.total} · nothing leaves this device
        </Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.max(6, Math.min(100, pct))}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,17,31,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  card: { width: 280, backgroundColor: '#101C30', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8 },
  title: { color: '#EAF0FA', fontSize: 17, fontWeight: '700', marginTop: 6 },
  sub: { color: '#93A1BA', fontSize: 13, textAlign: 'center' },
  track: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#1D2B44', marginTop: 10, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#1F6BFF' },
});
