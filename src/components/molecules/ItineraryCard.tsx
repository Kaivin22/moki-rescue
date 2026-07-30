import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Badge } from '../atoms/Badge';

interface ItineraryCardProps {
  title: string;
  imageUrl?: string;
  days: number;
  authorName?: string;
  onPress?: () => void;
  style?: any;
}

export function ItineraryCard({
  title,
  imageUrl,
  days,
  authorName,
  onPress,
  style,
}: ItineraryCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.container, style]}
    >
      <Image
        source={imageUrl ? { uri: imageUrl } : require('@/assets/images/danang_city_panorama.jpg')}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={['transparent', Colors.overlay]}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <Badge label={`${days} ngày`} variant="lime" />
        </View>
        <View style={styles.bottomInfo}>
          <Text style={[Typography.h2, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          {authorName ? (
            <Text style={[Typography.caption, styles.author]}>bởi {authorName}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    width: '100%',
    height: 200,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bottomInfo: {
    justifyContent: 'flex-end',
  },
  title: {
    color: Colors.textOnDark,
    marginBottom: Spacing.xs,
  },
  author: {
    color: Colors.accentSoft,
  },
});
