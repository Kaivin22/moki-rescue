import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Fonts, Radius, Spacing, Typography } from '@/src/constants/spacing';
import { emergencyCallUri, EMERGENCY_CONTACTS } from '@/src/features/safety/emergencyContacts';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    header: 'An toàn bên đường',
    warningTitle: 'Có người bị thương hoặc nguy hiểm tiếp diễn?',
    warningBody: 'Không chờ đội sửa xe. Gọi lực lượng khẩn cấp phù hợp và làm theo hướng dẫn của tổng đài.',
    section: 'Các bước tự bảo vệ',
    note: 'Moki Rescue điều phối hỗ trợ kỹ thuật xe máy. Ứng dụng không thay thế công an, cứu hỏa, cứu nạn hoặc cấp cứu y tế.',
    contacts: { '115': 'Cấp cứu y tế', '114': 'Cháy, nổ và cứu nạn', '113': 'Công an' },
    steps: [
      'Giảm tốc, bật đèn cảnh báo nếu xe có hỗ trợ và quan sát phía sau trước khi dừng.',
      'Đưa người và xe ra khỏi làn lưu thông; không đứng giữa xe hỏng và dòng phương tiện.',
      'Nếu có thể, đặt vật cảnh báo ở khoảng cách đủ để xe khác nhận biết nhưng không tự đi vào vùng nguy hiểm.',
      'Không chạm vào pin xe điện biến dạng, dây điện hở, nhiên liệu rò rỉ hoặc bộ phận đang nóng.',
      'Chỉ tạo yêu cầu Moki Rescue khi không có người bị thương và không còn nguy cơ khẩn cấp tiếp diễn.',
    ],
  },
  en: {
    header: 'Roadside safety',
    warningTitle: 'Is anyone injured or still in danger?',
    warningBody:
      "Do not wait for a repair team. Contact the appropriate emergency service and follow the operator's instructions.",
    section: 'Steps to protect yourself',
    note: 'Moki Rescue coordinates motorcycle technical assistance. It does not replace police, fire and rescue, or medical emergency services.',
    contacts: { '115': 'Medical emergency', '114': 'Fire and rescue', '113': 'Police' },
    steps: [
      'Slow down, turn on hazard lights if supported, and check behind you before stopping.',
      'Move yourself and the motorcycle out of the traffic lane; never stand between the disabled motorcycle and moving traffic.',
      'If safe, place a warning object far enough away to be noticed without entering a dangerous area yourself.',
      'Do not touch a deformed EV battery, exposed wires, leaking fuel, or hot components.',
      'Only create a Moki Rescue request when nobody is injured and no immediate danger remains.',
    ],
  },
} as const;

export default function SafetyGuideScreen() {
  const c = useCopy(COPY);
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warning}>
          <Ionicons name="warning" size={30} color={Colors.error} />
          <View style={styles.flex}>
            <Text style={styles.warningTitle}>{c.warningTitle}</Text>
            <Text style={styles.warningBody}>{c.warningBody}</Text>
          </View>
        </View>

        <View style={styles.contacts}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <Pressable
              key={contact.number}
              style={styles.contact}
              onPress={() => void Linking.openURL(emergencyCallUri(contact.number))}
              accessibilityRole="button"
              accessibilityLabel={`${c.contacts[contact.number]}: ${contact.number}`}
            >
              <Ionicons
                name={contact.icon as keyof typeof Ionicons.glyphMap}
                size={23}
                color={Colors.white}
              />
              <Text style={styles.contactNumber}>{contact.number}</Text>
              <Text style={styles.contactLabel}>{c.contacts[contact.number]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{c.section}</Text>
        <View style={styles.steps}>
          {c.steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.noteText}>{c.note}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  warningTitle: { ...Typography.h3, color: Colors.error },
  warningBody: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  contacts: { flexDirection: 'row', gap: Spacing.sm },
  contact: {
    flex: 1,
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  contactNumber: { ...Typography.h2, color: Colors.error },
  contactLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  section: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  steps: { gap: Spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  numberText: { ...Typography.caption, color: Colors.primaryDark, fontFamily: Fonts.bodySemi },
  stepText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.sky,
  },
  noteText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  flex: { flex: 1 },
});
