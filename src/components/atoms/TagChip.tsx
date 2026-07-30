import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export function TagChip({ label, selected = false, onPress, icon }: TagChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.container,
        selected ? styles.selectedContainer : styles.unselectedContainer,
      ]}
    >
      {icon}
      <Text
        style={[
          Typography.bodyBold,
          selected ? styles.selectedText : styles.unselectedText,
          icon ? styles.textWithIcon : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  selectedContainer: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  unselectedContainer: {
    backgroundColor: Colors.surface,
    borderColor: Colors.secondary,
  },
  selectedText: {
    color: Colors.primary,
  },
  unselectedText: {
    color: Colors.primary,
  },
  textWithIcon: {
    marginLeft: Spacing.xs,
  },
});
