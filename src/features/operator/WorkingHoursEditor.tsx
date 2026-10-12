import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import {
  minuteLabel,
  parseWorkingTime,
  validWorkingDays,
  WEEKDAYS,
} from '@/src/features/rescue/workingHours';
import { useI18n } from '@/src/i18n';
import type { WorkingDay, WorkingHours } from '@/src/types/rescue';

export function WorkingHoursEditor({ teamId }: { teamId: string }) {
  const english = useI18n((state) => state.language === 'en');
  const query = useQuery({
    queryKey: ['rescue', 'working-hours', teamId],
    queryFn: () => rescueApi.workingHours(teamId),
    refetchOnWindowFocus: false,
  });
  return (
    <View style={styles.container}>
      {query.isPending ? <Text>{english ? 'Loading schedule…' : 'Đang tải lịch…'}</Text> : null}
      {query.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {english ? 'Could not load schedule.' : 'Không tải được lịch nhận ca.'}
        </Text>
      ) : null}
      <AppButton
        variant="outline"
        title={english ? 'Reload saved schedule' : 'Tải lại lịch đã lưu'}
        disabled={query.isFetching}
        onPress={() => void query.refetch()}
      />
      {query.data ? (
        <ScheduleForm key={`${teamId}:${query.data.version}`} teamId={teamId} initial={query.data} />
      ) : null}
    </View>
  );
}

function ScheduleForm({ teamId, initial }: { teamId: string; initial: WorkingHours }) {
  const english = useI18n((state) => state.language === 'en');
  const client = useQueryClient();
  const [paused, setPaused] = useState(initial.paused);
  const [invalid, setInvalid] = useState(false);
  const [draft, setDraft] = useState(() =>
    Array.from({ length: 7 }, (_, index) => {
      const day = initial.days.find((entry) => entry.dayOfWeek === index + 1);
      return {
        enabled: Boolean(day),
        opens: minuteLabel(day?.opensMinute ?? 420),
        closes: minuteLabel(day?.closesMinute ?? 1260),
      };
    }),
  );
  const mutation = useMutation({
    mutationFn: (days: WorkingDay[]) =>
      rescueApi.saveWorkingHours(teamId, { paused, expectedVersion: initial.version, days }),
    onSuccess: (saved) => {
      client.setQueryData(['rescue', 'working-hours', teamId], saved);
      void client.invalidateQueries({ queryKey: rescueKeys.all });
    },
  });
  const update = (index: number, values: Partial<(typeof draft)[number]>) => {
    setInvalid(false);
    setDraft((current) => current.map((day, position) => (position === index ? { ...day, ...values } : day)));
  };
  const save = () => {
    const days = draft.flatMap((day, index) =>
      day.enabled
        ? [
            {
              dayOfWeek: index + 1,
              opensMinute: parseWorkingTime(day.opens) ?? -1,
              closesMinute: parseWorkingTime(day.closes, true) ?? -1,
            },
          ]
        : [],
    );
    if (!validWorkingDays(days)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    mutation.mutate(days);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.note}>
        {english
          ? 'Rescue receiving hours (Vietnam time), not a 24/7 obligation. One interval per start day. An end earlier than the start means next day; 00:00–24:00 means all day.'
          : 'Giờ nhận cứu hộ theo giờ Việt Nam, không bắt buộc làm 24/7. Mỗi ngày bắt đầu có một khung giờ. Giờ kết thúc nhỏ hơn giờ bắt đầu là sang hôm sau; 00:00–24:00 là cả ngày.'}
      </Text>
      <Text style={styles.warning}>
        {english
          ? 'Saving turns off readiness for this shop. Pending offers will be reassigned on the next scan (normally within 15 seconds); accepted cases continue. Providers must turn readiness on again. All-day readiness expires at midnight.'
          : 'Lưu lịch sẽ tắt sẵn sàng của đội. Lời mời chưa nhận được điều phối lại ở lượt quét tiếp theo (bình thường trong 15 giây); ca đã nhận vẫn tiếp tục. Cứu hộ viên phải tự bật lại sẵn sàng. Lịch cả ngày hết phiên sẵn sàng lúc 00:00.'}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>{english ? 'Temporarily pause new cases' : 'Tạm ngừng nhận ca mới'}</Text>
        <Switch
          accessibilityLabel={english ? 'Temporarily pause new cases' : 'Tạm ngừng nhận ca mới'}
          value={paused}
          disabled={mutation.isPending}
          onValueChange={setPaused}
        />
      </View>
      <AppButton
        variant="outline"
        title={english ? 'Set all days: 00:00–24:00' : 'Chọn cả tuần: 00:00–24:00'}
        disabled={mutation.isPending}
        onPress={() => {
          setInvalid(false);
          setDraft(draft.map(() => ({ enabled: true, opens: '00:00', closes: '24:00' })));
        }}
      />
      {draft.map((day, index) => (
        <View key={index} style={styles.day}>
          <View style={styles.row}>
            <Text style={styles.label}>{WEEKDAYS[english ? 'en' : 'vi'][index]}</Text>
            <Switch
              accessibilityLabel={WEEKDAYS[english ? 'en' : 'vi'][index]}
              value={day.enabled}
              disabled={mutation.isPending}
              onValueChange={(enabled) => update(index, { enabled })}
            />
          </View>
          {day.enabled ? (
            <>
              <AppInput
                label={english ? 'Start (HH:mm)' : 'Bắt đầu (HH:mm)'}
                value={day.opens}
                maxLength={5}
                editable={!mutation.isPending}
                onChangeText={(opens) => update(index, { opens })}
              />
              <AppInput
                label={english ? 'End (HH:mm)' : 'Kết thúc (HH:mm)'}
                value={day.closes}
                maxLength={5}
                editable={!mutation.isPending}
                onChangeText={(closes) => update(index, { closes })}
              />
            </>
          ) : (
            <Text style={styles.note}>
              {english
                ? 'No shift starts this day; a previous overnight shift may continue.'
                : 'Không bắt đầu ca ngày này; ca qua đêm từ hôm trước vẫn có thể tiếp tục.'}
            </Text>
          )}
        </View>
      ))}
      {invalid ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {english
            ? 'Use valid HH:mm times, without zero-length or overlapping shifts (including Sunday into Monday).'
            : 'Nhập HH:mm hợp lệ; giờ đầu/cuối không bằng nhau, không chồng lấn kể cả ca Chủ nhật sang thứ hai.'}
        </Text>
      ) : null}
      {mutation.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {mutation.error instanceof ApiClientError
            ? mutation.error.message
            : english
              ? 'Could not save schedule.'
              : 'Không lưu được lịch.'}
        </Text>
      ) : null}
      <AppButton
        title={english ? 'Save receiving hours' : 'Lưu lịch nhận cứu hộ'}
        loading={mutation.isPending}
        onPress={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  day: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  note: { ...Typography.body, color: Colors.textSecondary },
  warning: { ...Typography.body, color: Colors.warning },
  error: { ...Typography.body, color: Colors.error },
});
