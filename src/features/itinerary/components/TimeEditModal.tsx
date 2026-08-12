import React, { useState } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { PLANNING_RULES } from '@/src/features/itinerary/config/planningRules';

export interface TimeEditValue {
  placeId: string;
  slotIndex: number;
  dayIndex: number;
  startTime: string;
  durationMin: number;
}

interface TimeEditModalProps extends TimeEditValue {
  visible: boolean;
  onSave: (value: TimeEditValue) => string | null;
  onClose: () => void;
}

export function TimeEditModal({ visible, placeId, slotIndex, dayIndex, startTime, durationMin, onSave, onClose }: TimeEditModalProps) {
  const [time, setTime] = useState(startTime || '08:00');
  const [dur, setDur] = useState(String(durationMin || PLANNING_RULES.defaultVisitDurationMin));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset khi mở lại
  React.useEffect(() => {
    if (visible) {
      setTime(startTime || '08:00');
      setDur(String(durationMin || PLANNING_RULES.defaultVisitDurationMin));
      setValidationError(null);
    }
  }, [visible, startTime, durationMin]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Chỉnh sửa thời gian</Text>

          <Text style={styles.label}>Giờ khởi hành (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={Colors.textMuted}
          />
          {validationError && <Text style={styles.error}>{validationError}</Text>}

          <Text style={styles.label}>Thời gian ở lại (phút)</Text>
          <TextInput
            style={styles.input}
            value={dur}
            onChangeText={setDur}
            keyboardType="number-pad"
            placeholder="60"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.actions}>
            <AppButton title="Hủy" variant="outline" onPress={onClose} fullWidth={false} style={{ flex: 1, marginRight: 8 }} />
            <AppButton
              title="Lưu"
              onPress={() => {
                const duration = Number(dur);
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                  setValidationError('Giờ phải theo định dạng HH:mm.');
                  return;
                }
                if (!Number.isInteger(duration) || duration < 5 || duration > 720) {
                  setValidationError('Thời lượng phải là số nguyên từ 5 đến 720 phút.');
                  return;
                }
                const error = onSave({ placeId, dayIndex, slotIndex, startTime: time, durationMin: duration });
                if (error) {
                  setValidationError(error);
                  return;
                }
                onClose();
              }}
              fullWidth={false}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl },
  title: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.lg },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.md,
    ...Typography.body, color: Colors.textPrimary,
  },
  actions: { flexDirection: 'row', marginTop: Spacing.sm },
  error: { ...Typography.caption, color: Colors.error, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
});
