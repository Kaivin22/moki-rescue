import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ScheduledPlace } from '@/src/features/itinerary/services/routeOptimizer';
import type { TransportMode } from '@/src/types/domain';

interface RouteNodeProps {
  item: ScheduledPlace;
  index: number;
  isLast: boolean;
  onRemove?: (placeId: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  isVip?: boolean;
  draggable?: boolean;
  transport?: TransportMode;
}

function transportIcon(transport?: TransportMode): React.ComponentProps<typeof Ionicons>['name'] {
  if (transport === 'walk') return 'walk-outline';
  if (transport === 'bicycle') return 'bicycle-outline';
  if (transport === 'motorbike') return 'navigate-outline';
  return 'car-outline';
}

export function RouteNode({
  item,
  index,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
  isVip,
  transport,
}: RouteNodeProps) {
  const {
    place, startTime, endTime, travelTimeToNextMin, travelDistanceKm,
    weatherScore, weatherNote, isMeal, isIndoor, rainAtHour,
  } = item;
  const [showTip, setShowTip] = useState(false);

  const getWeatherColor = (score?: number) => {
    if (score === undefined) return Colors.secondary;
    if (score >= 75) return '#22c55e'; // green
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // ─── Meal / break slot: kiểu hiển thị riêng (nền be, icon 🍜) ───
  if (isMeal) {
    return (
      <View style={styles.nodeWrapper}>
        <View style={styles.timeline}>
          <View style={[styles.dot, styles.dotMeal]} />
          {!isLast && <View style={styles.line} />}
        </View>
        <View style={[styles.card, styles.cardMeal]}>
          <View style={styles.cardHeader}>
            <View style={[styles.timeTag, styles.timeTagMeal]}>
              <Ionicons name="time-outline" size={12} color={Colors.textOnAccent} />
              <Text style={[styles.timeText, { color: Colors.textOnAccent }]}>{startTime} – {endTime}</Text>
            </View>
          </View>
          <Text style={styles.mealName}>🍜 {place.name}</Text>
          <Text style={styles.mealHint}>Khung nghỉ ăn — có thể chọn quán gần đó.</Text>
        </View>
      </View>
    );
  }

  const weatherColor = getWeatherColor(weatherScore);
  const showRainRibbon = !isIndoor && (rainAtHour ?? 0) > 2;

  return (
    <View style={styles.nodeWrapper}>
      {/* Left: Timeline */}
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Right: Card */}
      <View style={[styles.card, index === 0 && styles.cardFirst]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.timeTag}>
            <Ionicons name="time-outline" size={12} color={Colors.white} />
            <Text style={styles.timeText}>{startTime} – {endTime}</Text>
          </View>

          {/* Weather badge for VIP — chấm theo GIỜ THỰC, chạm để xem chú giải */}
          {isVip && weatherScore !== undefined && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowTip((s) => !s)}
              style={[styles.weatherBadge, { backgroundColor: weatherColor + '22' }]}
            >
              <Text style={[styles.weatherScore, { color: weatherColor }]}>
                {weatherScore >= 75 ? '☀️' : weatherScore >= 50 ? '⛅' : '🌧️'} {weatherScore}đ
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tooltip chú giải điểm số */}
        {isVip && showTip && weatherScore !== undefined && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>
              {weatherScore}đ tại {startTime} · {isIndoor ? 'điểm trong nhà' : 'điểm ngoài trời'}
              {rainAtHour !== undefined ? ` · mưa ${Math.round(rainAtHour)}mm` : ''}.
              {'\n'}75đ+ = lý tưởng · 50–74đ = ổn · {'<'}50đ = nên tránh.
            </Text>
          </View>
        )}

        {/* Place name + indoor/outdoor icon */}
        <View style={styles.nameRow}>
          <Text style={styles.placeIcon}>{isIndoor ? '🏛️' : '🏖️'}</Text>
          <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
        </View>

        {/* Category & duration */}
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Ionicons name="pricetag-outline" size={12} color={Colors.secondary} />
            <Text style={styles.chipText}>{place.category}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="hourglass-outline" size={12} color={Colors.secondary} />
            <Text style={styles.chipText}>{place.avg_duration_min} phút</Text>
          </View>
        </View>

        {/* Ruy-băng cảnh báo mưa mảnh — chỉ khi slot rơi khung mưa */}
        {isVip && showRainRibbon && (
          <View style={styles.rainRibbon}>
            <Text style={styles.rainRibbonText}>
              ☔ {startTime} dự báo mưa {Math.round(rainAtHour!)}mm — cân nhắc mang ô
            </Text>
          </View>
        )}

        {/* Conflict ribbon (đóng cửa / ngày nghỉ / vượt giờ) */}
        {item.conflict && (
          <View style={styles.conflictRibbon}>
            <Text style={styles.conflictRibbonText}>⚠️ {item.conflict}</Text>
          </View>
        )}

        {/* Weather note for VIP */}
        {isVip && weatherNote && !showRainRibbon && (
          <Text style={styles.weatherNote}>{weatherNote}</Text>
        )}

        {/* Action buttons */}
        {(onMoveUp || onMoveDown || onRemove) && (
          <View style={styles.actions}>
            {onMoveUp && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => onMoveUp(index)}>
                <Ionicons name="arrow-up" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onMoveDown && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => onMoveDown(index)}>
                <Ionicons name="arrow-down" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={() => onRemove(place.id)}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Travel segment to next place */}
      {!isLast && travelTimeToNextMin > 0 && (
        <View style={styles.travelSegment}>
          <View style={styles.travelLine} />
          <View style={styles.travelBadge}>
            <Ionicons name={transportIcon(transport)} size={12} color={Colors.white} />
            <Text style={styles.travelText}>
              {travelDistanceKm} km · ~{travelTimeToNextMin} phút
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nodeWrapper: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.sm,
    paddingTop: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.primary,
    zIndex: 1,
  },
  dotMeal: {
    backgroundColor: Colors.warning,
    borderColor: '#B4832B',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.accent + '50',
    minHeight: 60,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFirst: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  cardMeal: {
    backgroundColor: '#FBF6EC',
    borderColor: Colors.warning + '80',
    borderStyle: 'dashed',
  },
  mealName: {
    ...Typography.bodyBold,
    color: '#8A6A22',
  },
  mealHint: {
    ...Typography.caption,
    color: '#A98A4B',
    fontSize: 11,
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  timeTagMeal: {
    backgroundColor: Colors.warning,
  },
  timeText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 11,
  },
  weatherBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  weatherScore: {
    fontSize: 11,
    fontWeight: '700',
  },
  tooltip: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tooltipText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 11,
    lineHeight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  placeIcon: {
    fontSize: 15,
    marginTop: 1,
  },
  placeName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.secondary,
    fontSize: 11,
  },
  rainRibbon: {
    backgroundColor: '#E8F1FB',
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  rainRibbonText: {
    ...Typography.caption,
    color: Colors.textOnSky,
    fontSize: 11,
  },
  conflictRibbon: {
    backgroundColor: '#FBECEC',
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  conflictRibbonText: {
    ...Typography.caption,
    color: '#8A2E32',
    fontSize: 11,
  },
  weatherNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    backgroundColor: '#FFF0F0',
  },
  travelSegment: {
    position: 'absolute',
    left: 11,
    bottom: -20,
    width: 100,
    alignItems: 'center',
    zIndex: 10,
  },
  travelLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.accent + '50',
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
    marginLeft: 46,
  },
  travelText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
});
