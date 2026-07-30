import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ScheduledPlace } from '@/src/features/itinerary/services/routeOptimizer';

interface RouteNodeProps {
  item: ScheduledPlace;
  index: number;
  isLast: boolean;
  onRemove?: (placeId: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  isVip?: boolean;
  draggable?: boolean;
}

export function RouteNode({
  item,
  index,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
  isVip,
}: RouteNodeProps) {
  const { place, startTime, endTime, travelTimeToNextMin, travelDistanceKm, weatherScore, weatherNote } = item;

  const getWeatherColor = (score?: number) => {
    if (!score) return Colors.secondary;
    if (score >= 75) return '#22c55e'; // green
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

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

          {/* Weather badge for VIP */}
          {isVip && weatherScore !== undefined && (
            <View style={[styles.weatherBadge, { backgroundColor: getWeatherColor(weatherScore) + '22' }]}>
              <Text style={[styles.weatherScore, { color: getWeatherColor(weatherScore) }]}>
                {weatherScore >= 75 ? '☀️' : weatherScore >= 50 ? '⛅' : '🌧️'} {weatherScore}pts
              </Text>
            </View>
          )}
        </View>

        {/* Place name */}
        <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>

        {/* Category & duration */}
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={12} color={Colors.secondary} />
            <Text style={styles.chipText}>{place.category}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="hourglass-outline" size={12} color={Colors.secondary} />
            <Text style={styles.chipText}>{place.avg_duration_min || 60} phút</Text>
          </View>
        </View>

        {/* Weather note for VIP */}
        {isVip && weatherNote && (
          <Text style={styles.weatherNote}>{weatherNote}</Text>
        )}

        {/* Action buttons */}
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
      </View>

      {/* Travel segment to next place */}
      {!isLast && travelTimeToNextMin > 0 && (
        <View style={styles.travelSegment}>
          <View style={styles.travelLine} />
          <View style={styles.travelBadge}>
            <Ionicons name="car-outline" size={12} color={Colors.white} />
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
  placeName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
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
