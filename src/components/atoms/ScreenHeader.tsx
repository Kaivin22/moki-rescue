import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';

export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const language = useI18n((state) => state.language);
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={language === 'en' ? 'Go back' : 'Quay lại'}
        style={styles.back}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 44 },
  title: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
});
