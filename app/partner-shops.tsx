import { useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { MapView, Marker } from '@/src/features/maps/OpenStreetMap';
import type { MapViewHandle } from '@/src/features/maps/types';
import { usePartnerShops } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Cửa hàng hợp tác',
    hint: 'Chạm vào ghim để xem tên và địa chỉ cửa hàng.',
    note: 'Bản đồ giới thiệu mạng lưới đối tác, không thể hiện trạng thái sẵn sàng nhận ca. Khi bạn gửi yêu cầu cứu hộ, hệ thống tự tìm người phù hợp.',
    count: 'cửa hàng trên bản đồ',
    loading: 'Đang tải cửa hàng…',
    error: 'Chưa tải được danh sách cửa hàng. Kiểm tra kết nối và thử lại.',
    empty: 'Chưa có cửa hàng hợp tác đủ thông tin để hiển thị trên bản đồ.',
    retry: 'Tải lại',
    showAll: 'Xem toàn bộ cửa hàng',
  },
  en: {
    title: 'Partner shops',
    hint: 'Tap a pin to see the shop name and address.',
    note: 'This map shows our partner network, not availability to accept jobs. When you request rescue, the system finds a suitable provider.',
    count: 'shops on the map',
    loading: 'Loading shops…',
    error: 'Could not load shops. Check your connection and try again.',
    empty: 'No partner shops have enough information to display yet.',
    retry: 'Reload',
    showAll: 'Show all shops',
  },
} as const;

export default function PartnerShopsScreen() {
  const query = usePartnerShops();
  const c = useCopy(COPY);
  const map = useRef<MapViewHandle>(null);
  const shops = query.data;
  const region = useMemo(() => {
    if (!shops?.length) return undefined;
    const latitudes = shops.map((shop) => shop.latitude);
    const longitudes = shops.map((shop) => shop.longitude);
    const south = Math.min(...latitudes);
    const north = Math.max(...latitudes);
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    return {
      latitude: (south + north) / 2,
      longitude: (west + east) / 2,
      latitudeDelta: Math.max(0.015, (north - south) * 1.3),
      longitudeDelta: Math.max(0.015, (east - west) * 1.3),
    };
  }, [shops]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScreenHeader title={c.title} />
      <View style={styles.intro}>
        <Text style={styles.hint}>{c.hint}</Text>
        <Text style={styles.note}>{c.note}</Text>
      </View>
      {query.isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.note}>{c.loading}</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={styles.note}>
            {c.error}
          </Text>
          <AppButton title={c.retry} onPress={() => void query.refetch()} />
        </View>
      ) : !shops?.length ? (
        <View style={styles.state}>
          <Text style={styles.note}>{c.empty}</Text>
          <AppButton title={c.retry} variant="outline" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <>
          <MapView ref={map} style={styles.map} region={region}>
            {shops.map((shop) => (
              <Marker
                key={shop.id}
                coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                title={shop.name}
                description={shop.address}
              />
            ))}
          </MapView>
          <View style={styles.footer}>
            <Text style={styles.hint}>
              {shops.length} {c.count}
            </Text>
            <AppButton
              title={c.showAll}
              variant="outline"
              onPress={() =>
                map.current?.fitToCoordinates(shops, {
                  edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
                })
              }
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  intro: { padding: Spacing.md, gap: Spacing.xs },
  hint: { ...Typography.bodyBold, color: Colors.textPrimary },
  note: { ...Typography.caption, color: Colors.textSecondary },
  map: { flex: 1 },
  state: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  footer: { padding: Spacing.md, gap: Spacing.sm },
});
