import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useVoteStore } from '@/src/stores/voteStore';
import { useItineraryDetails } from '@/src/hooks/useItineraries';

export default function GroupVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { myVotes, counts, castVote } = useVoteStore();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mời bạn tham gia vote lịch trình Đà Nẵng! \n\nLink: https://danang-itinerary.com/share/${id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const { data: itinerary } = useItineraryDetails(id);
  
  // Use real places from itinerary if available, otherwise empty array
  const places = itinerary?.itinerary_days?.flatMap(d => d.itinerary_slots || []).map(slot => ({
    id: slot.place_id!,
    name: slot.place_name,
    image: slot.place_image_url || 'https://images.unsplash.com/photo-1559592413-7cecaed8b5fb?w=400',
    upVotes: Math.floor(Math.random() * 5), // Since vote table isn't fully implemented in this step, we keep a random visual or 0
    downVotes: 0,
  })) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[Typography.h2, styles.headerTitle]}>Phiên Vote Nhóm</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.shareBanner}>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodyBold, { color: Colors.primary }]}>Mã nhóm: #DN{id}</Text>
          <Text style={[Typography.caption, { color: Colors.secondary }]}>Chia sẻ mã này để bạn bè cùng vote</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[Typography.h3, { color: Colors.primary, marginBottom: Spacing.md }]}>
          Danh sách địa điểm đề xuất
        </Text>

        {places.map(place => {
          const myVote = myVotes[place.id];
          const upVotes = counts[place.id]?.up || place.upVotes;
          const downVotes = counts[place.id]?.down || place.downVotes;
          
          return (
            <View key={place.id} style={styles.voteCard}>
              <View style={styles.placeInfo}>
                <Text style={[Typography.bodyBold, { color: Colors.textPrimary }]}>{place.name}</Text>
              </View>
              
              <View style={styles.voteActions}>
                <TouchableOpacity 
                  style={[styles.voteBtn, myVote === 'down' && styles.voteBtnActiveDown]}
                  onPress={() => castVote(id, place.id, 'down')}
                >
                  <Ionicons name="arrow-down" size={20} color={myVote === 'down' ? Colors.white : Colors.error} />
                  <Text style={[Typography.caption, { color: myVote === 'down' ? Colors.white : Colors.error, marginLeft: 4 }]}>
                    {downVotes}
                  </Text>
                </TouchableOpacity>

                <View style={{ width: Spacing.sm }} />

                <TouchableOpacity 
                  style={[styles.voteBtn, myVote === 'up' && styles.voteBtnActiveUp]}
                  onPress={() => castVote(id, place.id, 'up')}
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
        <AppButton title="Chốt lịch trình" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
