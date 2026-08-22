import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import type { RequestCardData } from '@/src/types/rescue';
import { useI18n } from '@/src/i18n';
import { statusLabel, statusColor } from '../status';

export function RequestSummaryCard({ request, onPress }: { request: RequestCardData; onPress: () => void }) {
  const language = useI18n((state) => state.language);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        language === 'en' ? `Open ${request.serviceLabel} request` : `Mở yêu cầu ${request.serviceLabel}`
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={request.serviceIcon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={Colors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {request.serviceLabel}
        </Text>
        <Text style={styles.area} numberOfLines={1}>
          {request.pickupAreaLabel}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor(request.status) }]} />
          <Text style={styles.status} numberOfLines={1}>
            {statusLabel(request.status, language)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.78 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  content: { flex: 1, gap: 2 },
  title: { ...Typography.bodyBold, color: Colors.textPrimary },
  area: { ...Typography.caption, color: Colors.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
});
