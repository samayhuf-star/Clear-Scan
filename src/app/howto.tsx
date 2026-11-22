import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { useTheme } from '../lib/theme';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const STEPS: { icon: Icon; title: string; body: string }[] = [
  { icon: 'scan', title: 'Scan', body: 'Tap Scan and hold your iPhone over the page. Keptly finds the edges and straightens it. Keep scanning to add more pages.' },
  { icon: 'book', title: 'Books and many pages', body: 'Switch to Book above the Scan button to split an open book into left and right pages. Open a scan and tap + Page to add more later.' },
  { icon: 'color-wand', title: 'Clean it up', body: 'Choose Auto, Colour, Grey or B&W, and tap Rotate if a page is sideways.' },
  { icon: 'share-outline', title: 'Share one PDF', body: 'Tap Share PDF to send every page as a single file. Pick a size, or hide ID and card numbers first.' },
  { icon: 'calendar', title: 'Never miss a date', body: 'Open Facts to set a reminder or add a deadline to your calendar. Deadlines and Receipt totals sit at the top of Scans.' },
];

export default function HowTo() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 10 }]}>
        <Text style={[s.h1, { color: t.ink }]}>How to use Keptly</Text>
        <Press onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <Text style={{ color: t.brand, fontWeight: '700', fontSize: 16 }}>Done</Text>
        </Press>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: insets.bottom + 24 }}>
        {STEPS.map((st, i) => (
          <View key={st.title} style={[s.card, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={[s.num, { backgroundColor: t.brand }]}>
              <Ionicons name={st.icon} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: t.ink }]}>{i + 1}. {st.title}</Text>
              <Text style={[s.body, { color: t.muted }]}>{st.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6 },
  h1: { fontSize: 26, fontWeight: '800' },
  card: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  num: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20, marginTop: 4 },
});
