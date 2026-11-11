import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as StoreReview from 'expo-store-review';
import { Press } from '../components/Press';
import { CONFIG } from '../config';
import { kvGet, kvSet } from '../lib/db';
import { restore, usePlus } from '../lib/purchases';
import { openCustomerCenter } from '../lib/revenuecat';
import { useTheme } from '../lib/theme';

type Icon = React.ComponentProps<typeof Ionicons>['name'];

export default function Settings() {
  const t = useTheme();
  const plus = usePlus();
  const [lock, setLock] = useState(kvGet('lock') === '1');

  const toggleLock = async (v: boolean) => {
    if (v) {
      const ok = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!ok || !enrolled) {
        Alert.alert('Face ID is not set up', 'Turn on Face ID or a passcode in iPhone Settings first.');
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on app lock' });
      if (!res.success) return;
    }
    kvSet('lock', v ? '1' : '0');
    setLock(v);
  };

  const Row = ({ icon, label, sub, onPress, right }: { icon: Icon; label: string; sub?: string; onPress?: () => void; right?: React.ReactNode }) => (
    <Press onPress={onPress} haptic={onPress ? 'light' : 'none'} style={[s.row, { backgroundColor: t.surface, borderColor: t.line }]}>
      <View style={[s.icon, { backgroundColor: t.brandSoft }]}>
        <Ionicons name={icon} size={18} color={t.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.ink, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null)}
    </Press>
  );

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <View style={s.head}>
        <Text style={{ color: t.ink, fontSize: 28, fontWeight: '800' }}>Settings</Text>
        <Press onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <Text style={{ color: t.brand, fontWeight: '700', fontSize: 16 }}>Done</Text>
        </Press>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Row
          icon="sparkles"
          label={plus ? 'ClearScan Plus is active' : 'Get ClearScan Plus'}
          sub={plus ? 'Thank you for supporting ClearScan' : 'Auto-sort and Word or Markdown export'}
          onPress={plus ? openCustomerCenter : () => router.push('/paywall')}
        />
        <Row
          icon="lock-closed"
          label="Lock with Face ID"
          sub="Ask to unlock each time you open the app"
          right={<Switch value={lock} onValueChange={toggleLock} />}
        />

        <View style={[s.privacy, { backgroundColor: t.goodSoft }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark" size={20} color={t.good} />
            <Text style={{ color: t.ink, fontWeight: '800', fontSize: 16 }}>Our promises</Text>
          </View>
          {[
            'No watermark on any scan, on any plan.',
            'OCR is free and runs on your iPhone.',
            'No account. Scans are never uploaded.',
            'No ads and no tracking SDKs.',
          ].map((l) => (
            <View key={l} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="checkmark" size={16} color={t.good} style={{ marginTop: 2 }} />
              <Text style={{ color: t.ink, flex: 1, lineHeight: 21 }}>{l}</Text>
            </View>
          ))}
        </View>

        <Row icon="refresh" label="Restore purchases" onPress={async () => {
          try {
            const ok = await restore();
            Alert.alert(ok ? 'Restored' : 'Nothing to restore', ok ? 'ClearScan Plus is active again.' : 'No active subscription found on this Apple ID.');
          } catch (e: any) {
            Alert.alert('Restore failed', e?.message ?? 'Please try again.');
          }
        }} />
        <Row icon="star" label="Rate ClearScan" onPress={async () => { if (await StoreReview.hasAction()) StoreReview.requestReview(); }} />
        <Row icon="mail" label="Contact support" sub={CONFIG.supportEmail} onPress={() => Linking.openURL(`mailto:${CONFIG.supportEmail}?subject=ClearScan%20support`)} />
        <Row icon="document-text" label="Privacy policy" onPress={() => Linking.openURL(CONFIG.privacyUrl)} />
        <Row icon="reader" label="Terms of use" onPress={() => Linking.openURL(CONFIG.termsUrl)} />
        <Text style={{ color: t.muted, textAlign: 'center', marginTop: 8, fontSize: 12 }}>ClearScan 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  privacy: { borderRadius: 18, padding: 16, gap: 8 },
});
