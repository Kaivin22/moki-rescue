import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { PlaceReview } from '@/src/features/places/api/reviews';
import { StatusBar } from 'expo-status-bar';

interface Props {
  visible: boolean;
  loading?: boolean;
  initialValue?: Pick<PlaceReview, 'rating' | 'comment' | 'visit_type'> | null;
  onClose: () => void;
  onSubmit: (value: { rating: number; comment: string; visitType: PlaceReview['visit_type'] }) => void;
}

const VISIT_TYPES: { value: NonNullable<PlaceReview['visit_type']>; label: string }[] = [
  { value: 'solo', label: 'Một mình' },
  { value: 'couple', label: 'Cặp đôi' },
  { value: 'family', label: 'Gia đình' },
  { value: 'group', label: 'Nhóm bạn' },
];

export function ReviewComposerModal({ visible, loading, initialValue, onClose, onSubmit }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [visitType, setVisitType] = useState<PlaceReview['visit_type']>(null);

  useEffect(() => {
    if (visible) {
      setRating(initialValue?.rating ?? 5);
      setComment(initialValue?.comment ?? '');
      setVisitType(initialValue?.visit_type ?? null);
    }
  }, [initialValue, visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {visible ? <StatusBar style="dark" translucent backgroundColor="transparent" /> : null}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{initialValue ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}</Text>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Mức độ hài lòng</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} accessibilityLabel={`${value} sao`}>
                <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={36} color={Colors.accentDark} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Bạn đi cùng ai?</Text>
          <View style={styles.chips}>
            {VISIT_TYPES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.chip, visitType === item.value && styles.chipActive]}
                onPress={() => setVisitType(item.value)}
              >
                <Text style={[styles.chipText, visitType === item.value && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Nhận xét</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Chia sẻ trải nghiệm thực tế của bạn..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1000}
            style={styles.input}
          />
          <AppButton title={initialValue ? 'Lưu thay đổi' : 'Gửi đánh giá'} loading={loading} disabled={loading} onPress={() => onSubmit({ rating, comment, visitType })} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  title: { ...Typography.h2, color: Colors.primary },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  keyboardArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  label: { ...Typography.bodyBold, color: Colors.textPrimary },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBg },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white, fontWeight: '700' },
  input: { minHeight: 130, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBg, padding: Spacing.md, color: Colors.textPrimary, textAlignVertical: 'top' },
});
