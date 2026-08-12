import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Duration } from '@/src/constants/motion';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

// Bật LayoutAnimation trên Android (mặc định tắt)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DayCardProps {
  dayNumber: number;
  title: string;
  /** Ngày thực tế đã được format sẵn, VD: "Thứ Hai, 04/08" */
  date?: string;
  placeCount?: number;
  distanceKm?: number;
  weatherSummary?: string;
  /** Mặc định true — mở sẵn khi xem lịch trình */
  defaultExpanded?: boolean;
  children?: React.ReactNode;
}

export function DayCard({
  dayNumber,
  title,
  date,
  placeCount,
  distanceKm,
  weatherSummary,
  defaultExpanded = true,
  children,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const reduceMotion = useReduceMotion();
  const chevronRotation = useRef(
    new Animated.Value(defaultExpanded ? 1 : 0)
  ).current;

  useEffect(() => {
    if (reduceMotion) {
      chevronRotation.stopAnimation();
      chevronRotation.setValue(expanded ? 1 : 0);
      return;
    }
    const animation = Animated.timing(chevronRotation, {
      toValue: expanded ? 1 : 0,
      duration: Duration.slow,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, chevronRotation, reduceMotion]);

  const toggleExpanded = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          Duration.slow,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );
    }
    setExpanded((prev) => !prev);
  };

  const rotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleExpanded}
        style={styles.header}
      >
        <View style={styles.leftIndicator} />

        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={[Typography.display, styles.dayNumber]}>
              {dayNumber}
            </Text>
            <View style={styles.titleInfo}>
              <Text style={[Typography.h3, styles.title]} numberOfLines={1}>{title}</Text>

              {/* Ngày thực tế */}
              {date && (
                <Text style={styles.dateText}>📅 {date}</Text>
              )}

              {/* Meta: số điểm + km */}
              <View style={styles.metaRow}>
                {placeCount !== undefined && (
                  <Text style={styles.metaText}>📍 {placeCount} điểm</Text>
                )}
                {distanceKm !== undefined && distanceKm > 0 && (
                  <Text style={styles.metaText}>🚗 {distanceKm} km</Text>
                )}
                {weatherSummary && (
                  <Text style={styles.metaText}>{weatherSummary}</Text>
                )}
              </View>

            </View>
          </View>

          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons
              name="chevron-down"
              size={24}
              color={Colors.primary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {expanded && children && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  leftIndicator: {
    width: 4,
    height: 56,
    backgroundColor: Colors.accent,
    borderTopRightRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  dayNumber: {
    color: Colors.accent,
    marginRight: Spacing.md,
    lineHeight: 40,
  },
  titleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.secondary,
    fontSize: 11,
  },
  content: {
    padding: Spacing.md,
    paddingLeft: Spacing.xl + Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
