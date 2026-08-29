import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { MapView, Marker, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useCurrentLocation } from '@/src/features/location/hooks/useCurrentLocation';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useRequest, useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Chọn điểm giao xe',
    loading: 'Đang tải ca cứu hộ…',
    loadError: 'Không thể tải ca cứu hộ này.',
    instruction: 'Chạm bản đồ để đặt điểm giao. Điểm giao phải cách điểm đón ít nhất 50 m.',
    pickup: 'Điểm đón xe',
    destination: 'Điểm giao xe',
    label: 'Tên điểm giao',
    placeholder: 'Cửa hàng sửa xe, trạm sạc hoặc địa chỉ giao xe',
    note: 'Ghi chú cho cứu hộ viên',
    notePlaceholder: 'Lối vào, tên người nhận hoặc dấu hiệu nhận biết',
    required: 'Hãy chọn vị trí và nhập tên điểm giao xe.',
    save: 'Xác nhận điểm giao',
    saveError: 'Không thể lưu điểm giao xe.',
    unavailable: 'Chỉ có thể cập nhật điểm giao khi đội đã đến hoặc đang kiểm tra/báo giá.',
  },
  en: {
    title: 'Choose drop-off',
    loading: 'Loading rescue request…',
    loadError: 'Could not load this rescue request.',
    instruction: 'Tap the map to set the drop-off. It must be at least 50 m from pickup.',
    pickup: 'Motorcycle pickup',
    destination: 'Motorcycle drop-off',
    label: 'Drop-off name',
    placeholder: 'Repair shop, charging station, or delivery address',
    note: 'Note for the rescue provider',
    notePlaceholder: 'Entrance, recipient name, or nearby landmark',
    required: 'Select a location and enter the drop-off name.',
    save: 'Confirm drop-off',
    saveError: 'Could not save the drop-off point.',
    unavailable: 'Drop-off can only be updated after arrival or during inspection/quotation.',
  },
} as const;

export default function RescueDestinationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const requestQuery = useRequest(id);
  const request = requestQuery.data;
  const actions = useRequestMutation(id);
  const destination = useCurrentLocation();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const c = useCopy(COPY);

  const save = async () => {
    if (!request || !destination.coordinate || !destination.label.trim()) {
      setMessage(c.required);
      return;
    }
    setMessage(null);
    try {
      await actions.destination.mutateAsync({
        areaLabel: destination.label.trim(),
        note: note.trim() || undefined,
        latitude: destination.coordinate.latitude,
        longitude: destination.coordinate.longitude,
        expectedRequestVersion: request.version,
      });
      router.back();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.saveError);
    }
  };

  if (requestQuery.isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.muted}>{c.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!request || requestQuery.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title={c.title} />
        <View style={styles.center}>
          <Text style={styles.error}>{c.loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const editable = ['arrived', 'diagnosing', 'awaiting_quote'].includes(request.status);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.title} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.instruction}>{editable ? c.instruction : c.unavailable}</Text>
        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: request.pickupLatitude,
              longitude: request.pickupLongitude,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
            toolbarEnabled={false}
            showsMyLocationButton={false}
            onPress={(event) =>
              void destination.selectCoordinate({
                latitude: event.nativeEvent.coordinate.latitude,
                longitude: event.nativeEvent.coordinate.longitude,
                accuracy: null,
              })
            }
          >
            <Marker
              coordinate={{ latitude: request.pickupLatitude, longitude: request.pickupLongitude }}
              title={c.pickup}
              pinColor={Colors.error}
            />
            {destination.coordinate ? (
              <Marker
                coordinate={destination.coordinate}
                title={c.destination}
                pinColor={Colors.success}
                draggable
                onDragEnd={(event) =>
                  void destination.selectCoordinate({
                    latitude: event.nativeEvent.coordinate.latitude,
                    longitude: event.nativeEvent.coordinate.longitude,
                    accuracy: null,
                  })
                }
              />
            ) : null}
          </MapView>
          <View pointerEvents="none" style={styles.mapHint}>
            <Ionicons name="finger-print-outline" size={18} color={Colors.primary} />
            <Text style={styles.mapHintText}>{c.instruction}</Text>
          </View>
        </View>
        <AppInput
          label={c.label}
          value={destination.label}
          onChangeText={destination.setLabel}
          placeholder={c.placeholder}
          maxLength={160}
          editable={editable}
        />
        <AppInput
          label={c.note}
          value={note}
          onChangeText={setNote}
          placeholder={c.notePlaceholder}
          maxLength={500}
          multiline
          editable={editable}
        />
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        <AppButton
          title={c.save}
          onPress={() => void save()}
          loading={actions.destination.isPending}
          disabled={!editable}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  instruction: { ...Typography.body, color: Colors.textSecondary },
  muted: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
  mapWrap: {
    height: 330,
    overflow: 'hidden',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapHint: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass,
  },
  mapHintText: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
});
