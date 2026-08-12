import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useVoteStore } from '@/src/stores/voteStore';
import { useItineraryDetails, useRevokeItinerarySharing, useUpdateItineraryVoting } from '@/src/hooks/useItineraries';
import { useAuthStore } from '@/src/stores/authStore';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import type { Place } from '@/src/types/place';

export default function ItineraryVotingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { myVotes, counts, castVote, fetchVotes, loading: votesLoading, error: votesError } = useVoteStore();
  const updateVoting = useUpdateItineraryVoting();
  const prefillDraft = useItineraryStore((state) => state.prefillDraft);
  const revokeSharing = useRevokeItinerarySharing();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mời bạn tham gia bình chọn lịch trình Đà Nẵng!\n\n${Linking.createURL(`/itinerary/share/${itinerary?.share_token ?? id}`)}`,
      });
    } catch {
      Alert.alert('Không thể chia sẻ', 'Vui lòng thử lại sau.');
    }
  };

  const { data: itinerary, isLoading, error, refetch } = useItineraryDetails(id);
  const isOwner = !!user && itinerary?.is_owner === true;
  const isVotingOpen = itinerary?.voting_status !== 'locked';

  const vote = async (placeId: string, type: 'up' | 'down') => {
    if (!itinerary || !isVotingOpen) return;
    try {
      await castVote(id, placeId, type);
    } catch (error: any) {
      Alert.alert('Cần đăng nhập', error?.message ?? 'Không thể ghi nhận bình chọn.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
    }
  };

  useEffect(() => {
    if (id) fetchVotes(id);
  }, [id, fetchVotes]);
  
  const uniquePlaces = new Map<string, { id: string; name: string; upVotes: number; downVotes: number }>();
  itinerary?.itinerary_days?.flatMap(d => d.itinerary_slots || []).forEach(slot => {
    if (!slot.place_id || uniquePlaces.has(slot.place_id)) return;
    uniquePlaces.set(slot.place_id, {
      id: slot.place_id,
      name: slot.place_name,
      upVotes: counts[slot.place_id]?.up || 0,
      downVotes: counts[slot.place_id]?.down || 0,
    });
  });
  const places = [...uniquePlaces.values()];

  const toggleVoting = async () => {
    if (!itinerary || !user) return;
    try {
      await updateVoting.mutateAsync({
        itineraryId: itinerary.id,
        userId: user.id,
        votingStatus: isVotingOpen ? 'locked' : 'open',
      });
    } catch {
      Alert.alert('Không thể cập nhật', 'Vui lòng thử lại sau.');
    }
  };

  const handleClone = () => {
    if (!user) {
      Alert.alert('Cần đăng nhập', 'Đăng nhập để lưu một bản sao vào tài khoản của bạn.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: `/itinerary/share/${id}` } }) },
      ]);
      return;
    }
    if (!itinerary) return;
    const dayPlans: Place[][] = [];
    const selectedPlaces: Place[] = [];
    const unavailable: string[] = [];
    let realSlotCount = 0;
    itinerary.itinerary_days.forEach((day) => {
      const realSlots = (day.itinerary_slots ?? []).filter((slot) => !slot.is_meal);
      realSlotCount += realSlots.length;
      const dayPlaces = realSlots
        .map((slot) => {
          if (!slot.places) {
            unavailable.push(slot.place_name);
            return null;
          }
          return slot.places;
        })
        .filter((place): place is Place => Boolean(place));
      dayPlans.push(dayPlaces);
      dayPlaces.forEach((place) => {
        if (!selectedPlaces.some((selected) => selected.id === place.id)) selectedPlaces.push(place);
      });
    });
    if (unavailable.length > 0) {
      Alert.alert(
        'Chưa thể lưu bản sao',
        `Có ${unavailable.length} địa điểm không còn khả dụng: ${unavailable.slice(0, 3).join(', ')}${unavailable.length > 3 ? '…' : ''}.`,
      );
      return;
    }
    if (realSlotCount !== selectedPlaces.length) {
      Alert.alert('Chưa thể lưu bản sao', 'Lịch được chia sẻ có địa điểm bị lặp và không đạt policy của lịch trình mới.');
      return;
    }
    prefillDraft({
      title: `${itinerary.title} (bản sao)`,
      numDays: itinerary.num_days,
      startDate: '',
      numPeople: itinerary.num_people,
      transport: itinerary.transport,
      travelStyles: itinerary.travel_style ?? [],
      selectedPlaces,
    }, dayPlans);
    router.push('/(tabs)/create');
  };

  const handleRevoke = () => {
    if (!itinerary?.id || !isOwner) return;
    Alert.alert('Thu hồi liên kết?', 'Liên kết này và toàn bộ bình chọn hiện tại sẽ ngừng hoạt động.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Thu hồi', style: 'destructive', onPress: async () => {
        try {
          await revokeSharing.mutateAsync(itinerary.id);
          router.replace(`/itinerary/${itinerary.id}`);
        } catch {
          Alert.alert('Không thể thu hồi', 'Vui lòng thử lại sau.');
        }
      } },
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={styles.state}><ActivityIndicator size="large" color={Colors.primary} /><Text style={styles.stateText}>Đang kiểm tra liên kết…</Text></SafeAreaView>;
  }
  if (error || !itinerary) {
    return (
      <SafeAreaView style={styles.state}>
        <Ionicons name="link-outline" size={56} color={Colors.error} />
        <Text style={styles.stateTitle}>Liên kết không còn hiệu lực</Text>
        <Text style={styles.stateText}>Liên kết có thể đã hết hạn hoặc bị chủ lịch trình thu hồi.</Text>
        <AppButton title="Thử lại" onPress={() => refetch()} style={{ marginTop: Spacing.md }} />
        <AppButton title="Về khám phá" variant="outline" onPress={() => router.replace('/(tabs)')} style={{ marginTop: Spacing.sm }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[Typography.h2, styles.headerTitle]}>Bình chọn lịch trình</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.shareBanner}>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodyBold, { color: Colors.primary }]}>{itinerary?.title ?? 'Lịch trình được chia sẻ'}</Text>
          <Text style={[Typography.caption, { color: Colors.secondary }]}>Chia sẻ liên kết để mọi người cùng bình chọn</Text>
          {itinerary?.share_expires_at && (
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Hết hạn: {new Date(itinerary.share_expires_at).toLocaleString('vi-VN')}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={[Typography.bodyBold, { color: isVotingOpen ? Colors.primary : Colors.error }]}>
            {isVotingOpen ? 'Đang nhận bình chọn' : 'Đã khóa bình chọn'}
          </Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            Bình chọn được tổng hợp ẩn danh để bảo vệ thông tin thành viên.
          </Text>
          {isOwner && (
            <View style={styles.ownerActions}>
              <TouchableOpacity onPress={toggleVoting} disabled={updateVoting.isPending} style={styles.manageBtn}>
                <Text style={[Typography.caption, { color: Colors.primary }]}>{isVotingOpen ? 'Khóa bình chọn' : 'Mở bình chọn'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRevoke} disabled={revokeSharing.isPending} style={styles.manageBtn}>
                <Text style={[Typography.caption, { color: Colors.error }]}>Thu hồi liên kết</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {votesLoading && <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Đang tải bình chọn…</Text>}
        {votesError && (
          <TouchableOpacity onPress={() => id && fetchVotes(id)}>
            <Text style={[Typography.caption, { color: Colors.error }]}>{votesError} Nhấn để thử lại.</Text>
          </TouchableOpacity>
        )}
        <Text style={[Typography.h3, { color: Colors.primary, marginBottom: Spacing.md }]}>
          Danh sách địa điểm đề xuất
        </Text>

        {places.map(place => {
          const myVote = myVotes[place.id];
          const upVotes = place.upVotes;
          const downVotes = place.downVotes;
          
          return (
            <View key={place.id} style={styles.voteCard}>
              <View style={styles.placeInfo}>
                <Text style={[Typography.bodyBold, { color: Colors.textPrimary }]}>{place.name}</Text>
              </View>
              
              <View style={styles.voteActions}>
                <TouchableOpacity 
                  style={[styles.voteBtn, myVote === 'down' && styles.voteBtnActiveDown]}
                  onPress={() => vote(place.id, 'down')}
                  disabled={!isVotingOpen}
                >
                  <Ionicons name="arrow-down" size={20} color={myVote === 'down' ? Colors.white : Colors.error} />
                  <Text style={[Typography.caption, { color: myVote === 'down' ? Colors.white : Colors.error, marginLeft: 4 }]}>
                    {downVotes}
                  </Text>
                </TouchableOpacity>

                <View style={{ width: Spacing.sm }} />

                <TouchableOpacity 
                  style={[styles.voteBtn, myVote === 'up' && styles.voteBtnActiveUp]}
                  onPress={() => vote(place.id, 'up')}
                  disabled={!isVotingOpen}
                >
                  <Ionicons name="arrow-up" size={20} color={myVote === 'up' ? Colors.white : Colors.primary} />
                  <Text style={[Typography.caption, { color: myVote === 'up' ? Colors.white : Colors.primary, marginLeft: 4 }]}>
                    {upVotes}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton title="Lưu bản sao" variant="outline" onPress={handleClone} />
        <AppButton title="Hoàn tất bình chọn" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  stateTitle: { ...Typography.h2, color: Colors.primary, marginTop: Spacing.md, textAlign: 'center' },
  stateText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerTitle: {
    color: Colors.primary,
  },
  shareBanner: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: Colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.md,
  },
  statusCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  manageBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  ownerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  voteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  placeInfo: {
    flex: 1,
  },
  voteActions: {
    flexDirection: 'row',
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  voteBtnActiveUp: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  voteBtnActiveDown: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
