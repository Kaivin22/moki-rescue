import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Share, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { usePlaceDetails, useIsPlaceSaved, useToggleSavePlace } from '@/src/hooks/usePlaces';
import { useAuthStore } from '@/src/stores/authStore';
import { Badge } from '@/src/components/atoms/Badge';
import { StarRating } from '@/src/components/atoms/StarRating';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import { useHelpfulReviewIds, usePlaceReviews, useSubmitPlaceReview, useToggleReviewHelpful } from '@/src/features/places/api/reviews';
import { ReviewComposerModal } from '@/src/features/places/components/ReviewComposerModal';
import { isPlaceOpenNow } from '@/src/features/places/utils/placeAvailability';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { submitPlaceReport } from '@/src/features/places/api/reports';
import { PlaceReportModal } from '@/src/features/places/components/PlaceReportModal';
import { StatusBar } from 'expo-status-bar';
import { PLANNING_LIMITS } from '@/src/features/itinerary/config/planningPolicy';

const { height } = Dimensions.get('window');

export default function PlaceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const userId = user?.id;
  const { draft, addPlaceToDraft } = useItineraryStore();

  const { data: place, isLoading, error, refetch: refetchPlace, isRefetching } = usePlaceDetails(id);
  const { data: isSaved } = useIsPlaceSaved(userId, id);
  const toggleSave = useToggleSavePlace();
  const { data: reviews = [], isLoading: reviewsLoading } = usePlaceReviews(id);
  const submitReview = useSubmitPlaceReview();
  const { data: helpfulReviewIds = new Set<string>() } = useHelpfulReviewIds(userId);
  const toggleHelpful = useToggleReviewHelpful();
  const reportPlace = useMutation({ mutationFn: submitPlaceReport });

  type PlaceTab = 'overview' | 'reviews' | 'tips';
  const tabs: PlaceTab[] = ['overview', 'reviews', 'tips'];
  const [activeTab, setActiveTab] = useState<PlaceTab>('overview');
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = place?.image_urls?.filter(Boolean).slice(0, 10) ?? [];
  const ownReview = reviews.find((review) => review.user_id === userId) ?? null;

  useEffect(() => setActiveImageIndex(0), [id]);

  const handleToggleSave = () => {
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Đăng nhập để lưu địa điểm.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    toggleSave.mutate({ userId, placeId: id, isCurrentlySaved: !!isSaved });
  };

  const handleShare = async () => {
    await Share.share({
      title: place?.name ?? 'Địa điểm Đà Nẵng',
      message: `${place?.name ?? 'Địa điểm'}\n${place?.address ?? ''}\ndanangitinerary://place/${id}`,
    });
  };

  const handleAddToItinerary = () => {
    if (!place) return;
    if (!draft.selectedPlaces.some((item) => item.id === place.id)
      && draft.selectedPlaces.length >= PLANNING_LIMITS.maxSelectedPlaces) {
      Alert.alert(
        'Đã đạt giới hạn',
        `Một lịch trình chỉ được chọn tối đa ${PLANNING_LIMITS.maxSelectedPlaces} địa điểm.`,
      );
      return;
    }
    addPlaceToDraft(place);
    router.push('/(tabs)/create');
  };

  const handleOpenReview = () => {
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Đăng nhập để viết đánh giá.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setReviewVisible(true);
  };

  const handleOpenReport = () => {
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Đăng nhập để gửi báo cáo địa điểm.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: `/place/${id}` } }) },
      ]);
      return;
    }
    setReportVisible(true);
  };

  const handleHelpful = (reviewId: string, reviewUserId: string) => {
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Đăng nhập để đánh dấu đánh giá hữu ích.');
      return;
    }
    if (reviewUserId === userId) return;
    toggleHelpful.mutate({ reviewId, userId, active: helpfulReviewIds.has(reviewId) });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !place) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <Text style={{ color: Colors.error }}>Không thể tải thông tin địa điểm</Text>
        <AppButton title={isRefetching ? 'Đang thử lại…' : 'Thử lại'} onPress={() => refetchPlace()} loading={isRefetching} style={{ marginTop: 20 }} />
        <AppButton title="Quay lại" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={images[activeImageIndex] ? { uri: images[activeImageIndex] } : require('@/assets/icon.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          {images.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.galleryButton, styles.galleryPrevious]}
                onPress={() => setActiveImageIndex(index => (index - 1 + images.length) % images.length)}
                accessibilityLabel="Xem ảnh trước"
              >
                <Ionicons name="chevron-back" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.galleryButton, styles.galleryNext]}
                onPress={() => setActiveImageIndex(index => (index + 1) % images.length)}
                accessibilityLabel="Xem ảnh tiếp theo"
              >
                <Ionicons name="chevron-forward" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.galleryCounter}>
                <Text style={styles.galleryCounterText}>{activeImageIndex + 1}/{images.length}</Text>
              </View>
            </>
          )}
          
          <View style={[styles.floatingHeader, { top: insets.top + Spacing.sm }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerRight}>
              <TouchableOpacity style={[styles.iconBtn, { marginRight: Spacing.sm }]} onPress={handleShare} accessibilityLabel="Chia sẻ địa điểm">
                <Ionicons name="share-social" size={24} color={Colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleSave} style={styles.iconBtn} disabled={toggleSave.isPending}>
                <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? Colors.error : Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.badgesRow}>
            <Badge label={place.category} variant="darkGreen" />
            <View style={{ width: 8 }} />
            {place.content_status === 'published' && place.reviewed_at ? (
              <Badge label="Đã được duyệt" variant="lime" icon={<Ionicons name="checkmark-circle" size={14} color={Colors.primary} />} />
            ) : null}
          </View>
          
          <Text style={[Typography.display, styles.title]}>{place.name}</Text>
          
          <View style={styles.ratingRow}>
            <StarRating rating={place.rating_avg} count={place.rating_count} />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Ionicons name="time" size={20} color={Colors.secondary} />
              <Text style={[Typography.caption, styles.infoText]}>~{place.avg_duration_min} phút</Text>
            </View>
            <TouchableOpacity
              style={styles.infoCol}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/(tabs)/map', params: { placeId: place.id } })}
            >
              <Ionicons name="location" size={20} color={Colors.secondary} />
              <Text style={[Typography.caption, styles.infoText]}>Xem trên bản đồ</Text>
            </TouchableOpacity>
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
            <Badge label={isPlaceOpenNow(place) ? 'Đang mở cửa' : 'Đã đóng cửa'} variant={isPlaceOpenNow(place) ? 'lime' : 'mint'} />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
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
                <TouchableOpacity style={styles.sourceRow} onPress={() => Linking.openURL(place.source_url)} accessibilityLabel={`Mở nguồn ${place.source_name}`}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sourceText}>Nguồn: {place.source_name}</Text>
                  <Ionicons name="open-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.reportRow} onPress={handleOpenReport} accessibilityRole="button">
                  <Ionicons name="flag-outline" size={18} color={Colors.error} />
                  <Text style={styles.reportText}>Báo thông tin chưa chính xác</Text>
                </TouchableOpacity>
                
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
                  {place.rating_count > 0 && place.rating_avg !== null ? place.rating_avg.toFixed(1) : '—'}
                </Text>
                <StarRating rating={place.rating_avg} showCount={false} size={24} />
                <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 8 }]}>
                  {place.rating_count > 0 ? `Dựa trên ${place.rating_count} đánh giá trong ứng dụng` : 'Chưa có đánh giá'}
                </Text>
                
                <AppButton
                  title={ownReview ? 'Chỉnh sửa đánh giá của tôi' : 'Viết đánh giá'}
                  variant="secondary"
                  style={{ marginTop: Spacing.xl }}
                  onPress={handleOpenReview}
                />
                {reviewsLoading ? (
                  <ActivityIndicator style={{ marginTop: Spacing.lg }} color={Colors.primary} />
                ) : reviews.length === 0 ? (
                  <Text style={styles.emptyReviews}>Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm.</Text>
                ) : reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View>
                        <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                        <StarRating rating={review.rating} showCount={false} size={16} />
                      </View>
                      <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    <TouchableOpacity
                      style={styles.helpfulButton}
                      onPress={() => handleHelpful(review.id, review.user_id)}
                      disabled={review.user_id === userId || toggleHelpful.isPending}
                      accessibilityRole="button"
                      accessibilityState={{ selected: helpfulReviewIds.has(review.id), disabled: review.user_id === userId }}
                    >
                      <Ionicons name={helpfulReviewIds.has(review.id) ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={review.user_id === userId ? Colors.textMuted : Colors.primary} />
                      <Text style={[styles.helpfulText, review.user_id === userId && { color: Colors.textMuted }]}>Hữu ích ({review.helpful_count})</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'tips' && (
              <View style={styles.tipsContainer}>
                <View style={styles.tipCard}>
                  <Text style={[Typography.h3, { color: Colors.primary, marginBottom: Spacing.xs }]}>💡 Lời khuyên</Text>
                  <Text style={[Typography.body, { color: Colors.secondary }]}>
                    {place.tips || 'Chưa có lưu ý cho địa điểm này.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <AppButton
          title="Thêm vào lịch trình"
          onPress={handleAddToItinerary}
        />
      </View>
      <ReviewComposerModal
        visible={reviewVisible}
        loading={submitReview.isPending}
        initialValue={ownReview}
        onClose={() => setReviewVisible(false)}
        onSubmit={async (value) => {
          if (!userId) return;
          try {
            await submitReview.mutateAsync({ placeId: id, userId, ...value });
            setReviewVisible(false);
          } catch (submitError: any) {
            Alert.alert('Không thể gửi đánh giá', submitError?.message ?? 'Vui lòng thử lại.');
          }
        }}
      />
      <PlaceReportModal
        visible={reportVisible}
        loading={reportPlace.isPending}
        onClose={() => setReportVisible(false)}
        onSubmit={async (value) => {
          if (!userId) return;
          try {
            await reportPlace.mutateAsync({ placeId: id, reporterId: userId, ...value });
            setReportVisible(false);
            Alert.alert('Đã gửi báo cáo', 'Cảm ơn bạn. Quản trị viên sẽ kiểm tra thông tin và nguồn liên quan.');
          } catch (reportError) {
            Alert.alert('Không thể gửi báo cáo', reportError instanceof Error ? reportError.message : 'Vui lòng thử lại.');
          }
        }}
      />
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
  galleryButton: { position: 'absolute', top: '48%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  galleryPrevious: { left: Spacing.md },
  galleryNext: { right: Spacing.md },
  galleryCounter: { position: 'absolute', right: Spacing.md, bottom: 30, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  galleryCounterText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  floatingHeader: {
    position: 'absolute',
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
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md, paddingVertical: Spacing.sm },
  sourceText: { ...Typography.caption, color: Colors.primary, flex: 1 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
  reportText: { ...Typography.caption, color: Colors.error },
  reviewSummary: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.md,
  },
  emptyReviews: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
  reviewCard: { width: '100%', backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 3 },
  reviewDate: { ...Typography.caption, color: Colors.textMuted },
  reviewComment: { ...Typography.body, color: Colors.textPrimary, marginTop: Spacing.sm, textAlign: 'left' },
  helpfulButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, minHeight: 36 },
  helpfulText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
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
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
