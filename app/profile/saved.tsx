import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useSavedPlaces } from '@/src/hooks/useAdmin';
import { router } from 'expo-router';

export default function SavedPlacesScreen() {
  const { profile } = useAuthStore();
  const { data: savedPlaces, isLoading, error } = useSavedPlaces(profile?.id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !savedPlaces?.length) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={[Typography.body, { color: Colors.secondary }]}>Bạn chưa lưu địa điểm nào.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={savedPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PlaceCard
            title={item.name}
            imageUrl={item.image_urls?.[0]}
            rating={item.rating_avg}
            ratingCount={item.rating_count}
            category={item.category}
            onPress={() => router.push(`/place/${item.id}`)}
          />
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
