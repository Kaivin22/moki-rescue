import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends React.Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Attach a redacting crash reporter here in production. Do not log session,
    // phone number, request payload or precise coordinates from this boundary.
  }

  private reset = () => {
    this.setState({ failed: false });
    router.replace('/');
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const english = useI18n.getState().language === 'en';
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" backgroundColor={Colors.background} />
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>
            {english ? 'Moki Rescue encountered a problem' : 'Moki Rescue gặp sự cố'}
          </Text>
          <Text style={styles.body}>
            {english
              ? 'The app cannot display this screen. Your server-side request data was not deleted.'
              : 'Ứng dụng không thể hiển thị màn hình này. Dữ liệu yêu cầu trên máy chủ không bị xóa.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={english ? 'Go home' : 'Về trang chủ'}
            onPress={this.reset}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{english ? 'Go home' : 'Về trang chủ'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', padding: Spacing.lg, backgroundColor: Colors.background },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.h2, color: Colors.textPrimary },
  body: { ...Typography.body, color: Colors.textSecondary },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
  },
  buttonText: { ...Typography.bodyBold, color: Colors.textOnAccent },
});
