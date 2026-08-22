import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useCopy, useI18n } from '@/src/i18n';
import type { RatingSummary } from '@/src/types/rescue';

const COPY = {
  vi: { newProvider: 'Mới trên MotoRescue', reviews: 'lượt đánh giá' },
  en: { newProvider: 'New on MotoRescue', reviews: 'reviews' },
} as const;

export function RatingBadge({ rating, label, compact = false }: RatingBadgeProps) {
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);
  const hasRating = rating.average != null && rating.count > 0;
  const value = hasRating
    ? `${rating.average!.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })} · ${rating.count} ${c.reviews}`
    : c.newProvider;

  return (
    <View style={[styles.badge, compact && styles.compact]} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons
        name={hasRating ? 'star' : 'star-outline'}
        size={compact ? 15 : 18}
        color={hasRating ? Colors.accentDark : Colors.textMuted}
      />
      <View style={styles.textWrap}>
        {!compact ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={[styles.value, compact && styles.compactValue]}>{value}</Text>
      </View>
    </View>
  );
}

interface RatingBadgeProps {
  rating: RatingSummary;
  label: string;
  compact?: boolean;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
  },
  compact: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: Spacing.sm },
  textWrap: { flexShrink: 1 },
  label: { ...Typography.caption, color: Colors.textMuted },
  value: { ...Typography.bodyBold, color: Colors.textPrimary },
  compactValue: { ...Typography.caption, color: Colors.textPrimary },
});
