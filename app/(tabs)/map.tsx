import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { usePlaces } from '@/src/hooks/usePlaces';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { router } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet'; // You might need to install this later, or use a custom view

const { width, height } = Dimensions.get('window');

const DANANG_REGION = {
  latitude: 16.0544,
  longitude: 108.2022,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'beach': return 'water';
    case 'mountain': return 'image';
    case 'food': return 'restaurant';
    case 'temple': return 'home';
    default: return 'location';
  }
};

export default function MapScreen() {
  const { data: places } = usePlaces();
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  const handleMarkerPress = (place: any) => {
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
        initialRegion={DANANG_REGION}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {places?.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={() => handleMarkerPress(place)}
          >
            <View style={[styles.markerContainer, selectedPlace?.id === place.id && styles.selectedMarker]}>
              <Ionicons 
                name={getCategoryIcon(place.category) as any} 
                size={16} 
                color={selectedPlace?.id === place.id ? Colors.white : Colors.primary} 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.topOverlay}>
        <View style={styles.chip}>
          <Text style={[Typography.bodyBold, { color: Colors.white }]}>📍 Đà Nẵng & Hội An</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.myLocationBtn, { bottom: selectedPlace ? 280 : 100 }]}
        onPress={() => {
          // Add location tracking logic later
          mapRef.current?.animateToRegion(DANANG_REGION);
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
    top: 50,
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
    paddingBottom: 90, // Account for bottom tab bar
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
});
