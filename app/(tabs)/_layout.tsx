import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/stores/authStore';
import { hasOperationsRole } from '@/src/features/auth/roles';
import { useHasAppAccess } from '@/src/features/auth/access';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((state) => state.profile?.role ?? 'customer');
  const user = useAuthStore((state) => state.user);
  const hasAccess = useHasAppAccess();
  const { t } = useI18n();
  const isCustomer = role === 'customer';
  const hasOperations = hasOperationsRole(role);

  if (!user || !hasAccess) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: [styles.bar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          href: isCustomer ? undefined : null,
          title: t('nav.request'),
          tabBarIcon: ({ color, size }) => <Ionicons name="shield" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('nav.activity'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          href: hasOperations ? undefined : null,
          title: t('nav.operations'),
          tabBarIcon: ({ color, size }) => <Ionicons name="radio" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.cardBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  label: { ...Typography.nav, marginBottom: Spacing.xs },
  icon: { marginTop: Spacing.xs },
});
