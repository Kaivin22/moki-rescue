import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';
import type { ProviderStatus } from '@/src/types/rescue';
import { rescueApi } from '../api/rescueApi';
import { minuteLabel, WEEKDAYS } from '../workingHours';

export function ProviderWorkingHours({ status }: { status: ProviderStatus }) {
  const english = useI18n((state) => state.language === 'en');
  const schedule = useQuery({
    queryKey: ['rescue', 'provider-working-hours'],
    queryFn: rescueApi.providerWorkingHours,
    refetchInterval: 30_000,
  });
  const message = status.receivingPaused
    ? english
      ? 'Shop temporarily paused.'
      : 'Cửa hàng đang tạm ngừng nhận ca.'
    : !status.hoursConfigured
      ? english
        ? 'No schedule configured. Contact an admin.'
        : 'Chưa khai báo lịch. Liên hệ admin để thiết lập.'
      : !status.receivingUntil
        ? english
          ? 'Outside receiving hours.'
          : 'Đang ngoài giờ nhận cứu hộ.'
        : english
          ? 'Within receiving hours. Turn readiness on only when ready.'
          : 'Đang trong giờ nhận cứu hộ. Chỉ bật sẵn sàng khi có thể đi nhận ca.';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {english ? 'Shop receiving hours · Vietnam time' : 'Lịch nhận cứu hộ · Giờ Việt Nam'}
      </Text>
      <Text style={styles.note}>{message}</Text>
      {status.available && status.availabilityUntil ? (
        <Text style={styles.note}>
          {english ? 'Current readiness expires: ' : 'Phiên sẵn sàng kết thúc: '}
          {new Intl.DateTimeFormat(english ? 'en-GB' : 'vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(status.availabilityUntil))}
        </Text>
      ) : null}
      {schedule.data
        ? WEEKDAYS[english ? 'en' : 'vi'].map((name, index) => {
            const day = schedule.data.days.find((entry) => entry.dayOfWeek === index + 1);
            return (
              <Text key={name} style={styles.note}>
                {name}:{' '}
                {day
                  ? `${minuteLabel(day.opensMinute)}–${minuteLabel(day.closesMinute)}${day.closesMinute < day.opensMinute ? (english ? ' (next day)' : ' (hôm sau)') : ''}`
                  : english
                    ? 'No shift starts'
                    : 'Không bắt đầu ca'}
              </Text>
            );
          })
        : null}
      {schedule.isError ? (
        <AppButton
          variant="outline"
          title={english ? 'Retry loading schedule' : 'Tải lại lịch nhận ca'}
          onPress={() => void schedule.refetch()}
        />
      ) : null}
      <Text style={styles.note}>
        {english
          ? 'Accepted cases continue after closing. A previous overnight shift may extend into a day without a new shift. Readiness never turns itself on; all-day sessions end at midnight.'
          : 'Ca đã nhận vẫn tiếp tục khi hết giờ. Ca qua đêm có thể kéo sang ngày không bắt đầu ca mới. Sẵn sàng không tự bật; phiên cả ngày kết thúc lúc 00:00.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  title: { ...Typography.h3, color: Colors.textPrimary },
  note: { ...Typography.body, color: Colors.textSecondary },
});
