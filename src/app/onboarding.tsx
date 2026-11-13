import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { OcrScene, PrivateScene, ScanScene } from '../components/OnboardingArt';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { kvSet } from '../lib/db';
import { useScan } from '../lib/useScan';

const SLIDES = [
  {
    key: 'scan',
    title: 'Scan anything.\nNo watermark.',
    body: 'Clean PDFs, every time. Nothing stamped on your pages, on any plan.',
    Art: ScanScene,
  },
  {
    key: 'ocr',
    title: 'Free OCR.\nSearch every word.',
    body: 'Text is read automatically and made searchable. No extra tap, no upgrade.',
    Art: OcrScene,
  },
  {
    key: 'private',
    title: 'Stays on\nyour iPhone.',
    body: 'Scanning and reading happen on the device. No account, no uploads, works offline.',
    Art: PrivateScene,
  },
] as const;

function Dot({ i, x, w }: { i: number; x: SharedValue<number>; w: number }) {
  const a = useAnimatedStyle(() => ({
    width: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [8, 28, 8], Extrapolation.CLAMP),
    opacity: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[s.dot, a]} />;
}

function Slide({ i, x, w, item }: { i: number; x: SharedValue<number>; w: number; item: (typeof SLIDES)[number] }) {
  const art = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [w * 0.45, 0, -w * 0.45], Extrapolation.CLAMP) },
      { scale: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [0.8, 1, 0.8], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [0, 1, 0], Extrapolation.CLAMP),
  }));
  const copy = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [w * 0.2, 0, -w * 0.2], Extrapolation.CLAMP) }],
    opacity: interpolate(x.value, [(i - 0.6) * w, i * w, (i + 0.6) * w], [0, 1, 0], Extrapolation.CLAMP),
  }));
  return (
    <View style={{ width: w, alignItems: 'center' }}>
      <Animated.View style={[{ flex: 1, justifyContent: 'center' }, art]}>
        <item.Art />
      </Animated.View>
      <Animated.View style={[s.copy, copy]}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.body}>{item.body}</Text>
      </Animated.View>
    </View>
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(0);
  const list = useRef<Animated.ScrollView>(null);
  const [page, setPage] = useState(0);
  const { progress, scan } = useScan();

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const finish = async (tryScan: boolean) => {
    kvSet('onboarded', '1');
    router.replace('/');
    if (tryScan) setTimeout(() => scan(), 350);
  };

  const last = page === SLIDES.length - 1;

  return (
    <View style={s.root} testID="onboarding-screen">
      <LinearGradient colors={['#0B1B33', '#10294D', '#0B1B33']} style={StyleSheet.absoluteFill} />
      <View style={[s.top, { paddingTop: insets.top + 8 }]}>
        <Text style={s.brand}>ClearScan</Text>
        {!last && (
          <Press onPress={() => finish(false)} hitSlop={12} accessibilityLabel="Skip introduction" testID="onboarding-skip">
            <Text style={s.skip}>Skip</Text>
          </Press>
        )}
      </View>

      <Animated.ScrollView
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((item, i) => (
          <Slide key={item.key} i={i} x={x} w={width} item={item} />
        ))}
      </Animated.ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} x={x} w={width} />
          ))}
        </View>
        <Animated.View entering={FadeInDown.delay(150)} style={{ width: '100%' }}>
          <Press
            haptic="medium"
            onPress={() => {
              if (last) finish(true);
              else {
                const next = page + 1;
                list.current?.scrollTo({ x: next * width, animated: true });
                setPage(next);
              }
            }}
            style={s.cta}
          >
            <Text style={s.ctaText}>{last ? 'Try your first scan' : 'Continue'}</Text>
          </Press>
          {last && (
            <Press onPress={() => finish(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={s.skip}>Not now</Text>
            </Press>
          )}
        </Animated.View>
      </View>
      <ProcessingOverlay progress={progress} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1B33' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 4 },
  brand: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  skip: { color: '#93A1BA', fontSize: 16, fontWeight: '600' },
  copy: { paddingHorizontal: 28, paddingBottom: 8, minHeight: 170, alignSelf: 'stretch' },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  body: { color: '#B6C3DA', fontSize: 16, lineHeight: 23, marginTop: 12 },
  bottom: { paddingHorizontal: 24, gap: 18, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, height: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  cta: { backgroundColor: '#1F6BFF', borderRadius: 18, paddingVertical: 17, alignItems: 'center', shadowColor: '#1F6BFF', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
