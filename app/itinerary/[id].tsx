import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { DayCard } from '@/src/components/molecules/DayCard';
import { Badge } from '@/src/components/atoms/Badge';
import { AppButton } from '@/src/components/atoms/AppButton';

import { useItineraryDetails } from '@/src/hooks/useItineraries';

export default function ItineraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: itinerary, isLoading, error } = useItineraryDetails(id);
  
  const [isSaved, setIsSaved] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !itinerary) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.error }}>Không thể tải lịch trình</Text>
        <AppButton title="Quay lại" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroContainer}>
          <Image
            source={itinerary.cover_image_url ? { uri: itinerary.cover_image_url } : require('@/assets/icon.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.overlay}>
            <View style={styles.floatingHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setIsSaved(!isSaved)} style={[styles.iconBtn, { marginRight: Spacing.sm }]}>
                  <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? Colors.accent : Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push(`/itinerary/share/${id}`)} style={styles.iconBtn}>
                  <Ionicons name="people" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.heroTextContainer}>
              <Badge label={`${itinerary.num_days} ngày`} variant="lime" />
              <Text style={[Typography.display, styles.title]}>{itinerary.title}</Text>
              <Text style={[Typography.body, { color: Colors.surface }]}>
                Tạo bởi {itinerary.profiles?.display_name || 'Khách'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
              <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 4 }]}>Chi phí</Text>
              <Text style={[Typography.bodyBold, { color: Colors.primary }]}>
                {itinerary.budget_total ? `${itinerary.budget_total.toLocaleString()}đ` : 'Chưa tính'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="map-outline" size={24} color={Colors.primary} />
              <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 4 }]}>Di chuyển</Text>
              <Text style={[Typography.bodyBold, { color: Colors.primary }]}>
                {itinerary.transport || 'Tự túc'}
              </Text>
            </View>
          </View>

          <Text style={[Typography.h2, { color: Colors.primary, marginBottom: Spacing.md }]}>
            Lịch trình chi tiết
          </Text>

          {itinerary.itinerary_days?.map((day) => (
            <DayCard
              key={day.id}
              dayNumber={day.day_number}
              title={day.title || `Ngày ${day.day_number}`}
            >
              {day.itinerary_slots?.map((slot, idx) => (
                <View key={slot.id} style={styles.timelineItem}>
                  <Text style={[Typography.label, { color: Colors.accent, width: 50 }]}>{slot.start_time || '--:--'}</Text>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={[Typography.bodyBold, { color: Colors.textPrimary }]}>{slot.place_name}</Text>
                  </View>
                </View>
              ))}
            </DayCard>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <AppButton
          title="Sử dụng lịch trình này"
          onPress={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  heroContainer: {
    height: 300,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 68, 37, 0.5)',
    justifyContent: 'space-between',
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 68, 37, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    padding: Spacing.xl,
  },
  title: {
    color: Colors.white,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  content: {
    padding: Spacing.md,
    marginTop: -20,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.white,
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginRight: Spacing.md,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
