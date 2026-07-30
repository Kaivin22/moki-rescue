import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { AnimatedBackground } from '@/src/components/atoms/AnimatedBackground';
import { useI18n, LANGUAGES } from '@/src/i18n';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const { t, language, setLanguage } = useI18n();

  const handleSignOut = async () => {
    Alert.alert(t('profile.logout'), 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuItems: { icon: string; title: string; route: string; highlight?: boolean }[] = [
    { icon: 'person', title: t('profile.edit'), route: '/profile/edit' },
    { icon: 'bookmark', title: t('profile.saved'), route: '/profile/saved' },
    { icon: 'time', title: t('profile.history'), route: '/profile/history' },
    { icon: 'star', title: t('profile.vip'), route: '/vip/upgrade', highlight: true },
    { icon: 'chatbubbles', title: t('profile.support'), route: '/support/ticket' },
  ];

  if (profile?.role === 'admin' || profile?.role === 'editor') {
    menuItems.push({ icon: 'settings', title: t('admin.dashboard'), route: '/admin/dashboard' });
  }

  const isVip = profile?.vip_status === 'active' || profile?.vip_status === 'vip';

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <AnimatedBackground scene="beach" height={200}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={44} color={Colors.white} />
          </View>
          <Text style={styles.displayName}>{profile?.display_name || 'Khách'}</Text>
          {isVip ? (
            <View style={styles.vipBadge}>
              <Ionicons name="star" size={12} color={Colors.primary} />
              <Text style={styles.vipBadgeText}>VIP Member</Text>
            </View>
          ) : (
            <View style={styles.basicBadge}>
              <Text style={styles.basicBadgeText}>Basic Member</Text>
            </View>
          )}
          {profile?.home_city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={Colors.surface} />
              <Text style={styles.locationText}>{profile.home_city}</Text>
            </View>
          )}
        </View>
      </AnimatedBackground>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Menu items */}
        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconBox, item.highlight && { backgroundColor: Colors.accent + '20' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.highlight ? Colors.accent : Colors.primary} />
              </View>
              <Text style={[styles.menuTitle, item.highlight && { color: Colors.accent }]}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Language Settings */}
        <View style={styles.sectionHeader}>
          <Ionicons name="language" size={16} color={Colors.secondary} />
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        </View>
        <View style={styles.langGrid}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langChip, language === lang.code && styles.langChipActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, language === lang.code && styles.langNameActive]}>
                {lang.nativeName}
              </Text>
              {language === lang.code && (
                <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Đà Nẵng Travel v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: Spacing.xl, paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.accent,
    marginBottom: Spacing.sm,
  },
  displayName: { ...Typography.h2, color: Colors.white, marginBottom: 6 },
  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.lime,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  vipBadgeText: { ...Typography.caption, color: Colors.textOnLime, fontWeight: '800', fontSize: 11 },
  basicBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  basicBadgeText: { ...Typography.caption, color: Colors.white, fontSize: 11 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { ...Typography.caption, color: Colors.surface },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  menuCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.divider,
    marginBottom: Spacing.xl, overflow: 'hidden',
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
  menuTitle: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  sectionTitle: { ...Typography.label, color: Colors.secondary, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 },

  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.divider,
  },
  langChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '12' },
  langFlag: { fontSize: 18 },
  langName: { ...Typography.caption, color: Colors.textSecondary },
  langNameActive: { color: Colors.primary, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.error,
    backgroundColor: '#FFF0F0',
    marginBottom: Spacing.md,
  },
  logoutText: { ...Typography.bodyBold, color: Colors.error },
  versionText: { textAlign: 'center', ...Typography.caption, color: Colors.secondary },
});
