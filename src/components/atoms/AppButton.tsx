import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Typography as Typo } from '@/src/constants/spacing';

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
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.button,
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <Text style={[styles.text, Typo.bodyBold, getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
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
  disabled: {
    opacity: 0.5,
  },
});
