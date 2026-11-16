import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { listReminders } from '../lib/db';
import { removeReminder } from '../lib/reminders';
import { useTheme } from '../lib/theme';

type Row = ReturnType<typeof listReminders>[number];

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

function when(n: number): string {
  if (n < 0) return `${-n} ${-n === 1 ? 'day' : 'days'} ago`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

export default function Deadlines() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>([]);
  useFocusEffect(useCallback(() => setRows(listReminders()), []));

  return (
    <View style={[s.root, { backgroundColor: t.bg, paddingTop: insets.top + 8 }]}>
      <View style={s.nav}>
        <Press onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={t.ink} />
        </Press>
        <Text style={{ color: t.ink, fontWeight: '800', fontSize: 22, marginLeft: 12 }}>Deadlines</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.doc_id}${r.iso}${r.label}`}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={44} color={t.brand} />
            <Text style={{ color: t.ink, fontWeight: '800', fontSize: 18, marginTop: 12 }}>No deadlines yet</Text>
            <Text style={{ color: t.muted, textAlign: 'center', marginTop: 6, lineHeight: 21 }}>
              Scan a passport, insurance paper, warranty or bill. Open its Facts tab and tap the bell on an expiry or due date.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const n = daysUntil(item.iso);
          const soon = n >= 0 && n <= 7;
          return (
            <Press
              onPress={() => router.push({ pathname: '/doc/[id]', params: { id: item.doc_id } })}
              style={[s.row, { backgroundColor: t.surface, borderColor: soon ? t.accent : t.line }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: soon ? t.accent : t.muted, fontWeight: '800', fontSize: 12 }}>
                  {item.label.toUpperCase()} · {when(n).toUpperCase()}
                </Text>
                <Text numberOfLines={1} style={{ color: t.ink, fontWeight: '700', fontSize: 16, marginTop: 3 }}>{item.title}</Text>
                <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{item.iso}</Text>
              </View>
              <Press
                onPress={async () => {
                  await removeReminder(item.doc_id, item.iso, item.label);
                  setRows(listReminders());
                }}
                style={[s.iconBtn, { backgroundColor: t.bg }]}
                accessibilityLabel="Remove reminder"
              >
                <Ionicons name="close" size={18} color={t.muted} />
              </Press>
            </Press>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
});
