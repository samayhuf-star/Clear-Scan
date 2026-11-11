import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { isRevenueCatReady, presentPaywall } from '../lib/revenuecat';

// ClearScan Plus uses RevenueCat's own paywall: design, prices, trial and plans are edited in the
// RevenueCat dashboard (offering "default") and update without an app release.
export default function Paywall() {
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isRevenueCatReady()) {
        Alert.alert('Purchases not set up yet', 'This build has no store connection configured yet.');
      } else {
        await presentPaywall('paywall_screen');
      }
      if (alive) router.back();
    })();
    return () => {
      alive = false;
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1B33', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#fff" />
    </View>
  );
}
