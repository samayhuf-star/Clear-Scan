import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { kvSet } from '../lib/db';
import { useScan } from '../lib/useScan';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const FREE: { icon: Icon; title: string; sub: string }[] = [
  { icon: 'scan', title: 'Unlimited scans, no watermark', sub: 'Auto edge detection and straightening' },
  { icon: 'documents', title: 'Many pages, one PDF', sub: 'Add pages any time, or scan an open book' },
  { icon: 'color-wand', title: 'Auto, Colour, Grey, B&W', sub: 'Clean up and rotate every page' },
  { icon: 'search', title: 'Search inside every scan', sub: 'Text is read on your iPhone, free' },
  { icon: 'calendar', title: 'Deadlines, reminders, widget', sub: 'Repeating reminders and calendar export' },
  { icon: 'stats-chart', title: 'Receipt totals by month', sub: 'See what you spent at a glance' },
];
const PLUS: { icon: Icon; title: string; sub: string }[] = [
  { icon: 'sparkles', title: 'Auto-sort into Receipt, Invoice, ID, Letter', sub: 'Your scans organise themselves' },
  { icon: 'document-text', title: 'Word and Markdown export', sub: 'Turn any scan into editable text' },
];

function Item({ it, plus }: { it: (typeof FREE)[number]; plus?: boolean }) {
  return (
    <View style={s.item}>
      <View style={[s.ico, plus && { backgroundColor: 'rgba(255,161,63,0.18)' }]}>
        <Ionicons name={it.icon} size={20} color={plus ? '#FFA13F' : '#2FC4AE'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.itTitle}>{it.title}</Text>
        <Text style={s.itSub}>{it.sub}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color="#3DD08A" />
    </View>
  );
}

export default function WhatYouGet() {
  const insets = useSafeAreaInsets();
  const { progress, scan } = useScan();

  const start = (tryScan: boolean) => {
    kvSet('onboarded', '1');
    router.replace('/');
    if (tryScan) setTimeout(() => scan(), 350);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#062A2A', '#0B4A47', '#062A2A']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 22, paddingBottom: 24, gap: 10 }}>
        <Text style={s.h1}>What you get</Text>
        <Text style={s.lead}>Everything below is free, with no watermark and no account.</Text>
        {FREE.map((it) => <Item key={it.title} it={it} />)}
        <View style={s.plusHead}>
          <Text style={s.plusTitle}>Keptly Plus</Text>
          <Text style={s.plusSub}>Optional extras</Text>
        </View>
        {PLUS.map((it) => <Item key={it.title} it={it} plus />)}
      </ScrollView>
      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Press haptic="medium" onPress={() => start(true)} style={s.cta}>
          <Text style={s.ctaText}>Start free, scan now</Text>
        </Press>
        <Press onPress={() => { kvSet('onboarded', '1'); router.replace('/'); setTimeout(() => router.push('/paywall'), 250); }} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={s.link}>See Keptly Plus</Text>
        </Press>
      </View>
      <ProcessingOverlay progress={progress} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#062A2A' },
  h1: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  lead: { color: '#96B2AC', fontSize: 16, lineHeight: 22, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0E2624', borderRadius: 16, padding: 14 },
  ico: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(47,196,174,0.16)', alignItems: 'center', justifyContent: 'center' },
  itTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  itSub: { color: '#96B2AC', fontSize: 13, marginTop: 2 },
  plusHead: { marginTop: 10, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  plusTitle: { color: '#FFA13F', fontSize: 20, fontWeight: '800' },
  plusSub: { color: '#96B2AC', fontSize: 13 },
  bottom: { paddingHorizontal: 22, paddingTop: 12 },
  cta: { height: 56, borderRadius: 28, backgroundColor: '#FFA13F', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#062A2A', fontSize: 17, fontWeight: '800' },
  link: { color: '#96B2AC', fontSize: 15, fontWeight: '700' },
});
