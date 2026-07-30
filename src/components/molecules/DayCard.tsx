import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';

interface DayCardProps {
  dayNumber: number;
  title: string;
  cost?: string;
  children?: React.ReactNode;
}

export function DayCard({ dayNumber, title, cost, children }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
      >
        <View style={styles.leftIndicator} />
        
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={[Typography.display, styles.dayNumber]}>
              {dayNumber}
            </Text>
            <View style={styles.titleInfo}>
              <Text style={[Typography.h3, styles.title]}>{title}</Text>
              {cost && (
                <Text style={[Typography.caption, styles.cost]}>
                  Chi phí dự kiến: {cost}
                </Text>
              )}
            </View>
          </View>
          
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Colors.primary}
          />
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
    height: 48,
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
    alignItems: 'center',
  },
  dayNumber: {
    color: Colors.accent,
    marginRight: Spacing.md,
  },
  titleInfo: {
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
  },
  cost: {
    color: Colors.secondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.md,
    paddingLeft: Spacing.xl + Spacing.md, // Align with title
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
