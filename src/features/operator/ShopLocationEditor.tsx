import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { MapView, Marker } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useI18n } from '@/src/i18n';
import type { TeamSummary } from '@/src/types/rescue';
import { useCurrentLocation } from '@/src/features/location/hooks/useCurrentLocation';
import { validCoordinate } from '@/src/features/maps/mapDocument';

export function ShopLocationEditor({ team }: { team: TeamSummary }) {
  const english = useI18n((state) => state.language === 'en');
  const client = useQueryClient();
  const location = useCurrentLocation();
  const [savedAddress, setSavedAddress] = useState(team.baseAddress ?? '');
  const stored = { latitude: team.baseLatitude, longitude: team.baseLongitude };
  const point = location.coordinate ?? (validCoordinate(stored) ? stored : null);
  const address = location.coordinate ? location.label : savedAddress;
  // Viewport only: a new shop still needs an explicit pin/GPS selection before saving.
  const center = point ?? { latitude: 16.0544, longitude: 108.2022 };
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: () => rescueApi.setTeamLocation(team.id, point!.latitude, point!.longitude, address.trim()),
    onSuccess: () => client.invalidateQueries({ queryKey: rescueKeys.all }),
  });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{english ? 'Shop address and map pin' : 'Địa chỉ và vị trí cửa hàng'}</Text>
      <Text style={styles.note}>
        {english
          ? 'When the shop moves, select its new map pin and confirm its address. The address is displayed to people; OSRM uses the pin. Turn all members offline and finish open cases/offers before saving.'
          : 'Khi chuyển cửa hàng, chọn ghim mới và xác nhận địa chỉ. App hiển thị địa chỉ; OSRM dùng tọa độ của ghim. Tắt nhận ca của cả đội và kết thúc ca/đề nghị đang mở trước khi lưu.'}
      </Text>
      {!team.shopInServiceArea ? (
        <Text style={styles.error}>
          {english
            ? 'Missing coordinates or outside the service area.'
            : 'Chưa có tọa độ hoặc nằm ngoài vùng phục vụ.'}
        </Text>
      ) : null}
      <MapView
        style={styles.map}
        region={{ ...center, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        onPress={(event) => {
          mutation.reset();
          setInvalid(false);
          void location.selectCoordinate({ ...event.nativeEvent.coordinate, accuracy: null });
        }}
      >
        {point ? (
          <Marker
            coordinate={point}
            title={team.name}
            draggable
            onDragEnd={(event) => {
              mutation.reset();
              setInvalid(false);
              void location.selectCoordinate({ ...event.nativeEvent.coordinate, accuracy: null });
            }}
          />
        ) : null}
      </MapView>
      <AppButton
        title={english ? 'Use GPS while at the shop' : 'Lấy GPS khi đang ở cửa hàng'}
        variant="outline"
        loading={location.status === 'loading'}
        onPress={() => {
          mutation.reset();
          setInvalid(false);
          void location.requestLocation();
        }}
      />
      {location.status === 'denied' || location.status === 'error' ? (
        <Text style={styles.error}>
          {english
            ? 'GPS is unavailable. Allow location permission or select a pin on the map.'
            : 'Chưa lấy được GPS. Kiểm tra quyền vị trí hoặc chọn ghim trên bản đồ.'}
        </Text>
      ) : null}
      <AppInput
        label={english ? 'Shop address' : 'Địa chỉ cửa hàng'}
        value={address}
        maxLength={300}
        placeholder={english ? 'Street number, street, ward, city' : 'Số nhà, tên đường, phường, thành phố'}
        onChangeText={(value) => {
          if (location.coordinate) location.setLabel(value);
          else setSavedAddress(value);
          mutation.reset();
          setInvalid(false);
        }}
      />
      <Text style={styles.note}>
        {english
          ? 'Check the pin too: editing address text does not move the pin automatically.'
          : 'Kiểm tra cả ghim: sửa chữ địa chỉ không tự di chuyển ghim trên bản đồ.'}
      </Text>
      <AppButton
        title={english ? 'Save shop address and pin' : 'Lưu địa chỉ và vị trí cửa hàng'}
        loading={mutation.isPending}
        onPress={() => {
          const valid = validCoordinate(point) && address.trim().length >= 5 && address.trim().length <= 300;
          setInvalid(!valid);
          if (valid) mutation.mutate();
        }}
      />
      {invalid ? (
        <Text style={styles.error}>
          {english
            ? 'Select a map pin and enter an address of 5–300 characters.'
            : 'Chọn vị trí trên bản đồ và nhập địa chỉ từ 5–300 ký tự.'}
        </Text>
      ) : null}
      {mutation.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {mutation.error instanceof ApiClientError
            ? mutation.error.message
            : english
              ? 'Could not save the shop address.'
              : 'Không lưu được địa chỉ cửa hàng.'}
        </Text>
      ) : null}
      {mutation.isSuccess ? (
        <Text style={styles.note}>
          {english ? 'Shop address and pin saved.' : 'Đã lưu địa chỉ và vị trí cửa hàng.'}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.md },
  map: { height: 240, borderRadius: 12 },
  title: { ...Typography.h3, color: Colors.textPrimary },
  note: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
});
