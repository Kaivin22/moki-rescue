import React, { useCallback } from 'react';
import {
  ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { SceneBackground } from '@/src/components/atoms/SceneBackground';
import { useI18n } from '@/src/i18n';
import { Image } from 'expo-image';
import { AppButton } from '@/src/components/atoms/AppButton';
import type { ComponentProps } from 'react';
import { isProfileVipActive } from '@/src/features/vip/api/subscriptions';
import { useProfileStats } from '@/src/features/profile/api/profileStats';
import { getAppVersionLabel } from '@/src/utils/appInfo';

interface ProfileMenuItem {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: Href;
  highlight?: boolean;
  subtitle?: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, isProfileLoading, error: profileError } = useAuthStore();
  const { t } = useI18n();

  const profileStats = useProfileStats(user?.id);
  const refetchProfileStats = profileStats.refetch;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void refreshProfile();
        void refetchProfileStats();
      }
    }, [refetchProfileStats, refreshProfile, user]),
  );

  const isVip = isProfileVipActive(profile);
  const displayName = profile?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Khách';

  const renderMenuSection = (title: string, items: ProfileMenuItem[]) => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.menuItem, idx === items.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => router.push(item.route)}
          >
            <View style={[styles.iconBox, item.highlight && { backgroundColor: Colors.accent + '20' }]}>
              <Ionicons name={item.icon} size={20} color={item.highlight ? Colors.accent : Colors.primary} />
            </View>
            <View style={styles.menuTextContent}>
              <Text style={[styles.menuTitle, item.highlight && { color: Colors.primary }]}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Animated Header */}
      <SceneBackground scene="beach" height={280}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.avatarCircle}>
            {user && isProfileLoading && !profile ? (
              <ActivityIndicator color={Colors.white} />
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={44} color={Colors.white} />
            )}
          </View>

          <Text style={styles.displayName}>{user && isProfileLoading && !profile ? 'Đang tải hồ sơ…' : displayName}</Text>

          {profile?.bio && (
            <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
          )}

          <View style={styles.badgesRow}>
            {isVip ? (
              <View style={styles.vipBadge}>
                <Ionicons name="star" size={12} color={Colors.primaryDark} />
                <Text style={styles.vipBadgeText}>VIP Member</Text>
              </View>
            ) : user ? (
              <View style={styles.basicBadge}>
                <Text style={styles.basicBadgeText}>Basic Member</Text>
              </View>
            ) : (
              <View style={styles.basicBadge}>
                <Text style={styles.basicBadgeText}>Chế độ khách</Text>
              </View>
            )}
            {profile?.home_city && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color={Colors.surface} />
                <Text style={styles.basicBadgeText}>{profile.home_city}</Text>
              </View>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => user && router.push('/profile/history')} disabled={!user}>
              <Text style={styles.statNumber}>{user && profileStats.isLoading ? '—' : profileStats.isError ? '!' : profileStats.data?.itineraryCount ?? 0}</Text>
              <Text style={styles.statLabel}>Lịch trình</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => user && router.push('/profile/saved')} disabled={!user}>
              <Text style={styles.statNumber}>{user && profileStats.isLoading ? '—' : profileStats.isError ? '!' : profileStats.data?.savedPlaceCount ?? 0}</Text>
              <Text style={styles.statLabel}>Đã lưu</Text>
            </TouchableOpacity>
          </View>
          {user && profileStats.isError && (
            <TouchableOpacity style={styles.statsRetry} onPress={() => profileStats.refetch()}>
              <Ionicons name="refresh" size={12} color={Colors.white} />
              <Text style={styles.statsRetryText}>Không tải được thống kê · Thử lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </SceneBackground>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {user && profileError ? (
          <View style={styles.profileErrorCard}>
            <Ionicons name="cloud-offline-outline" size={22} color={Colors.error} />
            <View style={styles.profileErrorContent}>
              <Text style={styles.profileErrorTitle}>Chưa thể làm mới hồ sơ</Text>
              <Text style={styles.profileErrorText}>Thông tin đăng nhập vẫn được giữ. Hãy kiểm tra kết nối rồi thử lại.</Text>
            </View>
            <TouchableOpacity onPress={() => refreshProfile()} disabled={isProfileLoading} accessibilityRole="button" accessibilityLabel="Thử tải lại hồ sơ">
              {isProfileLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="refresh" size={22} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Đăng nhập để lưu hành trình</Text>
            <Text style={styles.guestText}>Bạn vẫn có thể khám phá, xem bản đồ và tạo bản nháp khi chưa đăng nhập.</Text>
            <AppButton title="Đăng nhập / Đăng ký" onPress={() => router.push('/(auth)/login')} />
          </View>
        ) : renderMenuSection('Tài khoản', [
          { icon: 'person', title: t('profile.edit'), route: '/profile/edit' },
          { icon: 'settings-outline', title: t('profile.settings'), route: '/profile/settings' },
          {
            icon: 'star',
            title: isVip ? 'Quyền lợi VIP' : 'Đăng ký thử nghiệm VIP',
            subtitle: isVip
              ? profile?.vip_expires_at
                ? `Hiệu lực đến ${new Date(profile.vip_expires_at).toLocaleDateString('vi-VN')}`
                : 'Đang hoạt động'
              : 'Không phát sinh thanh toán',
            route: '/vip/upgrade',
            highlight: true,
          },
        ])}

        {user && renderMenuSection('Hoạt động', [
          { icon: 'bookmark', title: t('profile.saved'), route: '/profile/saved' },
          { icon: 'time', title: t('profile.history'), route: '/profile/history' },
          { icon: 'star-outline', title: 'Đánh giá của tôi', route: '/profile/reviews' },
        ])}

        {renderMenuSection('Khám phá & Trợ giúp', [
          { icon: 'chatbubbles', title: 'Lịch sử trò chuyện AI', route: '/ai/history' },
          { icon: 'headset', title: t('profile.support'), route: '/support' },
        ])}

        {(profile?.role === 'admin' || profile?.role === 'editor') && (
          renderMenuSection('Quản trị', [
            { icon: 'settings', title: t('admin.dashboard'), route: profile?.role === 'editor' ? '/admin/places' : '/admin/dashboard' },
          ])
        )}

        {/* Version */}
        <Text style={styles.versionText}>{getAppVersionLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'relative',
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.accent,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%', height: '100%',
  },
  displayName: { ...Typography.h2, color: Colors.white, marginBottom: 4 },
  bioText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.lime,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  vipBadgeText: { ...Typography.caption, color: Colors.textOnAccent, fontWeight: '800', fontSize: 11 },
  basicBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  basicBadgeText: { ...Typography.caption, color: Colors.white, fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    ...Typography.h3,
    color: Colors.white,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.md,
  },
  statsRetry: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs,
  },
  statsRetryText: { ...Typography.caption, color: Colors.white, fontSize: 10 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  menuSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.secondary,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  menuCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.divider,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  menuTextContent: { flex: 1 },
  menuTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  menuSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  versionText: { textAlign: 'center', ...Typography.caption, color: Colors.secondary },
  guestCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  guestTitle: { ...Typography.h3, color: Colors.primary },
  guestText: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  profileErrorCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: Colors.error,
    marginBottom: Spacing.lg,
  },
  profileErrorContent: { flex: 1 },
  profileErrorTitle: { ...Typography.bodyBold, color: Colors.error },
  profileErrorText: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});
