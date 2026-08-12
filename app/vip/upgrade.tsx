import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { createSupportTicket } from '@/src/features/support/api/tickets';
import { isProfileVipActive } from '@/src/features/vip/api/subscriptions';

const VIP_FEATURES = [
  'Xem tuyến đường chi tiết ngay trong lịch trình',
  'Tối ưu thứ tự điểm đến bằng ma trận thời gian đường bộ',
  'AI rà soát lại lịch trình sau khi thuật toán tối ưu',
  'Cảnh báo thời tiết và thời lượng di chuyển theo từng ngày',
];

export default function VIPUpgradeScreen() {
  const { user, profile } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const isVip = isProfileVipActive(profile);

  const handleUpgrade = async () => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tiếp tục');
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket({
      userId: user.id,
      category: 'vip_not_activated',
      title: 'Yêu cầu tham gia chương trình VIP',
      description: 'Người dùng yêu cầu quản trị viên liên hệ và xác nhận điều kiện VIP. Không có giao dịch thanh toán nào được tạo.',
      });
      Alert.alert('Đã gửi yêu cầu', 'Yêu cầu đã được ghi nhận trong hệ thống hỗ trợ. Quản trị viên sẽ phản hồi trên ticket.');
    } catch (error: any) {
      Alert.alert('Không thể gửi yêu cầu', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.heroSection}>
          <Ionicons name="star" size={64} color={Colors.accent} style={styles.heroIcon} />
          <Text style={[Typography.display, styles.heroTitle]}>{isVip ? 'Quyền lợi VIP' : 'Trải nghiệm VIP'}</Text>
          <Text style={[Typography.body, styles.heroSubtitle]}>
            {isVip
              ? 'Tài khoản của bạn đang được sử dụng các tính năng tối ưu nâng cao.'
              : 'Đăng ký chương trình thử nghiệm để mở các tính năng tối ưu nâng cao.'}
          </Text>
        </View>

        <View style={styles.featuresSection}>
          {VIP_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
              <Text style={[Typography.bodyBold, styles.featureText]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.noticeCard, isVip && styles.activeCard]}>
          <Ionicons name={isVip ? 'shield-checkmark' : 'information-circle-outline'} size={22} color={Colors.primary} />
          <Text style={[Typography.body, styles.noticeText]}>
            {isVip
              ? profile?.vip_expires_at
                ? `VIP đang hoạt động đến ${new Date(profile.vip_expires_at).toLocaleDateString('vi-VN')}.`
                : 'VIP đang hoạt động và hiện không có ngày hết hạn.'
              : 'Ứng dụng chưa bán gói hay thu tiền. Nút bên dưới chỉ tạo một ticket yêu cầu tham gia chương trình thử nghiệm.'}
          </Text>
        </View>
      </ScrollView>

      {!isVip && <View style={styles.footer}>
        <AppButton
          title="Đăng ký thử nghiệm VIP"
          onPress={handleUpgrade}
          loading={submitting}
        />
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    padding: Spacing.md,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  heroIcon: {
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    color: Colors.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  featuresSection: {
    marginBottom: Spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureText: {
    marginLeft: Spacing.md,
    color: Colors.textPrimary,
  },
  plansSection: {
    marginBottom: Spacing.xl,
  },
  noticeCard: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, marginBottom: Spacing.xl },
  activeCard: { backgroundColor: Colors.accentSoft },
  noticeText: { color: Colors.secondary, flex: 1 },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  planCardActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(211, 250, 83, 0.1)', // Light accent background
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: Spacing.xl,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  planInfo: {
    flex: 1,
  },
  radioBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioBtnActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  termsText: {
    color: Colors.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
