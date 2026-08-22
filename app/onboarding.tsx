import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { markOnboardingCompleted } from '@/src/features/onboarding/onboardingStorage';
import { useCopy, useI18n } from '@/src/i18n';

const WIDTH = Dimensions.get('window').width;
const COPY = {
  vi: {
    skip: 'Bỏ qua',
    start: 'Bắt đầu',
    next: 'Tiếp tục',
    slides: [
      {
        icon: 'construct' as const,
        title: 'Gửi đúng loại sự cố',
        body: 'Mô tả ngắn, vị trí hiện tại và loại xe giúp hệ thống tìm đội có năng lực phù hợp.',
      },
      {
        icon: 'navigate-circle' as const,
        title: 'Ghép theo tuyến đường thật',
        body: 'Đội được xếp theo thời gian di chuyển trên đường dành cho xe máy, không phải khoảng cách đường chim bay.',
      },
      {
        icon: 'shield-checkmark' as const,
        title: 'Ít dữ liệu, nhiều kiểm soát',
        body: 'Không yêu cầu giấy tờ cá nhân. Vị trí chính xác chỉ dùng trong ca hoạt động và khách xác nhận khi đến, khi hoàn tất.',
      },
    ],
  },
  en: {
    skip: 'Skip',
    start: 'Get started',
    next: 'Continue',
    slides: [
      {
        icon: 'construct' as const,
        title: 'Report the right issue',
        body: 'A short description, current location, and motorcycle type help find a team with the right capability.',
      },
      {
        icon: 'navigate-circle' as const,
        title: 'Match by real road travel',
        body: 'Teams are ranked by motorcycle road travel time, never straight-line distance.',
      },
      {
        icon: 'shield-checkmark' as const,
        title: 'Less data, more control',
        body: 'No personal documents are required. Exact location is used only during an active request, with customer confirmation on arrival and completion.',
      },
    ],
  },
} as const;

export default function OnboardingScreen() {
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const c = useCopy(COPY);
  const { language, setLanguage } = useI18n();
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (typeof viewableItems[0]?.index === 'number') setIndex(viewableItems[0].index);
  }).current;

  const finish = async () => {
    await markOnboardingCompleted();
    router.replace('/(auth)/login');
  };

  const next = () => {
    if (index === c.slides.length - 1) void finish();
    else list.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Text style={styles.logo}>MOTORESCUE</Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.language}>{language === 'vi' ? 'EN' : 'VI'}</Text>
          </Pressable>
          <Pressable onPress={() => void finish()} hitSlop={10}>
            <Text style={styles.skip}>{c.skip}</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        ref={list}
        data={c.slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={70} color={Colors.accent} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {c.slides.map((slide, dotIndex) => (
            <View key={slide.title} style={[styles.dot, dotIndex === index && styles.dotActive]} />
          ))}
        </View>
        <AppButton title={index === c.slides.length - 1 ? c.start : c.next} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primaryDark },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.lg },
  logo: { ...Typography.label, color: Colors.accent, letterSpacing: 1.6 },
  skip: { ...Typography.bodyBold, color: Colors.skyBlue },
  language: { ...Typography.bodyBold, color: Colors.accent },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  slide: { width: WIDTH, paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 54,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.borderOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h1, color: Colors.white, textAlign: 'center', marginTop: Spacing.xl },
  body: {
    ...Typography.body,
    color: Colors.skyBlue,
    textAlign: 'center',
    marginTop: Spacing.md,
    maxWidth: 330,
  },
  footer: { padding: Spacing.lg, gap: Spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted },
  dotActive: { width: 28, backgroundColor: Colors.accent },
});
