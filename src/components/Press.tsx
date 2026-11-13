import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | 'none';
  disabled?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number;
  testID?: string;
};

/** Button wrapper with a springy press and a haptic tick. */
export function Press({ children, onPress, style, haptic = 'light', disabled, accessibilityLabel, hitSlop, testID }: Props) {
  const scale = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
      onPress={() => {
        if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={[a, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
