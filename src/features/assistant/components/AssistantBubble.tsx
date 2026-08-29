import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Shadow, Spacing, Typography } from '@/src/constants/spacing';
import { assistantApi } from '@/src/features/assistant/api/assistantApi';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/stores/authStore';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

const MAX_SESSION_MESSAGES = 20;

export function AssistantBubble({
  hidden = false,
  aboveTabs = false,
}: {
  hidden?: boolean;
  aboveTabs?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const language = useI18n((state) => state.language);
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const nextId = useRef(1);
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const welcome = t('assistant.welcome');
  const initialMessage = useMemo<ChatMessage>(
    () => ({
      id: 0,
      role: 'assistant',
      text: welcome,
    }),
    [welcome],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const suggestions =
    language === 'en'
      ? ['How do I request rescue?', 'How do I track my request?', 'How do quotes work?']
      : ['Tạo yêu cầu cứu hộ thế nào?', 'Theo dõi ca ở đâu?', 'Báo giá hoạt động thế nào?'];

  useEffect(() => {
    nextId.current = 1;
    setMessages([initialMessage]);
    setInput('');
    setRemaining(null);
    setVisible(false);
  }, [initialMessage, userId]);

  useEffect(() => {
    if (messages.length > 1) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: !reduceMotion }));
    }
  }, [messages, reduceMotion]);

  const append = (role: ChatMessage['role'], text: string) => {
    const message = { id: nextId.current++, role, text };
    setMessages((current) => [...current.slice(-(MAX_SESSION_MESSAGES - 1)), message]);
  };

  const send = async (suggestion?: string) => {
    const message = (suggestion ?? input).trim();
    if (!message || sending) return;
    setInput('');
    append('user', message);
    setSending(true);
    try {
      const response = await assistantApi.send(message);
      append('assistant', response.reply);
      if (response.remainingToday !== null) setRemaining(response.remainingToday);
    } catch (error) {
      append('assistant', error instanceof Error ? error.message : t('assistant.error'));
    } finally {
      setSending(false);
    }
  };

  if (!userId || hidden) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('assistant.open')}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.bubble,
          { bottom: insets.bottom + (aboveTabs ? 76 : Spacing.lg) },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={27} color={Colors.textOnAccent} />
      </Pressable>

      <Modal
        transparent
        visible={visible}
        animationType={reduceMotion ? 'none' : 'fade'}
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('assistant.close')}
            style={styles.scrim}
            onPress={() => {
              Keyboard.dismiss();
              setVisible(false);
            }}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{t('assistant.title')}</Text>
                <Text style={styles.scope}>{t('assistant.scope')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('assistant.clear')}
                hitSlop={8}
                onPress={() => {
                  nextId.current = 1;
                  setMessages([initialMessage]);
                  setRemaining(null);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('assistant.close')}
                hitSlop={8}
                onPress={() => setVisible(false)}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.messages}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.message,
                    item.role === 'user' ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  <Text style={[styles.messageText, item.role === 'user' && styles.userMessageText]}>
                    {item.text}
                  </Text>
                </View>
              )}
              ListFooterComponent={
                sending ? (
                  <View style={[styles.message, styles.assistantMessage]}>
                    <Text style={styles.typing}>{t('assistant.typing')}</Text>
                  </View>
                ) : null
              }
            />

            {messages.length === 1 ? (
              <View style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={styles.suggestion}
                    onPress={() => void send(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={suggestion}
                    accessibilityState={{ disabled: sending }}
                    disabled={sending}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {remaining !== null ? (
              <Text style={styles.quota}>{t('assistant.remaining', { count: remaining })}</Text>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={t('assistant.input')}
                value={input}
                onChangeText={setInput}
                editable={!sending}
                maxLength={500}
                multiline
                placeholder={t('assistant.placeholder')}
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={() => void send()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('assistant.send')}
                accessibilityState={{ disabled: !input.trim() || sending, busy: sending }}
                disabled={!input.trim() || sending}
                onPress={() => void send()}
                style={({ pressed }) => [
                  styles.send,
                  (!input.trim() || sending) && styles.sendDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="arrow-up" size={22} color={Colors.textOnAccent} />
              </Pressable>
            </View>
            <Text style={styles.privacy}>{t('assistant.privacy')}</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 30,
    ...Shadow.floating,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.primaryDark,
  },
  pressed: { opacity: 0.78 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    height: '78%',
    maxHeight: 700,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.sky,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { ...Typography.h3, color: Colors.textPrimary },
  scope: { ...Typography.caption, color: Colors.textSecondary },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: Spacing.md, gap: Spacing.sm },
  message: {
    maxWidth: '86%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  messageText: { ...Typography.body, color: Colors.textPrimary },
  userMessageText: { color: Colors.white },
  typing: { ...Typography.body, color: Colors.textMuted },
  suggestions: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  suggestion: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
  },
  suggestionText: { ...Typography.caption, color: Colors.primary },
  quota: {
    ...Typography.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  sendDisabled: { opacity: 0.45 },
  privacy: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
