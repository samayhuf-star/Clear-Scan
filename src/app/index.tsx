import React, { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { countDocs, kvGet, kvSet, listDocs, type Doc } from '../lib/db';
import { abs } from '../lib/files';
import { fmtDate, KINDS } from '../lib/classify';
import { usePlus } from '../lib/purchases';
import { useTheme } from '../lib/theme';
import { useScan } from '../lib/useScan';
import { getPages } from '../lib/db';

const PROMO_GAP_MS = 7 * 24 * 3600 * 1000;

function thumbOf(id: string): string | null {
  const p = getPages(id)[0];
  return p ? abs(p.image) : null;
}

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const plus = usePlus();
  const { progress, scan, importPhotos } = useScan();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<string>('All');
  const [promo, setPromo] = useState(false);
  const onboarded = kvGet('onboarded') === '1';

  const refresh = useCallback(() => {
    setDocs(
      listDocs({
        query,
        kind: chip !== 'All' && chip !== 'Starred' ? chip : undefined,
        favorites: chip === 'Starred',
      })
    );
    const last = Number(kvGet('promo_dismissed') ?? 0);
    setPromo(countDocs() >= 3 && Date.now() - last > PROMO_GAP_MS);
  }, [query, chip]);

  useFocusEffect(refresh);
  useEffect(refresh, [refresh]);

  if (!onboarded) return <Redirect href="/onboarding" />;

  const pickChip = (c: string) => {
    if (!plus && KINDS.includes(c as any)) {
      router.push('/paywall');
      return;
    }
    setChip(c);
  };

  const importMenu = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Choose photos', 'Cancel'], cancelButtonIndex: 1 },
      (i) => {
        if (i === 0) importPhotos();
      }
    );

  return (
    <View style={[s.root, { backgroundColor: t.bg, paddingTop: insets.top }]} testID="home-screen">
      <View style={s.header}>
        <View>
          <Text style={[s.h1, { color: t.ink }]}>Scans</Text>
          <Text style={[s.sub, { color: t.muted }]}>{plus ? 'ClearScan Pro' : 'Free, no watermark'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!plus && (
            <Press onPress={() => router.push('/paywall')} style={[s.iconBtn, { backgroundColor: t.accentSoft }]} accessibilityLabel="ClearScan Pro" testID="home-paywall">
              <Ionicons name="sparkles" size={20} color={t.accent} />
            </Press>
          )}
          <Press onPress={() => router.push('/settings')} style={[s.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Settings" testID="home-settings">
            <Ionicons name="settings-outline" size={20} color={t.ink} />
          </Press>
        </View>
      </View>

      <View style={[s.search, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Ionicons name="search" size={18} color={t.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search names and text inside scans"
          placeholderTextColor={t.muted}
          style={[s.searchInput, { color: t.ink }]}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Press onPress={() => setQuery('')} haptic="none" hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={t.muted} />
          </Press>
        ) : null}
      </View>

      <View style={s.chips}>
        {['All', 'Starred', ...KINDS.filter((k) => k !== 'Document')].map((c) => {
          const locked = !plus && KINDS.includes(c as any);
          const on = chip === c;
          return (
            <Press key={c} onPress={() => pickChip(c)} haptic="none" style={[s.chip, { backgroundColor: on ? t.brand : t.surface, borderColor: on ? t.brand : t.line }]}>
              <Text style={{ color: on ? '#fff' : t.ink, fontWeight: '600', fontSize: 13 }}>{c}</Text>
              {locked ? <Ionicons name="lock-closed" size={11} color={t.muted} style={{ marginLeft: 4 }} /> : null}
            </Press>
          );
        })}
      </View>

      <Animated.FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, gap: 12 }}
        ListHeaderComponent={
          promo && !plus ? (
            <Animated.View entering={FadeInDown} style={[s.promo, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="sparkles" size={20} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontWeight: '700' }}>Enjoying ClearScan?</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>Pro sorts scans for you. Everything you use now stays free.</Text>
              </View>
              <Press onPress={() => router.push('/paywall')} style={[s.promoBtn, { backgroundColor: t.accent }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>See</Text>
              </Press>
              <Press
                onPress={() => {
                  kvSet('promo_dismissed', String(Date.now()));
                  setPromo(false);
                }}
                haptic="none"
                hitSlop={12}
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={18} color={t.muted} />
              </Press>
            </Animated.View>
          ) : undefined
        }
        ListEmptyComponent={<Empty query={query} />}
        renderItem={({ item, index }) => <Row doc={item} index={index} />}
        itemLayoutAnimation={LinearTransition}
      />

      <View style={[s.bar, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <Press onPress={importMenu} style={[s.secondary, { backgroundColor: t.surface, borderColor: t.line }]} accessibilityLabel="Import photos" testID="home-import">
          <Ionicons name="images-outline" size={24} color={t.ink} />
        </Press>
        <ScanButton onPress={scan} />
        <View style={{ width: 56 }} />
      </View>
      <ProcessingOverlay progress={progress} />
    </View>
  );
}

function Row({ doc, index }: { doc: Doc; index: number }) {
  const t = useTheme();
  const thumb = thumbOf(doc.id);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(320)}>
      <Press onPress={() => router.push({ pathname: '/doc/[id]', params: { id: doc.id } })} style={[s.row, { backgroundColor: t.surface, borderColor: t.line }]}>
        {thumb ? <Image source={{ uri: thumb }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: t.brandSoft }]} />}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ color: t.ink, fontWeight: '700', fontSize: 15 }}>
            {doc.title}
          </Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>
            {fmtDate(doc.created)} · {doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
          </Text>
          <View style={[s.kind, { backgroundColor: t.brandSoft }]}>
            <Text style={{ color: t.brand, fontSize: 11, fontWeight: '700' }}>{doc.kind}</Text>
          </View>
        </View>
        {doc.favorite ? <Ionicons name="star" size={16} color={t.accent} /> : null}
      </Press>
    </Animated.View>
  );
}

function Empty({ query }: { query: string }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: t.brandSoft }]}>
        <Ionicons name={query ? 'search' : 'scan'} size={40} color={t.brand} />
      </View>
      <Text style={{ color: t.ink, fontSize: 20, fontWeight: '800', marginTop: 18 }}>{query ? 'No matches' : 'Nothing scanned yet'}</Text>
      <Text style={{ color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
        {query ? 'Try fewer words. Search looks inside every scan.' : 'Tap Scan and hold your iPhone over a page. Text is read for free, right on your device.'}
      </Text>
    </Animated.View>
  );
}

function ScanButton({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(pulse.value, [0, 1], [0.45, 0]), transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.55]) }] }));
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[s.pulse, ring]} />
      <Press onPress={onPress} haptic="medium" style={s.scanBtn} accessibilityLabel="Scan a document" testID="home-scan">
        <Ionicons name="scan" size={26} color="#fff" />
        <Text style={s.scanText}>Scan</Text>
      </Press>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  sub: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, alignItems: 'center' },
  thumb: { width: 62, height: 82, borderRadius: 10 },
  kind: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 8 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, marginBottom: 12 },
  promoBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyIcon: { width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 10 },
  secondary: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1F6BFF', paddingHorizontal: 34, height: 62, borderRadius: 31, shadowColor: '#1F6BFF', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  scanText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pulse: { position: 'absolute', width: 150, height: 62, borderRadius: 31, backgroundColor: '#1F6BFF' },
});
