import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { usePlaceDetails } from '@/src/hooks/usePlaces';
import { Badge } from '@/src/components/atoms/Badge';
import { StarRating } from '@/src/components/atoms/StarRating';
import { AppButton } from '@/src/components/atoms/AppButton';

const { height } = Dimensions.get('window');

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: place, isLoading, error } = usePlaceDetails(id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'tips'>('overview');
  const [isSaved, setIsSaved] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !place) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: Colors.error }}>Không thể tải thông tin địa điểm</Text>
        <AppButton title="Quay lại" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={place.image_urls?.[0] ? { uri: place.image_urls[0] } : require('@/assets/icon.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          
          <View style={styles.floatingHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerRight}>
              <TouchableOpacity style={[styles.iconBtn, { marginRight: Spacing.sm }]}>
                <Ionicons name="share-social" size={24} color={Colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSaved(!isSaved)} style={styles.iconBtn}>
                <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? Colors.accent : Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.badgesRow}>
            <Badge label={place.category} variant="darkGreen" />
            <View style={{ width: 8 }} />
            <Badge label="Đã xác minh" variant="lime" icon={<Ionicons name="checkmark-circle" size={14} color={Colors.primary} />} />
          </View>
          
          <Text style={[Typography.display, styles.title]}>{place.name}</Text>
          
          <View style={styles.ratingRow}>
            <StarRating rating={place.rating_avg} count={place.rating_count} />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Ionicons name="ticket" size={20} color={Colors.secondary} />
              <Text style={[Typography.caption, styles.infoText]}>
                {place.entry_fee_max === 0 ? 'Miễn phí' : `${place.entry_fee_min/1000}k - ${place.entry_fee_max/1000}k`}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Ionicons name="time" size={20} color={Colors.secondary} />
              <Text style={[Typography.caption, styles.infoText]}>~{place.avg_duration_min} phút</Text>
            </View>
            <View style={styles.infoCol}>
              <Ionicons name="location" size={20} color={Colors.secondary} />
              <Text style={[Typography.caption, styles.infoText]}>2.5 km</Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="map-outline" size={20} color={Colors.primary} />
            <Text style={[Typography.body, styles.addressText]}>{place.address}</Text>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeInfo}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={[Typography.bodyBold, { marginLeft: Spacing.sm }]}>
                {place.opening_time.slice(0,5)} - {place.closing_time.slice(0,5)}
              </Text>
            </View>
            <Badge label="Đang mở cửa" variant="lime" />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {['overview', 'reviews', 'tips'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[
                  Typography.bodyBold,
                  activeTab === tab ? styles.activeTabText : styles.inactiveTabText
                ]}>
                  {tab === 'overview' ? 'Tổng quan' : tab === 'reviews' ? 'Đánh giá' : 'Mẹo hay'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'overview' && (
              <>
                <Text style={[Typography.body, { color: Colors.secondary, lineHeight: 24 }]}>
                  {place.description || 'Chưa có mô tả cho địa điểm này.'}
                </Text>
                
                <Text style={[Typography.h3, { color: Colors.primary, marginTop: Spacing.xl, marginBottom: Spacing.md }]}>
                  Phù hợp với
                </Text>
                <View style={styles.tagsRow}>
                  {place.suitable_for?.map(tag => (
                    <View key={tag} style={{ marginRight: 8, marginBottom: 8 }}>
                      <Badge label={tag} variant="mint" />
                    </View>
                  ))}
                </View>
              </>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewSummary}>
                <Text style={[Typography.display, { fontSize: 48, color: Colors.primary }]}>
                  {place.rating_avg.toFixed(1)}
                </Text>
                <StarRating rating={place.rating_avg} showCount={false} size={24} />
                <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 8 }]}>
                  Dựa trên {place.rating_count} đánh giá
                </Text>
                
                <AppButton
                  title="Viết đánh giá"
                  variant="secondary"
                  style={{ marginTop: Spacing.xl }}
                  onPress={() => {}}
                />
              </View>
            )}

            {activeTab === 'tips' && (
              <View style={styles.tipsContainer}>
                <View style={styles.tipCard}>
                  <Text style={[Typography.h3, { color: Colors.primary, marginBottom: Spacing.xs }]}>💡 Lời khuyên</Text>
                  <Text style={[Typography.body, { color: Colors.secondary }]}>
                    {place.tips || 'Chưa có mẹo nào từ cộng đồng.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <AppButton
          title="Thêm vào lịch trình"
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: height * 0.35,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -20,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    marginBottom: Spacing.lg,
  },
  infoCol: {
    alignItems: 'center',
  },
  infoText: {
    color: Colors.secondary,
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addressText: {
    color: Colors.primary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  activeTabText: {
    color: Colors.primary,
  },
  inactiveTabText: {
    color: Colors.secondary,
  },
  tabContent: {
    minHeight: 200,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewSummary: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.md,
  },
  tipsContainer: {
    marginTop: Spacing.sm,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: 34, // Safe area
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
