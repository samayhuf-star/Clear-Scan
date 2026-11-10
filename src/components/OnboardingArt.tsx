import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#0B1B33';
const BLUE = '#1F6BFF';
const ORANGE = '#FF8A1F';
const GREEN = '#25C27A';

function Paper({ children, w = 200, h = 270 }: { children?: React.ReactNode; w?: number; h?: number }) {
  return (
    <View style={[s.paper, { width: w, height: h }]}>
      {children}
    </View>
  );
}

function Lines({ rows = 8, tint = '#D5DCE8' }: { rows?: number; tint?: string }) {
  return (
    <View style={{ gap: 11, padding: 18 }}>
      <View style={{ height: 12, width: '55%', borderRadius: 6, backgroundColor: '#9FB0CC' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ height: 7, width: `${100 - ((i * 13) % 38)}%`, borderRadius: 4, backgroundColor: tint }} />
      ))}
    </View>
  );
}

/** Scene 1: a scan beam sweeps the page, a "watermark" stamp fades away, a green check pops in. */
export function ScanScene() {
  const beam = useSharedValue(0);
  const stamp = useSharedValue(1);
  const check = useSharedValue(0);

  useEffect(() => {
    beam.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    const loop = () => {
      stamp.value = 1;
      check.value = 0;
      stamp.value = withDelay(1200, withTiming(0, { duration: 900 }));
      check.value = withDelay(1900, withSpring(1, { damping: 9, stiffness: 160 }));
    };
    loop();
    const id = setInterval(loop, 5200);
    return () => clearInterval(id);
  }, [beam, stamp, check]);

  const beamStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(beam.value, [0, 1], [0, 236]) }] }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stamp.value,
    transform: [{ rotate: '-24deg' }, { scale: interpolate(stamp.value, [0, 1], [1.4, 1]) }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: check.value }] }));

  return (
    <View style={s.stage}>
      <Paper>
        <Lines />
        <Animated.View style={[s.stamp, stampStyle]}>
          <Text style={s.stampText}>WATERMARK</Text>
        </Animated.View>
        <Animated.View style={[s.beam, beamStyle]}>
          <LinearGradient colors={['rgba(31,107,255,0)', 'rgba(31,107,255,0.55)']} style={{ flex: 1 }} />
          <View style={{ height: 2, backgroundColor: BLUE }} />
        </Animated.View>
        <View style={[s.corner, { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[s.corner, { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3 }]} />
        <View style={[s.corner, { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[s.corner, { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3 }]} />
      </Paper>
      <Animated.View style={[s.badge, checkStyle]}>
        <Ionicons name="checkmark" size={30} color="#fff" />
      </Animated.View>
    </View>
  );
}

/** Scene 2: lines of text light up one by one, and a search pill finds a word. */
export function OcrScene() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false);
  }, [t]);

  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <View style={s.stage}>
      <Paper>
        <View style={{ gap: 14, padding: 18, paddingTop: 22 }}>
          {rows.map((i) => (
            <OcrRow key={i} i={i} t={t} />
          ))}
        </View>
      </Paper>
      <SearchPill t={t} />
    </View>
  );
}

function OcrRow({ i, t }: { i: number; t: SharedValue<number> }) {
  const a = useAnimatedStyle(() => {
    const start = i / 8;
    const on = interpolate(t.value, [start, start + 0.12], [0, 1], 'clamp');
    return { width: `${interpolate(on, [0, 1], [0, 100])}%` };
  });
  const width = `${100 - ((i * 17) % 40)}%` as `${number}%`;
  return (
    <View style={{ width, height: 9, borderRadius: 5, backgroundColor: '#D5DCE8', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 9, borderRadius: 5, backgroundColor: i === 3 ? ORANGE : BLUE }, a]} />
    </View>
  );
}

function SearchPill({ t }: { t: SharedValue<number> }) {
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.45, 0.6], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(t.value, [0.45, 0.6], [14, 0], 'clamp') }],
  }));
  return (
    <Animated.View style={[s.pill, a]}>
      <Ionicons name="search" size={16} color={NAVY} />
      <Text style={s.pillText}>invoice</Text>
      <View style={s.pillDot} />
    </Animated.View>
  );
}

/** Scene 3: a shield pulses over a phone while the upload counter stays at zero. */
export function PrivateScene() {
  const ring = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    ring.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
    float.value = withRepeat(
      withSequence(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })),
      -1,
      false
    );
  }, [ring, float]);

  const shield = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [0, -8]) }] }));

  return (
    <View style={s.stage}>
      <Ring ring={ring} delay={0} />
      <Ring ring={ring} delay={0.5} />
      <Animated.View style={[s.shield, shield]}>
        <Ionicons name="shield-checkmark" size={84} color="#fff" />
      </Animated.View>
      <View style={[s.pill, { bottom: 10, flexDirection: 'row' }]}>
        <Ionicons name="airplane" size={16} color={NAVY} />
        <Text style={s.pillText}>Works in airplane mode</Text>
      </View>
      <View style={[s.pill, { top: 14, right: 6 }]}>
        <Ionicons name="cloud-offline" size={16} color={GREEN} />
        <Text style={s.pillText}>0 uploads</Text>
      </View>
    </View>
  );
}

function Ring({ ring, delay }: { ring: SharedValue<number>; delay: number }) {
  const a = useAnimatedStyle(() => {
    const p = (ring.value + delay) % 1;
    return { opacity: interpolate(p, [0, 1], [0.5, 0]), transform: [{ scale: interpolate(p, [0, 1], [0.6, 1.6]) }] };
  });
  return <Animated.View style={[s.ring, a]} />;
}

const s = StyleSheet.create({
  stage: { width: 300, height: 340, alignItems: 'center', justifyContent: 'center' },
  paper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  beam: { position: 'absolute', left: 0, right: 0, top: 0, height: 34 },
  stamp: {
    position: 'absolute',
    top: 100,
    left: 18,
    borderWidth: 3,
    borderColor: '#E5484D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampText: { color: '#E5484D', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: BLUE, borderRadius: 4 },
  badge: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  pill: {
    position: 'absolute',
    bottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  pillText: { color: NAVY, fontWeight: '700', fontSize: 14 },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 3, borderColor: BLUE },
  shield: {
    width: 150,
    height: 150,
    borderRadius: 40,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
});
