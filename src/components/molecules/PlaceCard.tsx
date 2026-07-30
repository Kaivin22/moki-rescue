import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { StarRating } from '../atoms/StarRating';
import { Badge } from '../atoms/Badge';
import { categoryLabel } from '@/src/utils/format';

interface PlaceCardProps {
  title: string;
  imageUrl?: string;
  rating: number;
  ratingCount: number;
  category: string;
  distance?: string;
  onPress?: () => void;
  style?: any;
  compact?: boolean;
}

export function PlaceCard({
  title,
  imageUrl,
  rating,
  ratingCount,
  category,
  distance,
  onPress,
  style,
  compact = false,
}: PlaceCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.container, compact && styles.compact, style]}
    >
      <View style={[styles.imageContainer, compact && styles.compactImage]}>
        <Image
          source={imageUrl ? { uri: imageUrl } : require('@/assets/icon.png')}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.badgeContainer}>
          <Badge label={categoryLabel(category)} variant="darkGreen" />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[Typography.h3, styles.title]} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.ratingRow}>
          <StarRating rating={rating} count={ratingCount} size={14} />
          {distance ? (
            <>
              <Text style={styles.dotSeparator}>·</Text>
              <Text style={[Typography.caption, styles.distance]}>{distance}</Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.xl,
    width: 236,
    height: 268,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
    marginRight: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compact: {
    width: '100%',
    height: 240,
    marginRight: 0,
  },
  imageContainer: {
    height: '58%',
    width: '100%',
    position: 'relative',
  },
  compactImage: {
    height: '55%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
  },
  infoContainer: {
    padding: Spacing.md,
    justifyContent: 'space-between',
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  dotSeparator: {
    color: Colors.secondary,
    marginHorizontal: Spacing.xs,
  },
  distance: {
    color: Colors.secondary,
  },
});
