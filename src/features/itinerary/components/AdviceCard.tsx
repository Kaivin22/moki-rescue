import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Advice } from '@/src/features/itinerary/services/routeOptimizer';

interface AdviceCardProps {
  advice: Advice;
  onApply?: (advice: Advice) => void;
  onDismiss?: (adviceId: string) => void;
  /** true khi lịch trình đã lưu — chỉ đọc, ẩn nút hành động */
  readOnly?: boolean;
}

/** Màu theo severity: info=sky, suggest=accent, warning=warning. */
function severityColors(severity: Advice['severity']) {
  switch (severity) {
    case 'warning':
      return { border: Colors.error, bg: '#FBECEC', title: '#8A2E32' };
    case 'suggest':
      return { border: Colors.accentDark, bg: Colors.accent + '1E', title: Colors.primary };
    case 'info':
    default:
      return { border: Colors.info, bg: '#E8F1FB', title: Colors.textOnSky };
  }
}

export function AdviceCard({ advice, onApply, onDismiss, readOnly }: AdviceCardProps) {
  const c = severityColors(advice.severity);
  const canApply = !!advice.action && !!onApply && !readOnly;

  return (
    <View style={[styles.card, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{advice.icon}</Text>
        <Text style={[styles.title, { color: c.title }]}>{advice.title}</Text>
      </View>
      <Text style={styles.detail}>{advice.detail}</Text>

      {!readOnly && (onApply || onDismiss) && (
        <View style={styles.actions}>
          {onDismiss && (
            <TouchableOpacity style={styles.dismissBtn} onPress={() => onDismiss(advice.id)}>
              <Text style={styles.dismissText}>Bỏ qua</Text>
            </TouchableOpacity>
          )}
          {canApply && (
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: c.border }]}
              onPress={() => onApply!(advice)}
            >
              <Text style={styles.applyText}>Áp dụng ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: { fontSize: 18, marginTop: 1 },
  title: { ...Typography.bodyBold, flex: 1 },
  detail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dismissBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  dismissText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' },
  applyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  applyText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
});
