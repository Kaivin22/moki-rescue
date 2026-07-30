import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/services/supabase';

const VIP_PLANS = [
  { id: '1_month', title: '1 Tháng', price: '49,000đ', popular: false },
  { id: '6_month', title: '6 Tháng', price: '249,000đ', popular: true },
  { id: '12_month', title: '1 Năm', price: '399,000đ', popular: false },
];

const VIP_FEATURES = [
  'Tạo lịch trình không giới hạn',
  'Chat với AI Mentor chuyên sâu',
  'Mở khóa các địa điểm Ẩn (Hidden Gems)',
  'Lưu trữ Offline',
  'Không có quảng cáo',
];

export default function VIPUpgradeScreen() {
  const { user, profile } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('6_month');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tiếp tục');
      return;
    }

    setLoading(true);
    // Giả lập thanh toán thành công
    setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ vip_status: 'active' })
        .eq('id', user.id);
        
      setLoading(false);
      
      if (!error) {
        Alert.alert('Thành công', 'Chào mừng bạn đến với VIP Member!', [
          { text: 'Khám phá ngay', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }, 1500);
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
          <Text style={[Typography.display, styles.heroTitle]}>Nâng cấp VIP</Text>
          <Text style={[Typography.body, styles.heroSubtitle]}>
            Mở khóa toàn bộ trải nghiệm du lịch tuyệt vời nhất tại Đà Nẵng
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

        <View style={styles.plansSection}>
          {VIP_PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardActive
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '700' }]}>
                    Phổ biến nhất
                  </Text>
                </View>
              )}
              
              <View style={styles.planInfo}>
                <Text style={[
                  Typography.h3, 
                  selectedPlan === plan.id ? { color: Colors.primary } : { color: Colors.textPrimary }
                ]}>
                  {plan.title}
                </Text>
                <Text style={[
                  Typography.display, 
                  { fontSize: 24 },
                  selectedPlan === plan.id ? { color: Colors.primary } : { color: Colors.textPrimary }
                ]}>
                  {plan.price}
                </Text>
              </View>
              
              <View style={[
                styles.radioBtn,
                selectedPlan === plan.id && styles.radioBtnActive
              ]}>
                {selectedPlan === plan.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Thanh toán ngay"
          onPress={handleUpgrade}
          loading={loading}
        />
        <Text style={[Typography.caption, styles.termsText]}>
          Bằng việc thanh toán, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.
        </Text>
      </View>
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
