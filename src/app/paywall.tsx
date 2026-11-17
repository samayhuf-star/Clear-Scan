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
import { ctaLabel, planCopy, selectionDisclosure, type PlanId } from '../lib/offerCopy';
import { buyPlan, emptyOffer, loadOffer, productOf, purchasesReady, restore, usePlus, type Offer } from '../lib/purchases';

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string }[] = [
  { icon: 'albums', title: 'Auto-sort by type', sub: 'Receipts, invoices, IDs and letters filed for you' },
  { icon: 'document-text', title: 'Word and Markdown export', sub: 'Turn any scan into editable text' },
];

const LEGAL =
  'Payment is charged to your Apple ID at confirmation of purchase. A subscription renews automatically unless you cancel at least 24 hours before the end of the trial or the current period. Your account is charged for renewal within 24 hours before the period ends, at the price shown. Manage or cancel in your Apple ID account settings. Any unused part of a free trial is forfeited when you subscribe.';

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const plus = usePlus();
  const [offer, setOffer] = useState<Offer>(emptyOffer);
  const [plan, setPlan] = useState<PlanId>('weekly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOffer().then(setOffer);
  }, []);

  useEffect(() => {
    if (plus) router.back();
  }, [plus]);

  const copyFor = (id: PlanId) => {
    const product = productOf(offer[id]);
    const fallbackTrial = CONFIG.fallbackTrials[id];
    return planCopy(id, product ? { priceString: product.priceString, price: product.price, introPrice: product.introPrice } : null, CONFIG.fallbackPrices[id], fallbackTrial);
  };

  const selected = copyFor(plan);

  const onBuy = async () => {
    const loaded = offer[plan];
    if (!loaded.pkg && !loaded.product) {
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
      const ok = await buyPlan(loaded);
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
      if (!ok) Alert.alert('Nothing to restore', 'We could not find an active ClearScan Plus purchase on this Apple ID.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#062A2A', '#0B4A47', '#062A2A']} style={StyleSheet.absoluteFill} />
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
          <Text style={s.sub}>Scanning, OCR and PDF export stay free. Plus adds auto-sort and Word or Markdown export.</Text>
        </Animated.View>

        <View style={{ gap: 12, marginTop: 26 }}>
          {BENEFITS.map((b, i) => (
            <Animated.View key={b.title} entering={FadeInDown.delay(120 + i * 80).duration(400)} style={s.benefit}>
              <View style={s.benefitIcon}>
                <Ionicons name={b.icon} size={20} color="#2FC4AE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>{b.title}</Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(400)} style={s.freeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#25C27A" />
          <Text style={s.freeText}>Always free: no watermark, OCR, search, PDF export, app lock.</Text>
        </Animated.View>

        <View style={{ marginTop: 22 }}>
          <PlanCard
            wide
            active
            onPress={() => setPlan('weekly')}
            label="Weekly"
            headline={copyFor('weekly').headline}
            note={copyFor('weekly').note}
            badge="7 DAYS FREE"
          />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Press haptic="medium" onPress={onBuy} disabled={busy} style={s.cta} accessibilityLabel={ctaLabel(plan, selected)}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{ctaLabel(plan, selected)}</Text>}
        </Press>
        <Text style={s.selection}>{selectionDisclosure(plan, selected)}</Text>
        <Text style={s.legal}>{LEGAL}</Text>
        <View style={s.links}>
          <Press onPress={onRestore} haptic="none" accessibilityLabel="Restore Purchases">
            <Text style={s.link}>Restore Purchases</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.termsUrl)} haptic="none" accessibilityLabel="Terms of Use">
            <Text style={s.link}>Terms of Use</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.privacyUrl)} haptic="none" accessibilityLabel="Privacy Policy">
            <Text style={s.link}>Privacy Policy</Text>
          </Press>
          <Press onPress={() => router.back()} haptic="none" accessibilityLabel="Not now">
            <Text style={s.link}>Not now</Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

function PlanCard(p: { active: boolean; onPress: () => void; label: string; headline: string; note: string; badge?: string; wide?: boolean }) {
  return (
    <Press
      onPress={p.onPress}
      accessibilityLabel={`${p.label}. ${p.headline}. ${p.note}${p.active ? '. Selected' : ''}`}
      style={[p.wide ? s.planWide : s.plan, p.active && s.planActive]}
    >
      {p.badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{p.badge}</Text>
        </View>
      ) : null}
      <View style={s.radioRow}>
        <View style={[s.radio, p.active && { borderColor: '#0E8F7E' }]}>{p.active && <View style={s.radioDot} />}</View>
        <Text style={s.planLabel}>{p.label}</Text>
      </View>
      <Text style={s.planPrice}>{p.headline}</Text>
      <Text style={s.planNote}>{p.note}</Text>
    </Press>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#062A2A' },
  close: { position: 'absolute', right: 20, zIndex: 5 },
  crown: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#0E8F7E', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#B6C3DA', fontSize: 16, lineHeight: 23, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(91,151,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  benefitSub: { color: '#93A1BA', fontSize: 13, marginTop: 2 },
  freeBox: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(37,194,122,0.12)' },
  freeText: { color: '#CDEFDD', fontSize: 13, flex: 1, lineHeight: 18 },
  plan: { flex: 1, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  planWide: { borderRadius: 18, padding: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  planActive: { borderColor: '#0E8F7E', backgroundColor: 'rgba(31,107,255,0.16)' },
  badge: { position: 'absolute', top: -11, right: 10, backgroundColor: '#FF8A1F', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#5B6B88', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0E8F7E' },
  planLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  planPrice: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 10, lineHeight: 20 },
  planNote: { color: '#93A1BA', fontSize: 12, marginTop: 4, lineHeight: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#062A2A', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1D2B44' },
  cta: { backgroundColor: '#0E8F7E', borderRadius: 18, paddingVertical: 17, alignItems: 'center', minHeight: 56, justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  selection: { color: '#C5D0E4', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  legal: { color: '#6F7F9B', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 15 },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  link: { color: '#93A1BA', fontSize: 13, fontWeight: '600' },
});
