import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { Spring, Scale } from '@/src/constants/motion';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Mức scale khi nhấn. Mặc định 0.96 (nút). Dùng Scale.pressCard cho thẻ lớn. */
  pressScale?: number;
  /** Giảm opacity nhẹ khi nhấn. Mặc định true. */
  dimOnPress?: boolean;
  disabled?: boolean;
}

/**
 * Pressable với phản hồi press-scale bằng spring (chạy trên native driver).
 * Dùng chung cho nút, thẻ để mọi tương tác chạm có cảm giác "lún rồi bật lại".
 */
export function AnimatedPressable({
  children,
  style,
  pressScale = Scale.press,
  dimOnPress = true,
  disabled = false,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!reduceMotion) return;
    scale.stopAnimation();
    opacity.stopAnimation();
    scale.setValue(1);
    opacity.setValue(1);
  }, [opacity, reduceMotion, scale]);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: pressScale,
        useNativeDriver: true,
        ...Spring.press,
      }).start();
      if (dimOnPress) {
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 90,
          useNativeDriver: true,
        }).start();
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...Spring.press,
      }).start();
      if (dimOnPress) {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }).start();
      }
    }
    onPressOut?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View
        style={[style, { transform: [{ scale }], opacity }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
