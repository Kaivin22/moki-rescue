import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { Place } from '@/src/types/place';
import { StatusBar } from 'expo-status-bar';
import { DA_NANG_CENTER } from '@/src/features/location/config/danang';

interface MapPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  places: Place[];
  routeCoordinates: { latitude: number; longitude: number }[];
  routeStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
  routeMessage?: string;
}

export function MapPreviewModal({ visible, onClose, places, routeCoordinates, routeStatus, routeMessage }: MapPreviewModalProps) {
  const mapRef = useRef<MapView>(null);
  const placeCoordinates = useMemo(() => places
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .map((place) => ({ latitude: place.lat, longitude: place.lng })), [places]);
  const visibleCoordinates = useMemo(
    () => routeStatus === 'ready' && routeCoordinates.length >= 2 ? routeCoordinates : placeCoordinates,
    [placeCoordinates, routeCoordinates, routeStatus],
  );
  const initialRegion = visibleCoordinates[0]
    ? { ...visibleCoordinates[0], latitudeDelta: 0.1, longitudeDelta: 0.1 }
    : { ...DA_NANG_CENTER, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const fitRoute = useCallback(() => {
    if (visibleCoordinates.length < 2) return;
    mapRef.current?.fitToCoordinates(visibleCoordinates, {
      edgePadding: { top: 72, right: 48, bottom: 120, left: 48 },
      animated: true,
    });
  }, [visibleCoordinates]);

  useEffect(() => {
    if (visible) fitRoute();
  }, [fitRoute, visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {visible ? <StatusBar style="dark" translucent backgroundColor="transparent" /> : null}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Bản đồ xem trước</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Đóng bản đồ"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onMapReady={fitRoute}
        >
          {routeStatus === 'ready' && routeCoordinates.length >= 2 && (
            <Polyline coordinates={routeCoordinates} strokeColor={Colors.primary} strokeWidth={4} />
          )}
          {places.map((p, i) =>
            Number.isFinite(p.lat) && Number.isFinite(p.lng) ? (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                title={p.name}
                description={`Điểm ${i + 1}`}
              />
            ) : null
          )}
        </MapView>
        {routeStatus === 'loading' && (
          <View style={styles.routeNotice} pointerEvents="none">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.routeNoticeText}>Đang tải tuyến đường thực tế…</Text>
          </View>
        )}
        {routeStatus === 'unavailable' && (
          <View style={[styles.routeNotice, styles.routeWarning]} pointerEvents="none">
            <Ionicons name="warning-outline" size={18} color={Colors.error} />
            <Text style={styles.routeWarningText}>{routeMessage || 'Chưa lấy được tuyến đường thực tế. Không hiển thị đường nối ước tính.'}</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  title: { ...Typography.h3, color: Colors.primary },
  closeButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  routeNotice: {
    position: 'absolute', left: Spacing.md, right: Spacing.md, top: 76,
    minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  routeWarning: { alignItems: 'flex-start', borderWidth: 1, borderColor: Colors.error },
  routeNoticeText: { ...Typography.caption, color: Colors.primary },
  routeWarningText: { ...Typography.caption, color: Colors.error, flex: 1 },
});
