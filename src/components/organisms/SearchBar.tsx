import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';

interface SearchBarProps extends TextInputProps {
  onClear?: () => void;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export function SearchBar({
  value,
  onClear,
  onFilterPress,
  showFilter = false,
  style,
  ...props
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color={Colors.secondary} style={styles.searchIcon} />
        
        <TextInput
          style={[styles.input, Typography.body]}
          placeholderTextColor={Colors.secondary}
          value={value}
          {...props}
        />
        
        {value ? (
          <TouchableOpacity onPress={onClear} style={styles.iconButton}>
            <Ionicons name="close-circle" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showFilter && (
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
          <Ionicons name="options" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    height: 48,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
