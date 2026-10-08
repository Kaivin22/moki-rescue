import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useI18n } from '@/src/i18n';
import type { TeamSummary } from '@/src/types/rescue';

export function ShopLocationEditor({ team }: { team: TeamSummary }) {
  const english = useI18n((state) => state.language === 'en');
  const client = useQueryClient();
  const [latitude, setLatitude] = useState(String(team.baseLatitude ?? ''));
  const [longitude, setLongitude] = useState(String(team.baseLongitude ?? ''));
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: () => rescueApi.setTeamLocation(team.id, Number(latitude), Number(longitude)),
    onSuccess: () => client.invalidateQueries({ queryKey: rescueKeys.all }),
  });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{english ? 'Fixed shop location' : 'Vị trí cố định của cửa hàng'}</Text>
      <Text style={styles.note}>
        {english
          ? 'Dispatch and OSRM ETA use this point. Turn off availability for all members and finish open cases/offers before changing it.'
          : 'Điều phối và ETA của OSRM dùng điểm này. Tắt nhận ca của cả đội và kết thúc ca/đề nghị đang mở trước khi đổi tọa độ.'}
      </Text>
      {!team.shopInServiceArea ? (
        <Text style={styles.error}>
          {english
            ? 'Missing coordinates or outside the service area.'
            : 'Chưa có tọa độ hoặc nằm ngoài vùng phục vụ.'}
        </Text>
      ) : null}
      <AppInput
        label={english ? 'Latitude' : 'Vĩ độ'}
        value={latitude}
        onChangeText={(value) => {
          setLatitude(value);
          mutation.reset();
          setInvalid(false);
        }}
        keyboardType="decimal-pad"
      />
      <AppInput
        label={english ? 'Longitude' : 'Kinh độ'}
        value={longitude}
        onChangeText={(value) => {
          setLongitude(value);
          mutation.reset();
          setInvalid(false);
        }}
        keyboardType="decimal-pad"
      />
      <AppButton
        title={english ? 'Save shop coordinates' : 'Lưu tọa độ cửa hàng'}
        loading={mutation.isPending}
        onPress={() => {
          const valid =
            latitude.trim() !== '' &&
            longitude.trim() !== '' &&
            Number.isFinite(Number(latitude)) &&
            Number.isFinite(Number(longitude)) &&
            Math.abs(Number(latitude)) <= 90 &&
            Math.abs(Number(longitude)) <= 180;
          setInvalid(!valid);
          if (valid) mutation.mutate();
        }}
      />
      {invalid ? (
        <Text style={styles.error}>
          {english
            ? 'Enter both valid coordinates using a decimal point.'
            : 'Nhập đủ hai tọa độ hợp lệ, dùng dấu chấm thập phân.'}
        </Text>
      ) : null}
      {mutation.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {mutation.error instanceof ApiClientError
            ? mutation.error.message
            : english
              ? 'Could not save coordinates.'
              : 'Không lưu được tọa độ.'}
        </Text>
      ) : null}
      {mutation.isSuccess ? (
        <Text style={styles.note}>{english ? 'Shop coordinates saved.' : 'Đã lưu tọa độ cửa hàng.'}</Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.md },
  title: { ...Typography.h3, color: Colors.textPrimary },
  note: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
});
