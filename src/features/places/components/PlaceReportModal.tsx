import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { PlaceReportReason } from '@/src/features/places/api/reports';
import { StatusBar } from 'expo-status-bar';

const REASONS: { value: PlaceReportReason; label: string }[] = [
  { value: 'wrong_hours', label: 'Giờ mở cửa không đúng' },
  { value: 'place_closed', label: 'Địa điểm đã đóng cửa' },
  { value: 'wrong_image', label: 'Hình ảnh không đúng' },
  { value: 'wrong_address', label: 'Địa chỉ không đúng' },
  { value: 'other', label: 'Vấn đề khác' },
];

interface Props {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (value: { reason: PlaceReportReason; note: string }) => void;
}

export function PlaceReportModal({ visible, loading, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<PlaceReportReason>('wrong_hours');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setReason('wrong_hours');
      setNote('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {visible ? <StatusBar style="dark" translucent backgroundColor="transparent" /> : null}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Báo thông tin chưa chính xác</Text>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.help}>Báo cáo được chuyển tới quản trị viên để kiểm tra nguồn trước khi cập nhật.</Text>
          {REASONS.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.reason, reason === item.value && styles.reasonActive]}
              onPress={() => setReason(item.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === item.value }}
            >
              <Ionicons name={reason === item.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={Colors.primary} />
              <Text style={styles.reasonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.label}>Thông tin bổ sung</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={2000}
            multiline
            textAlignVertical="top"
            placeholder="Ví dụ: giờ mới trên website chính thức là 08:00–20:00"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.counter}>{note.length}/2000</Text>
          <AppButton title="Gửi báo cáo" loading={loading} disabled={loading} onPress={() => onSubmit({ reason, note })} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  title: { ...Typography.h3, color: Colors.primary, flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  keyboardArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  help: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, backgroundColor: Colors.white },
  reasonActive: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  reasonText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  label: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.md },
  input: { minHeight: 130, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, padding: Spacing.md, backgroundColor: Colors.white, color: Colors.textPrimary },
  counter: { ...Typography.caption, color: Colors.textMuted, textAlign: 'right', marginBottom: Spacing.md },
});
