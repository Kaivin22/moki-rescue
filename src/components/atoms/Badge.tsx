import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';

export type BadgeVariant = 'lime' | 'sage' | 'mint' | 'darkGreen' | 'red';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({ label, variant = 'lime', icon }: BadgeProps) {
  const getColors = (): { bg: string; text: string } => {
    switch (variant) {
      case 'lime':
        return { bg: Colors.accent, text: Colors.primary };
      case 'sage':
        return { bg: Colors.secondary, text: Colors.white };
      case 'mint':
        return { bg: Colors.surface, text: Colors.primary };
      case 'darkGreen':
        return { bg: Colors.primary, text: Colors.accent };
      case 'red':
        return { bg: Colors.error, text: Colors.white };
      default:
        return { bg: Colors.accent, text: Colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[Typography.caption, { color: text, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
});
