import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Image, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../../components/Press';
import { deleteDoc, getDoc, getDocReminders, getPages, setFavorite, setTitle, type Doc, type Repeat } from '../../lib/db';
import { abs, remove } from '../../lib/files';
import { fmtDate } from '../../lib/classify';
import { QUALITY, type Quality } from '../../lib/pdf';
import { LOOKS, getLook, rnFilter, setLook, type Look } from '../../lib/look';
import { shareMarkdown, sharePdf, shareText, shareWord } from '../../lib/export';
import { extractFacts, maskValue, redactText, type Fact } from '../../lib/facts';
import { addReminder, clearDocReminders, removeReminder } from '../../lib/reminders';
import { addToCalendar } from '../../lib/calendar';
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
  const [tab, setTab] = useState<'scan' | 'text' | 'facts'>('scan');
  const [reveal, setReveal] = useState(false);
  const [reminded, setReminded] = useState<Set<string>>(() => new Set(getDocReminders(id).map((r) => `${r.iso}|${r.label}`)));
  const [index, setIndex] = useState(0);
  const [look, setLookState] = useState<Look>(() => getLook(id));
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(fresh === '1');

  const allText = useMemo(() => pages.map((p) => p.text).join('\n\n').trim(), [pages]);
  const facts = useMemo(() => extractFacts(allText), [allText]);

  if (!doc) return null;
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

  const toggleReminder = async (f: Fact) => {
    if (!f.iso) return;
    const key = `${f.iso}|${f.label}`;
    if (reminded.has(key)) {
      await removeReminder(doc.id, f.iso, f.label);
      setReminded((prev) => { const n = new Set(prev); n.delete(key); return n; });
      return;
    }
    const repeat = await chooseRepeat();
    if (!repeat) return;
    const res = await addReminder(doc.id, doc.title, f.label, f.iso, repeat);
    if (res === 'ok') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReminded((prev) => new Set(prev).add(key));
    } else if (res === 'denied') {
      Alert.alert('Notifications are off', 'Turn on notifications for Keptly in Settings to get reminders.');
    } else {
      Alert.alert('Already passed', 'That date is in the past, so there is nothing to remind you about.');
    }
  };

  const chooseRepeat = () =>
    new Promise<Repeat | null>((resolve) => {
      const opts: { label: string; value: Repeat | null }[] = [
        { label: 'Remind me once (30 days, 7 days, 1 day, on the day)', value: 'none' },
        { label: 'Repeat every year', value: 'yearly' },
        { label: 'Repeat every month', value: 'monthly' },
        { label: 'Cancel', value: null },
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Reminder', message: 'Renewals can repeat on their own.', options: opts.map((o) => o.label), cancelButtonIndex: 3 },
        (i) => resolve(opts[i]?.value ?? null)
      );
    });

  const saveToCalendar = async (f: Fact) => {
    if (!f.iso) return;
    try {
      const r = await addToCalendar(doc.title, f.label, f.iso);
      if (r === 'ok') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Added to Calendar', `${f.label} on ${f.value} is now in your calendar.`);
      } else if (r === 'denied') {
        Alert.alert('Calendar access is off', 'Allow Keptly to add events in Settings.');
      }
    } catch (e: any) {
      Alert.alert('Could not add to Calendar', e?.message ?? 'Please try again.');
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
      'Share text, hide sensitive numbers',
      plus ? 'Export as Word' : 'Export as Word (Plus)',
      plus ? 'Export as Markdown' : 'Export as Markdown (Plus)',
      'Delete',
      'Cancel',
    ];
    ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 7, destructiveButtonIndex: 6 }, (i) => {
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
      } else if (i === 3) {
        const r = redactText(allText);
        withBusy(async () => {
          await shareText(doc, [{ doc_id: doc.id, idx: 0, image: '', text: r.text }]);
        });
      } else if (i === 4) needPlus(() => shareWord(doc, pages));
      else if (i === 5) needPlus(() => shareMarkdown(doc, pages));
      else if (i === 6) {
        Alert.alert('Delete this scan?', 'This removes it from your iPhone.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await clearDocReminders(doc.id);
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
        {(['scan', 'text', 'facts'] as const).map((k) => (
          <Press key={k} onPress={() => setTab(k)} haptic="none" style={[s.tab, tab === k && { backgroundColor: t.brand }]}>
            <Text style={{ color: tab === k ? '#fff' : t.ink, fontWeight: '700' }}>{k === 'scan' ? 'Scan' : k === 'text' ? 'Text' : `Facts${facts.length ? ` ${facts.length}` : ''}`}</Text>
          </Press>
        ))}
      </View>

      {tab === 'scan' ? (
        <View style={{ flex: 1, backgroundColor: t.scanBg }}>
          <View style={s.looks}>
            {LOOKS.map((l) => (
              <Press key={l.key} haptic="none" onPress={() => { setLook(id, l.key); setLookState(l.key); }} accessibilityLabel={`${l.label} filter`} style={[s.look, look === l.key && { backgroundColor: t.accent }]}>
                <Text style={{ color: look === l.key ? '#062A2A' : '#E7EFEE', fontWeight: '800', fontSize: 13 }}>{l.label}</Text>
              </Press>
            ))}
          </View>
          <FlatList
            data={pages}
            horizontal
            pagingEnabled
            keyExtractor={(p) => String(p.idx)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, paddingHorizontal: 20, paddingTop: 12 }}>
                <Image source={{ uri: abs(item.image) }} resizeMode="contain" style={[{ width: pageW, height: '100%', borderRadius: 12 }, look !== 'color' && ({ filter: rnFilter(look) } as any)]} />
              </View>
            )}
          />
          <Text style={[s.pageNo, { color: '#9AA5A3' }]}>Page {index + 1} of {pages.length}</Text>
        </View>
      ) : tab === 'facts' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
          {facts.length === 0 ? (
            <Text style={{ color: t.muted, lineHeight: 22 }}>
              No dates, amounts or contact details were found in this scan. Facts appear here when Keptly reads them.
            </Text>
          ) : (
            <>
              <Text style={{ color: t.muted, fontSize: 13, marginBottom: 12 }}>
                Found on your iPhone. Tap a fact to copy it. Tap the bell on a date for a reminder, or the calendar to add it to Calendar.
              </Text>
              {facts.map((f) => {
                const key = `${f.iso}|${f.label}`;
                const on = reminded.has(key);
                const shown = f.sensitive && !reveal ? maskValue(f.value) : f.value;
                return (
                  <View key={`${f.kind}${f.value}`} style={[s.fact, { backgroundColor: t.surface, borderColor: t.line }]}>
                    <Press
                      haptic="none"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await Clipboard.setStringAsync(f.value);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>{f.label.toUpperCase()}</Text>
                      <Text selectable style={{ color: t.ink, fontSize: 17, fontWeight: '700', marginTop: 2 }}>{shown}</Text>
                    </Press>
                    {f.deadline && f.iso && Platform.OS === 'ios' ? (
                      <Press onPress={() => saveToCalendar(f)} style={[s.bell, { backgroundColor: t.brandSoft }]} accessibilityLabel="Add to Calendar">
                        <Ionicons name="calendar-outline" size={20} color={t.brand} />
                      </Press>
                    ) : null}
                    {f.deadline && f.iso ? (
                      <Press onPress={() => toggleReminder(f)} style={[s.bell, { backgroundColor: on ? t.accent : t.accentSoft }]} accessibilityLabel={on ? 'Remove reminder' : 'Remind me'}>
                        <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={20} color={on ? '#fff' : t.accent} />
                      </Press>
                    ) : null}
                  </View>
                );
              })}
              {facts.some((f) => f.sensitive) && (
                <Press haptic="none" onPress={() => setReveal((v) => !v)} style={{ alignSelf: 'center', marginTop: 8, padding: 10 }}>
                  <Text style={{ color: t.brand, fontWeight: '700' }}>{reveal ? 'Hide ID numbers' : 'Show ID numbers'}</Text>
                </Press>
              )}
            </>
          )}
        </ScrollView>
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
            <Ionicons name="checkmark-circle" size={22} color="#3DD08A" />
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
  looks: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginTop: 10, padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  look: { paddingHorizontal: 16, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', alignSelf: 'center', marginTop: 14, padding: 4, borderRadius: 999, borderWidth: 1, gap: 4 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pageNo: { textAlign: 'center', paddingVertical: 8, fontSize: 13, fontWeight: '600', marginBottom: 90 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 10 },
  primary: { flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondary: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  toastWrap: { position: 'absolute', top: 110, left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#0E2624', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  toastText: { color: '#fff', fontWeight: '700' },
});
