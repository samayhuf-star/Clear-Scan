import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { listTextsByKinds } from '../lib/db';
import { docTotal, extractFacts } from '../lib/facts';
import { useTheme } from '../lib/theme';

type Row = { id: string; title: string; kind: string; created: number; symbol: string; value: number };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export default function Totals() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [rows, setRows] = useState<Row[]>([]);

  useFocusEffect(
    useCallback(() => {
      const from = new Date(ym.y, ym.m, 1).getTime();
      const to = new Date(ym.y, ym.m + 1, 1).getTime();
      const out: Row[] = [];
      for (const d of listTextsByKinds(['Receipt', 'Invoice'], from, to)) {
        const total = docTotal(extractFacts(d.text));
        if (total) out.push({ id: d.id, title: d.title, kind: d.kind, created: d.created, ...total });
      }
      setRows(out);
    }, [ym])
  );

  const sums = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.symbol, (m.get(r.symbol) ?? 0) + r.value);
    return [...m.entries()];
  }, [rows]);

  const shift = (n: number) => setYm((p) => {
    const d = new Date(p.y, p.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <View style={[s.root, { backgroundColor: t.bg, paddingTop: insets.top + 8 }]}>
      <View style={s.nav}>
        <Press onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={t.ink} />
        </Press>
        <Text style={{ color: t.ink, fontWeight: '800', fontSize: 22, marginLeft: 12 }}>Receipt totals</Text>
      </View>

      <View style={[s.month, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Press onPress={() => shift(-1)} style={s.arrow} accessibilityLabel="Previous month"><Ionicons name="chevron-back" size={20} color={t.ink} /></Press>
        <Text style={{ color: t.ink, fontWeight: '800', fontSize: 17 }}>{MONTHS[ym.m]} {ym.y}</Text>
        <Press onPress={() => shift(1)} style={s.arrow} accessibilityLabel="Next month"><Ionicons name="chevron-forward" size={20} color={t.ink} /></Press>
      </View>

      <View style={[s.sumCard, { backgroundColor: t.brand }]}>
        <Text style={{ color: '#DDF4F0', fontWeight: '700', fontSize: 13 }}>SPENT THIS MONTH</Text>
        {sums.length === 0 ? (
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 30, marginTop: 6 }}>Nothing yet</Text>
        ) : (
          sums.map(([sym, v]) => (
            <Text key={sym} style={{ color: '#fff', fontWeight: '800', fontSize: 34, marginTop: 4 }}>{sym} {fmt(v)}</Text>
          ))
        )}
        <Text style={{ color: '#DDF4F0', marginTop: 8, fontSize: 13 }}>
          {rows.length} {rows.length === 1 ? 'receipt or invoice' : 'receipts and invoices'}. Added up on your iPhone from the totals found in each scan.
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
        ListEmptyComponent={
          <Text style={{ color: t.muted, textAlign: 'center', marginTop: 30, lineHeight: 21, paddingHorizontal: 20 }}>
            Scans filed as Receipt or Invoice show up here with the total Keptly finds in them.
          </Text>
        }
        renderItem={({ item }) => (
          <Press
            onPress={() => router.push({ pathname: '/doc/[id]', params: { id: item.id } })}
            style={[s.row, { backgroundColor: t.surface, borderColor: t.line }]}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: t.ink, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{new Date(item.created).toDateString()} · {item.kind}</Text>
            </View>
            <Text style={{ color: t.ink, fontWeight: '800', fontSize: 16 }}>{item.symbol} {fmt(item.value)}</Text>
          </Press>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 16, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sumCard: { marginHorizontal: 20, marginTop: 14, padding: 20, borderRadius: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
});
