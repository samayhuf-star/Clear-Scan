import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '../components/Press';
import { CONFIG, PRODUCT_IDS, type PlanKind } from '../config';
import { planPriceText } from '../lib/introOffer';
import { buy, loadOffer, purchasesReady, restore, usePlus, type Offer } from '../lib/purchases';

const AUTO_RENEW =
  'Subscriptions automatically renew unless you cancel at least 24 hours before the end of the current period. Your Apple ID account will be charged for renewal within 24 hours prior to the end of the current period, at the price shown by the App Store at purchase. You can manage or cancel a subscription in your Apple ID account settings. Lifetime is a one-time purchase and does not renew.';

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string }[] = [
  { icon: 'albums', title: 'Auto-sort by type', sub: 'Receipts, invoices, IDs and letters filed for you' },
  { icon: 'document-text', title: 'Word and Markdown export', sub: 'Turn any scan into editable text' },
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const plus = usePlus();
  const [offer, setOffer] = useState<Offer>({});
  const [plan, setPlan] = useState<PlanKind>('yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOffer().then(setOffer);
  }, []);

  useEffect(() => {
    if (plus) router.back();
  }, [plus]);

  const priceOf = (p: PlanKind) => offer[p]?.price ?? null;
  const currentPriceLine = (p: PlanKind) => {
    const price = priceOf(p);
    if (!price) return 'Unavailable from the store';
    if (p === 'lifetime') return `${price} one-time`;
    return `${price} / ${p === 'yearly' ? 'year' : 'month'}`;
  };
  const priceLine = (p: PlanKind) =>
    planPriceText({
      kind: p,
      current: currentPriceLine(p),
      price: priceOf(p),
      trialDays: offer[p]?.trialDays ?? null,
    });

  const onBuy = async () => {
    const selected = offer[plan];
    if (!selected) {
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
      const ok = await buy(selected.id);
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
      if (!ok) Alert.alert('Nothing to restore', 'We could not find an active ClearScan Pro purchase on this Apple ID.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root} testID="paywall-screen">
      <LinearGradient colors={['#0B1B33', '#12306A', '#0B1B33']} style={StyleSheet.absoluteFill} />
      <View style={[s.close, { top: insets.top + 8 }]}>
        <Press onPress={() => router.back()} hitSlop={14} accessibilityLabel="Close" testID="paywall-close">
          <Ionicons name="close" size={26} color="#B6C3DA" />
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <View style={s.crown}>
            <Ionicons name="sparkles" size={30} color="#fff" />
          </View>
          <Text style={s.title} testID="paywall-title">ClearScan Pro</Text>
          <Text style={s.sub}>Scanning, OCR and export stay free forever. Pro adds power tools on top.</Text>
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
                </Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(500)} style={s.freeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#25C27A" />
          <Text style={s.freeText}>Always free: no watermark, OCR, search, PDF export, app lock.</Text>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
          <PlanCard
            testID="paywall-plan-yearly"
            priceTestID={`paywall-price-${PRODUCT_IDS.yearly}`}
            periodTestID={`paywall-period-${PRODUCT_IDS.yearly}`}
            active={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            label="Yearly"
            price={priceLine('yearly')}
            note="Billed once a year"
            badge="BEST VALUE"
          />
          <PlanCard
            testID="paywall-plan-monthly"
            priceTestID={`paywall-price-${PRODUCT_IDS.monthly}`}
            periodTestID={`paywall-period-${PRODUCT_IDS.monthly}`}
            active={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            label="Monthly"
            price={priceLine('monthly')}
            note="Cancel any time"
          />
          <PlanCard
            testID="paywall-plan-lifetime"
            priceTestID={`paywall-price-${PRODUCT_IDS.lifetime}`}
            periodTestID={`paywall-period-${PRODUCT_IDS.lifetime}`}
            active={plan === 'lifetime'}
            onPress={() => setPlan('lifetime')}
            label="Lifetime"
            price={priceLine('lifetime')}
            note="Pay once, yours to keep"
            wide
          />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Press haptic="medium" onPress={onBuy} disabled={busy} style={s.cta} testID="paywall-buy">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Continue</Text>}
        </Press>
        <Text style={s.legal} testID="paywall-autorenew">{AUTO_RENEW}</Text>
        <View style={s.links}>
          <Press onPress={onRestore} haptic="none" testID="paywall-restore">
            <Text style={s.link}>Restore</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.termsUrl)} haptic="none" testID="paywall-terms">
            <Text style={s.link}>Terms</Text>
          </Press>
          <Press onPress={() => Linking.openURL(CONFIG.privacyUrl)} haptic="none" testID="paywall-privacy">
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

function PlanCard(p: {
  active: boolean;
  onPress: () => void;
  label: string;
  price: string;
  note: string;
  badge?: string;
  testID?: string;
  priceTestID?: string;
  periodTestID?: string;
  wide?: boolean;
}) {
  return (
    <Press onPress={p.onPress} style={[s.plan, p.wide && s.planWide, p.active && s.planActive]} testID={p.testID}>
      {p.badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{p.badge}</Text>
        </View>
      ) : null}
      <View style={s.radioRow}>
        <View style={[s.radio, p.active && { borderColor: '#1F6BFF' }]}>{p.active && <View style={s.radioDot} />}</View>
        <Text style={s.planLabel}>{p.label}</Text>
      </View>
      <Text style={s.planPrice} testID={p.priceTestID}>{p.price}</Text>
      <Text style={s.planNote} testID={p.periodTestID}>{p.note}</Text>
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
  freeBox: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(37,194,122,0.12)' },
  freeText: { color: '#CDEFDD', fontSize: 13, flex: 1, lineHeight: 18 },
  plan: { flexGrow: 1, flexBasis: '45%', borderRadius: 18, padding: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  planWide: { flexBasis: '100%' },
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
