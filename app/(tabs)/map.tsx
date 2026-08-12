import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { MapView, Marker, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { usePlaces } from '@/src/hooks/usePlaces';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCurrentLocation } from '@/src/features/location/hooks/useCurrentLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Place } from '@/src/types/place';
import { categoryLabel } from '@/src/utils/format';
import { DA_NANG_INITIAL_REGION } from '@/src/features/location/config/danang';
import { AppButton } from '@/src/components/atoms/AppButton';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { data: places, isLoading, isError, refetch, isRefetching } = usePlaces();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [category, setCategory] = useState<string>('all');
  const mapRef = useRef<MapView>(null);
  const { coordinate, requestLocation, status } = useCurrentLocation();
  const categories = useMemo(() => ['all', ...new Set((places ?? []).flatMap(place => place.category ? [place.category] : []))], [places]);
  const visiblePlaces = category === 'all' ? places : places?.filter(place => place.category === category);

  useEffect(() => {
    const target = places?.find(place => place.id === placeId);
    if (target) handleMarkerPress(target);
  }, [placeId, places]);

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      latitude: place.lat,
      longitude: place.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DA_NANG_INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPress={() => setSelectedPlace(null)}
      >
        {visiblePlaces?.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={(e: any) => {
              if (e && e.stopPropagation) e.stopPropagation();
              setSelectedPlace(place);

              // Center map on selected marker
              mapRef.current?.animateToRegion({
                latitude: place.lat,
                longitude: place.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 500);
            }}
          >
            <View style={[
              styles.markerContainer,
              selectedPlace?.id === place.id && styles.selectedMarker
            ]}>
              <Ionicons
                name="location"
                size={selectedPlace?.id === place.id ? 32 : 24}
                color={selectedPlace?.id === place.id ? Colors.primary : Colors.accent}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View pointerEvents="none" style={[styles.statusBarScrim, { height: insets.top }]} />

      {isLoading && (
        <View style={styles.stateOverlay}><ActivityIndicator size="large" color={Colors.primary} /><Text style={styles.stateText}>Đang tải địa điểm…</Text></View>
      )}
      {isError && (
        <View style={styles.stateOverlay}><Ionicons name="cloud-offline-outline" size={40} color={Colors.error} /><Text style={styles.stateText}>Không thể tải địa điểm trên bản đồ.</Text><AppButton title="Thử lại" onPress={() => refetch()} loading={isRefetching} /></View>
      )}
      {!isLoading && !isError && places?.length === 0 && (
        <View style={styles.stateOverlay}><Ionicons name="location-outline" size={40} color={Colors.textMuted} /><Text style={styles.stateText}>Chưa có địa điểm đã xuất bản.</Text></View>
      )}

      <View style={[styles.topOverlay, { top: insets.top + Spacing.sm }]}>
        <View style={styles.chip}>
          <Text style={[Typography.bodyBold, { color: Colors.white }]}>📍 {category === 'all' ? 'Tất cả địa điểm' : categoryLabel(category)}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Lọc địa điểm theo danh mục"
          style={styles.filterBtn}
          onPress={() => {
            const currentIndex = categories.indexOf(category);
            setCategory(categories[(currentIndex + 1) % categories.length] ?? 'all');
            setSelectedPlace(null);
          }}
        >
          <Ionicons name="options" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.myLocationBtn, { bottom: selectedPlace ? 280 : 100 }]}
        onPress={async () => {
          const location = coordinate ?? await requestLocation();
          if (!location) {
            Alert.alert(
              status === 'denied' ? 'Chưa có quyền vị trí' : 'Không lấy được vị trí',
              'Bạn có thể tiếp tục xem bản đồ tổng quan Đà Nẵng hoặc cấp quyền vị trí trong cài đặt.'
            );
            return;
          }
          mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        }}
      >
        <Ionicons name="navigate" size={24} color={Colors.accent} />
      </TouchableOpacity>

      {/* Place Preview Bottom Sheet Equivalent */}
      {selectedPlace && (
        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />
          <PlaceCard
            title={selectedPlace.name}
            imageUrl={selectedPlace.image_urls?.[0]}
            rating={selectedPlace.rating_avg}
            ratingCount={selectedPlace.rating_count}
            category={selectedPlace.category}
            style={styles.placeCard}
            onPress={() => router.push(`/place/${selectedPlace.id}`)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
    transform: [{ scale: 1.2 }],
  },
  topOverlay: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myLocationBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.md,
    paddingBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  placeCard: {
    width: '100%',
    height: 200,
    marginBottom: 0,
  },
  stateOverlay: { position: 'absolute', alignSelf: 'center', top: '38%', maxWidth: 300, alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: Radius.lg, shadowColor: Colors.primaryDark, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  statusBarScrim: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.82)', zIndex: 20, elevation: 20,
  },
  stateText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
