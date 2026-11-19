import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapView, Marker, Polyline } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { type RescueMapRegion } from '@/src/features/rescue/services/rescueDetailsPolicy';
import type { LocationPoint, RequestDetails, RoadRoute } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

interface Props {
  request: RequestDetails;
  providerLocation: LocationPoint | null;
  route: RoadRoute | undefined;
  region: RescueMapRegion | undefined;
  insetTop: number;
  embedded?: boolean;
}

export function RescueMapSection({
  request,
  providerLocation,
  route,
  region,
  insetTop,
  embedded = false,
}: Props) {
  const router = useRouter();
  const c = useRescueDetailsCopy();
  return (
    <View
      style={
        embedded
          ? { height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.surface }
          : styles.mapWrap
      }
    >
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        mapPadding={{ top: embedded ? 16 : insetTop + 58, right: 16, bottom: 28, left: 16 }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{ latitude: request.pickupLatitude, longitude: request.pickupLongitude }}
          title={c.pickupMarker}
          pinColor={Colors.error}
        />
        {request.destinationLatitude != null && request.destinationLongitude != null ? (
          <Marker
            coordinate={{
              latitude: request.destinationLatitude,
              longitude: request.destinationLongitude,
            }}
            title={c.destinationMarker}
            description={request.destinationAreaLabel ?? undefined}
            pinColor={Colors.success}
          />
        ) : null}
        {providerLocation ? (
          <Marker
            coordinate={providerLocation}
            title={c.departureMarker}
            description={request.providerTeamName ?? undefined}
            pinColor={Colors.primary}
          />
        ) : null}
        {route?.coordinates?.length ? (
          <Polyline coordinates={route.coordinates} strokeColor={Colors.primary} strokeWidth={5} />
        ) : null}
      </MapView>
      {!embedded && <View pointerEvents="none" style={[styles.statusScrim, { height: insetTop }]} />}
      {!embedded && (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
          style={[styles.back, { top: insetTop + 8 }]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={c.back}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
      )}
      <View style={[styles.mapBadge, { top: embedded ? 8 : insetTop + 10 }]}>
        <View style={[styles.liveDot, { backgroundColor: route ? Colors.success : Colors.warning }]} />
        <Text style={styles.mapBadgeText}>{route ? c.roadRoute : c.noRoute}</Text>
      </View>
    </View>
  );
}
