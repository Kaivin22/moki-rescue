import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { useCopy } from '@/src/i18n';

const configuredNumber = String(Constants.expoConfig?.extra?.supportHotline ?? '').trim();
const phone =
  /^\+?[0-9]{6,15}$/.test(configuredNumber) && configuredNumber !== '19000000' ? configuredNumber : '';
const hours = String(Constants.expoConfig?.extra?.supportHours ?? '').trim();

const COPY = {
  vi: {
    entry: 'Gọi hỗ trợ',
    close: 'Quay lại',
    title: 'Liên hệ điều phối',
    connectionTitle: 'Chưa kết nối được',
    connectionBody: 'Nếu điện thoại còn sóng thoại, bạn có thể gọi điều phối dù không có Internet.',
    hotline: 'Số trực điều phối',
    hours: 'Giờ trực (giờ Việt Nam)',
    unknownHours: 'Chưa công bố giờ trực.',
    unconfigured: 'Bản app này chưa có số trực điều phối.',
    call: 'Gọi điều phối',
    callFailed: 'Không mở được ứng dụng Điện thoại. Hãy nhập số trên vào trình gọi điện.',
    prepare:
      'Khi gọi, cho biết tên đường hoặc mốc gần bạn và sự cố của xe. Nếu đã gửi yêu cầu, hãy báo người trực để họ kiểm tra trước khi tìm đội khác.',
    noAnswer: 'Nếu không liên hệ được',
    alternative:
      'Bạn có thể gọi tiệm sửa xe hoặc dịch vụ kéo xe qua số đã lưu. Chỉ chờ tại điểm hẹn khi có người xác nhận sẽ đến.',
  },
  en: {
    entry: 'Call for help',
    close: 'Go back',
    title: 'Contact dispatch',
    connectionTitle: 'Could not connect',
    connectionBody: 'If your phone has voice service, you can call dispatch without internet access.',
    hotline: 'Dispatch hotline',
    hours: 'Hours (Vietnam time)',
    unknownHours: 'Dispatch hours have not been published.',
    unconfigured: 'This app build has no dispatch hotline configured.',
    call: 'Call dispatch',
    callFailed: 'Could not open the Phone app. Open your dialer and enter the number above.',
    prepare:
      'Share your street or a nearby landmark and what happened to the bike. If you already sent a request, tell dispatch so they can check before contacting another team.',
    noAnswer: 'If no one answers',
    alternative:
      'Use a saved number for a repair shop or towing service. Wait at the meeting point once someone confirms they are coming.',
  },
} as const;

type SupportMode = 'general' | 'connection';
const OpenDispatchSupport = createContext<((mode: SupportMode) => void) | null>(null);

export function DispatchSupportProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SupportMode | null>(null);
  const reduceMotion = useReduceMotion();
  const close = () => setMode(null);

  return (
    <OpenDispatchSupport.Provider value={setMode}>
      {children}
      <Modal
        visible={mode !== null}
        presentationStyle="fullScreen"
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={close}
      >
        {mode ? <DispatchSupportView mode={mode} onClose={close} /> : null}
      </Modal>
    </OpenDispatchSupport.Provider>
  );
}

export function DispatchSupportEntry({
  connection = false,
  variant = 'outline',
}: {
  connection?: boolean;
  variant?: 'outline' | 'ghost';
}) {
  const c = useCopy(COPY);
  const openSupport = useContext(OpenDispatchSupport);
  return (
    <AppButton
      title={c.entry}
      variant={variant}
      onPress={() => openSupport?.(connection ? 'connection' : 'general')}
    />
  );
}

function DispatchSupportView({ mode, onClose }: { mode: SupportMode; onClose: () => void }) {
  const c = useCopy(COPY);
  const [callFailed, setCallFailed] = useState(false);
  const call = async () => {
    setCallFailed(false);
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      setCallFailed(true);
    }
  };

  return (
    <SafeAreaView style={styles.screen} accessibilityViewIsModal>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.close}
          onPress={onClose}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {c.title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'connection' && (
          <View style={styles.connection}>
            <Text accessibilityRole="header" style={styles.section}>
              {c.connectionTitle}
            </Text>
            <Text style={styles.body}>{c.connectionBody}</Text>
          </View>
        )}
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.section}>
            {c.hotline}
          </Text>
          {phone ? (
            <>
              <Text selectable style={styles.phone}>
                {phone}
              </Text>
              <Text style={styles.body}>{hours ? `${c.hours}: ${hours}` : c.unknownHours}</Text>
              <AppButton title={c.call} onPress={() => void call()} />
              {callFailed && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {c.callFailed}
                </Text>
              )}
              <Text style={styles.body}>{c.prepare}</Text>
            </>
          ) : (
            <Text style={styles.body}>{c.unconfigured}</Text>
          )}
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.section}>
            {c.noAnswer}
          </Text>
          <Text style={styles.body}>{c.alternative}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
  },
  headerTitle: { ...Typography.h3, flex: 1, color: Colors.textPrimary },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.xl, backgroundColor: Colors.cardBg },
  connection: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.xl, backgroundColor: Colors.sky },
  section: { ...Typography.bodyBold, color: Colors.textPrimary },
  phone: { ...Typography.h2, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  body: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.caption, color: Colors.error },
});
