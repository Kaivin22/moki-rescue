import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { StarRating } from '../atoms/StarRating';
import { Badge } from '../atoms/Badge';
import { categoryLabel } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useIsPlaceSaved, useToggleSavePlace } from '@/src/hooks/usePlaces';
import { AnimatedPressable } from '../atoms/AnimatedPressable';
import { Spring, Scale } from '@/src/constants/motion';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { router } from 'expo-router';

interface PlaceCardProps {
  id?: string;
  title: string;
  imageUrl?: string;
  rating: number | null;
  ratingCount: number;
  category: string;
  distance?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  isSaved?: boolean;
}

export const PlaceCard = React.memo(function PlaceCard({
  id,
  title,
  imageUrl,
  rating,
  ratingCount,
  category,
  distance,
  onPress,
  style,
  compact = false,
  isSaved: isSavedProp,
}: PlaceCardProps) {
  const userId = useAuthStore((state) => state.user?.id);

  // Tránh fetch thừa nếu isSavedProp đã được truyền từ cha (giải quyết N+1)
  const { data: isSavedQuery } = useIsPlaceSaved(isSavedProp === undefined ? userId : null, id);
  const isSaved = isSavedProp !== undefined ? isSavedProp : isSavedQuery;

  const toggleSave = useToggleSavePlace();
  const reduceMotion = useReduceMotion();
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleToggleSave = () => {
    if (!id) return;
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Đăng nhập để lưu địa điểm này.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: `/place/${id}` } }) },
      ]);
      return;
    }
    // Bounce pop cho icon tim tạo cảm giác "delight"
    if (!reduceMotion) {
      heartScale.stopAnimation();
      heartScale.setValue(1);
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: Scale.pop,
          useNativeDriver: true,
          ...Spring.bouncy,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          ...Spring.bouncy,
        }),
      ]).start();
    }
    toggleSave.mutate({ userId, placeId: id, isCurrentlySaved: !!isSaved });
  };
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      pressScale={Scale.pressCard}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.container, compact && styles.compact, style]}
    >
      <View style={[styles.imageContainer, compact && styles.compactImage]}>
        <Image
          source={imageUrl ? { uri: imageUrl } : require('@/assets/icon.png')}
          style={styles.image}
          contentFit="cover"
          transition={reduceMotion ? 0 : 200}
          cachePolicy="memory-disk"
          recyclingKey={id}
        />
        <View style={styles.badgeContainer}>
          <Badge label={categoryLabel(category)} variant="darkGreen" />
        </View>

        {id && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleToggleSave}
            disabled={toggleSave.isPending}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons name={isSaved ? "heart" : "heart-outline"} size={20} color={isSaved ? Colors.error : Colors.secondary} />
            </Animated.View>
          </TouchableOpacity>
        )}
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
    </AnimatedPressable>
  );
});

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
  saveBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
