import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { CONFIG } from '../config';
import { buy, loadOffer, purchasesReady, restore, usePlus, type Offer } from '../lib/purchases';

type Plan = 'yearly' | 'monthly';

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; soon?: boolean }[] = [
  { icon: 'albums', title: 'Auto-sort by type', sub: 'Receipts, invoices, IDs and letters filed for you' },
  { icon: 'document-text', title: 'Word and Markdown export', sub: 'Turn any scan into editable text' },
  { icon: 'book', title: 'Book mode', sub: 'Flatten curved pages, remove fingers', soon: true },
  { icon: 'create', title: 'Sign and fill forms', sub: 'Add a signature in seconds', soon: true },
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const plus = usePlus();
  const [offer, setOffer] = useState<Offer>({});
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOffer().then(setOffer);
  }, []);

  useEffect(() => {
    if (plus) router.back();
  }, [plus]);

  const price = (p: Plan) => offer[p]?.product.priceString ?? CONFIG.fallbackPrices[p];

  const onBuy = async () => {
    const pkg = offer[plan];
    if (!pkg) {
      Alert.alert(
        purchasesReady() ? 'Plans unavailable' : 'Purchases not set up yet',
        purchasesReady()
          ? 'We could not load the plans. Check your connection and try again.'
          : 'This build has no App Store connection configured yet.'
      );
      return;
    }
    setBusy(true);
    try {
      const ok = await buy(pkg);
      if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (!ok) Alert.alert('Nothing to restore', 'We could not find an active ClearScan Plus subscription on this Apple ID.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0B1B33', '#12306A', '#0B1B33']} style={StyleSheet.absoluteFill} />
      <View style={[s.close, { top: insets.top + 8 }]}>
        <Press onPress={() => router.back()} hitSlop={14} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color="#B6C3DA" />
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <View style={s.crown}>
            <Ionicons name="sparkles" size={30} color="#fff" />
          </View>
          <Text style={s.title}>ClearScan Plus</Text>
          <Text style={s.sub}>Scanning, OCR and export stay free forever. Plus adds power tools on top.</Text>
        </Animated.View>

        <View style={{ gap: 12, marginTop: 26 }}>
          {BENEFITS.map((b, i) => (
            <Animated.View key={b.title} entering={FadeInDown.delay(120 + i * 80).duration(400)} style={s.benefit}>
              <View style={s.benefitIcon}>
                <Ionicons name={b.icon} size={20} color="#5B97FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>
                  {b.title}
                  {b.soon ? <Text style={s.soon}>  COMING SOON</Text> : null}
                </Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(500)} style={s.freeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#25C27A" />
          <Text style={s.freeText}>Always free: no watermark, OCR, search, PDF export, folders, app lock.</Text>
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <PlanCard
            active={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            label="Yearly"
            price={`${price('yearly')} / year`}
            note="Best value, about 69% off monthly"
            badge="BEST VALUE"
          />
          <PlanCard
            active={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            label="Monthly"
            price={`${price('monthly')} / month`}
            note="Cancel any time"
          />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Press haptic="medium" onPress={onBuy} disabled={busy} style={s.cta}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Continue</Text>}
        </Press>
        <Text style={s.legal}>
          Renews automatically until cancelled in your Apple ID settings. Payment is charged to your Apple ID at confirmation.
        </Text>
        <View style={s.links}>
          <Press onPress={onRestore} haptic="none">
            <Text style={s.link}>Restore</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.termsUrl)} haptic="none">
            <Text style={s.link}>Terms</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.privacyUrl)} haptic="none">
            <Text style={s.link}>Privacy</Text>
          </Press>
          <Press onPress={() => router.back()} haptic="none">
            <Text style={s.link}>Not now</Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

function PlanCard(p: { active: boolean; onPress: () => void; label: string; price: string; note: string; badge?: string }) {
  return (
    <Press onPress={p.onPress} style={[s.plan, p.active && s.planActive]}>
      {p.badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{p.badge}</Text>
        </View>
      ) : null}
      <View style={s.radioRow}>
        <View style={[s.radio, p.active && { borderColor: '#1F6BFF' }]}>{p.active && <View style={s.radioDot} />}</View>
        <Text style={s.planLabel}>{p.label}</Text>
      </View>
      <Text style={s.planPrice}>{p.price}</Text>
      <Text style={s.planNote}>{p.note}</Text>
    </Press>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1B33' },
  close: { position: 'absolute', right: 20, zIndex: 5 },
  crown: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#1F6BFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#B6C3DA', fontSize: 16, lineHeight: 23, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(91,151,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  benefitSub: { color: '#93A1BA', fontSize: 13, marginTop: 2 },
  soon: { color: '#FFA13F', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  freeBox: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(37,194,122,0.12)' },
  freeText: { color: '#CDEFDD', fontSize: 13, flex: 1, lineHeight: 18 },
  plan: { flex: 1, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  planActive: { borderColor: '#1F6BFF', backgroundColor: 'rgba(31,107,255,0.16)' },
  badge: { position: 'absolute', top: -11, right: 10, backgroundColor: '#FF8A1F', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#5B6B88', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1F6BFF' },
  planLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  planPrice: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 10 },
  planNote: { color: '#93A1BA', fontSize: 12, marginTop: 4 },
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#0B1B33', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1D2B44' },
  cta: { backgroundColor: '#1F6BFF', borderRadius: 18, paddingVertical: 17, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  legal: { color: '#6F7F9B', fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 15 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  link: { color: '#93A1BA', fontSize: 13, fontWeight: '600' },
});
