import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ItineraryCard } from '@/src/components/molecules/ItineraryCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useMyItineraries } from '@/src/hooks/useItineraries';
import { router } from 'expo-router';

export default function ItineraryHistoryScreen() {
  const { profile } = useAuthStore();
  const { data: itineraries, isLoading, error } = useMyItineraries(profile?.id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !itineraries?.length) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={[Typography.body, { color: Colors.secondary }]}>Bạn chưa tạo lịch trình nào.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={itineraries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={{ marginBottom: Spacing.md }}>
            <ItineraryCard
              title={item.title}
              imageUrl={item.cover_image_url || undefined}
              days={item.num_days}
              authorName={item.profiles?.display_name || 'Bạn'}
              onPress={() => router.push(`/itinerary/${item.id}`)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.md,
  },
});
