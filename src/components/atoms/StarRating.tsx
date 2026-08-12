import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';

interface StarRatingProps {
  rating: number | null | undefined;
  count?: number;
  size?: number;
  showCount?: boolean;
}

export function StarRating({ rating, count, size = 16, showCount = true }: StarRatingProps) {
  const safeRating = Math.min(5, Math.max(0, rating ?? 0));
  // Generate 5 stars
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(safeRating)) {
      stars.push(
        <Ionicons key={i} name="star" size={size} color={Colors.accent} />
      );
    } else if (i === Math.ceil(safeRating) && !Number.isInteger(safeRating)) {
      stars.push(
        <Ionicons key={i} name="star-half" size={size} color={Colors.accent} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={size} color={Colors.secondary} />
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>{stars}</View>
      {showCount && count !== undefined && (
        <Text style={[styles.countText, Typography.caption]}>
          {count > 0 ? `${count} đánh giá` : 'Chưa có đánh giá'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  countText: {
    color: Colors.secondary,
    marginLeft: Spacing.xs,
  },
});
