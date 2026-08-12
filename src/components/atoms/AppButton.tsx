import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Typography as Typo } from '@/src/constants/spacing';
import { Spring, Scale } from '@/src/constants/motion';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
  accessibilityLabel,
}: AppButtonProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  // Crossfade giữa text và spinner
  const textOpacity = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const spinnerOpacity = useRef(new Animated.Value(loading ? 1 : 0)).current;
  // Fade opacity khi disabled
  const containerOpacity = useRef(
    new Animated.Value(disabled ? 0.5 : 1)
  ).current;

  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: loading ? 0 : 1,
      duration: reduceMotion ? 0 : 160,
      useNativeDriver: true,
    }).start();
    Animated.timing(spinnerOpacity, {
      toValue: loading ? 1 : 0,
      duration: reduceMotion ? 0 : 160,
      useNativeDriver: true,
    }).start();
  }, [loading, reduceMotion, textOpacity, spinnerOpacity]);

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: disabled ? 0.5 : 1,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, containerOpacity, reduceMotion]);

  const animateTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      ...Spring.press,
    }).start();
  };

  const handlePressIn = (_e: GestureResponderEvent) => animateTo(Scale.press);
  const handlePressOut = (_e: GestureResponderEvent) => animateTo(1);

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: Colors.accent };
      case 'secondary':
        return {
          backgroundColor: Colors.white,
          borderWidth: 1.5,
          borderColor: Colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: Colors.primary,
        };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'destructive':
        return { backgroundColor: Colors.error };
      default:
        return { backgroundColor: Colors.accent };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return { color: Colors.textOnAccent };
      case 'secondary':
      case 'outline':
      case 'ghost':
        return { color: Colors.primary };
      case 'destructive':
        return { color: Colors.white };
      default:
        return { color: Colors.textOnAccent };
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <Animated.View
        style={[
          styles.button,
          getContainerStyle(),
          fullWidth && styles.fullWidth,
          { transform: [{ scale }], opacity: containerOpacity },
          style,
        ]}
      >
        {/* Spinner nằm chồng, crossfade với text */}
        <Animated.View
          style={[styles.spinnerLayer, { opacity: spinnerOpacity }]}
          pointerEvents="none"
        >
          <ActivityIndicator color={Colors.primary} />
        </Animated.View>

        <Animated.Text
          style={[
            styles.text,
            Typo.bodyBold,
            getTextStyle(),
            { opacity: textOpacity },
            textStyle,
          ]}
        >
          {title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
  spinnerLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
