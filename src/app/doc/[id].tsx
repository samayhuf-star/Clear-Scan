import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../../components/Press';
import { deleteDoc, getDoc, getPages, setFavorite, setTitle, type Doc } from '../../lib/db';
import { abs, remove } from '../../lib/files';
import { fmtDate } from '../../lib/classify';
import { QUALITY, type Quality } from '../../lib/pdf';
import { shareMarkdown, sharePdf, shareText, shareWord } from '../../lib/export';
import { usePlus } from '../../lib/purchases';
import { useTheme } from '../../lib/theme';

export default function DocScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const plus = usePlus();
  const [doc, setDoc] = useState<Doc | null>(() => getDoc(id));
  const pages = useMemo(() => getPages(id), [id]);
  const [tab, setTab] = useState<'scan' | 'text'>('scan');
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(fresh === '1');

  if (!doc) return null;
  const allText = pages.map((p) => p.text).join('\n\n').trim();
  const pageW = width - 40;

  const reload = () => setDoc(getDoc(id));

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('Could not export', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const chooseQuality = () => {
    const keys = Object.keys(QUALITY) as Quality[];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'PDF size',
        message: 'No watermark on any size.',
        options: [...keys.map((k) => `${QUALITY[k].label} · ${QUALITY[k].hint}`), 'Cancel'],
        cancelButtonIndex: keys.length,
      },
      (i) => {
        if (i < keys.length) withBusy(() => sharePdf(doc, pages, keys[i]));
      }
    );
  };

  const needPlus = (fn: () => Promise<void>) => {
    if (!plus) {
      router.push('/paywall');
      return;
    }
    withBusy(fn);
  };

  const more = () => {
    const opts = [
      doc.favorite ? 'Remove star' : 'Star',
      'Rename',
      'Share text',
      plus ? 'Export as Word' : 'Export as Word (Plus)',
      plus ? 'Export as Markdown' : 'Export as Markdown (Plus)',
      'Delete',
      'Cancel',
    ];
    ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 6, destructiveButtonIndex: 5 }, (i) => {
      if (i === 0) {
        setFavorite(doc.id, !doc.favorite);
        reload();
      } else if (i === 1) {
        Alert.prompt('Rename', undefined, (v) => {
          if (v?.trim()) {
            setTitle(doc.id, v.trim());
            reload();
          }
        }, 'plain-text', doc.title);
      } else if (i === 2) {
        withBusy(() => shareText(doc, pages));
      } else if (i === 3) needPlus(() => shareWord(doc, pages));
      else if (i === 4) needPlus(() => shareMarkdown(doc, pages));
      else if (i === 5) {
        Alert.alert('Delete this scan?', 'This removes it from your iPhone.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              deleteDoc(doc.id);
              await remove(`scans/${doc.id}`);
              router.back();
            },
          },
        ]);
      }
    });
  };

  return (
    <View style={[s.root, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <View style={s.nav}>
        <Press onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={t.ink} />
        </Press>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text numberOfLines={1} style={{ color: t.ink, fontWeight: '800', fontSize: 17 }}>{doc.title}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            {fmtDate(doc.created)} · {doc.pages} {doc.pages === 1 ? 'page' : 'pages'} · {doc.kind}
          </Text>
        </View>
        <Press onPress={more} style={[s.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="More">
          <Ionicons name="ellipsis-horizontal" size={20} color={t.ink} />
        </Press>
      </View>

      <View style={[s.tabs, { backgroundColor: t.surface, borderColor: t.line }]}>
        {(['scan', 'text'] as const).map((k) => (
          <Press key={k} onPress={() => setTab(k)} haptic="none" style={[s.tab, tab === k && { backgroundColor: t.brand }]}>
            <Text style={{ color: tab === k ? '#fff' : t.ink, fontWeight: '700' }}>{k === 'scan' ? 'Scan' : 'Text'}</Text>
          </Press>
        ))}
      </View>

      {tab === 'scan' ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={pages}
            horizontal
            pagingEnabled
            keyExtractor={(p) => String(p.idx)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, paddingHorizontal: 20, paddingTop: 12 }}>
                <Image source={{ uri: abs(item.image) }} resizeMode="contain" style={{ width: pageW, height: '100%', borderRadius: 12 }} />
              </View>
            )}
          />
          <Text style={[s.pageNo, { color: t.muted }]}>Page {index + 1} of {pages.length}</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
          {allText ? (
            <Text selectable style={{ color: t.ink, fontSize: 16, lineHeight: 24 }}>{allText}</Text>
          ) : (
            <Text style={{ color: t.muted, lineHeight: 22 }}>No text was found. Try a sharper scan with more light.</Text>
          )}
        </ScrollView>
      )}

      <View style={[s.actions, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
        <Press onPress={chooseQuality} disabled={busy} haptic="medium" style={[s.primary, { backgroundColor: t.brand }]}>
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={s.primaryText}>{busy ? 'Preparing…' : 'Share PDF'}</Text>
        </Press>
        <Press
          onPress={async () => {
            await Clipboard.setStringAsync(allText);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Copied', 'All recognised text is on your clipboard.');
          }}
          style={[s.secondary, { backgroundColor: t.surface, borderColor: t.line }]}
          accessibilityLabel="Copy text"
        >
          <Ionicons name="copy-outline" size={22} color={t.ink} />
        </Press>
      </View>

      {showDone && (
        <Animated.View entering={FadeIn} style={s.toastWrap} pointerEvents="none">
          <Animated.View entering={ZoomIn.springify().damping(12)} style={s.toast}>
            <Ionicons name="checkmark-circle" size={22} color="#25C27A" />
            <Text style={s.toastText}>Saved. Text read on-device</Text>
          </Animated.View>
        </Animated.View>
      )}
      {showDone && <Timeout ms={2200} onDone={() => setShowDone(false)} />}
    </View>
  );
}

function Timeout({ ms, onDone }: { ms: number; onDone: () => void }) {
  React.useEffect(() => {
    const id = setTimeout(onDone, ms);
    return () => clearTimeout(id);
  }, [ms, onDone]);
  return null;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', alignSelf: 'center', marginTop: 14, padding: 4, borderRadius: 999, borderWidth: 1, gap: 4 },
  tab: { paddingHorizontal: 26, paddingVertical: 8, borderRadius: 999 },
  pageNo: { textAlign: 'center', paddingVertical: 8, fontSize: 13, fontWeight: '600', marginBottom: 90 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 10 },
  primary: { flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondary: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  toastWrap: { position: 'absolute', top: 110, left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#101C30', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  toastText: { color: '#fff', fontWeight: '700' },
});
