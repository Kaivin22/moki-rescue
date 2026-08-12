import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';

export interface SegmentItem {
  key: string;
  label: string;
  badge?: number; // hiển thị số nhỏ bên cạnh label (vd số lời khuyên)
}

interface SegmentedControlProps {
  items: SegmentItem[];
  value: string;
  onChange: (key: string) => void;
}

/** SegmentedControl — thanh chọn tab kiểu iOS, dùng cho Step 3 (Lịch trình/Thời tiết/Lời khuyên). */
export function SegmentedControl({ items, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.segment, active && styles.segmentActive]}
            activeOpacity={0.8}
            onPress={() => onChange(item.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
            {item.badge !== undefined && item.badge > 0 && (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing.md,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  segmentActive: {
    backgroundColor: Colors.cardBg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: Colors.error },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  badgeTextActive: { color: Colors.white },
});
