import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AiApiError, ChatMessage, sendChatMessage } from '@/src/features/ai/services/gemini';
import { useAuthStore } from '@/src/stores/authStore';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { getChatSession, saveChatSession } from '@/src/features/ai/api/chatHistory';

const SUGGESTIONS = [
  "Gợi ý lịch trình 3 ngày 2 đêm?",
  "Quán ăn ngon ở Hải Châu?",
  "Điểm check-in hot nhất Đà Nẵng?"
];

type LocalMessage = ChatMessage & { isError?: boolean; retryable?: boolean };

const TypingIndicator = () => {
  const reduceMotion = useReduceMotion();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 200, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 200, useNativeDriver: true })
        ]),
        Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [dot1, dot2, dot3, reduceMotion]);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
};

export default function AIChatScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const user = useAuthStore(state => state.user);
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: '1',
      text: 'Chào bạn! Tôi là trợ lý AI chuyên về Đà Nẵng. Tôi có thể giúp gì cho bạn hôm nay?',
      isUser: false,
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(params.sessionId);
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(params.sessionId));
  const flatListRef = useRef<FlatList>(null);
  const lastUserTextRef = useRef<string>('');
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (!params.sessionId || !user) return;
    let active = true;
    setIsLoadingSession(true);
    getChatSession(params.sessionId, user.id)
      .then((session) => {
        if (!active) return;
        setSessionId(session.id);
        setMessages(session.messages as LocalMessage[]);
      })
      .catch(() => {
        if (active) router.replace('/ai/history');
      })
      .finally(() => { if (active) setIsLoadingSession(false); });
    return () => { active = false; };
  }, [params.sessionId, user]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSend = useCallback(async (text: string = inputText, retry = false) => {
    if (!text.trim() || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    lastUserTextRef.current = text.trim();

    const userMsg: LocalMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    const cleanMessages = messages.filter((message) => !message.isError);
    const retryingLastMessage = retry && cleanMessages.at(-1)?.isUser && cleanMessages.at(-1)?.text === userMsg.text;
    const optimisticMessages = retryingLastMessage ? cleanMessages : [...cleanMessages, userMsg];
    const requestHistory = retryingLastMessage ? cleanMessages.slice(0, -1) : cleanMessages;
    setMessages(optimisticMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const reply = await sendChatMessage(requestHistory, userMsg.text);

      const botMsg: LocalMessage = {
        id: (Date.now() + 1).toString(),
        text: reply,
        isUser: false,
        timestamp: Date.now(),
      };
      const persistedMessages = [...optimisticMessages, botMsg];
      setMessages(persistedMessages);
      const savedId = await saveChatSession({
        id: sessionId,
        userId: user!.id,
        title: persistedMessages.find((message) => message.isUser)?.text.slice(0, 120) || 'Cuộc trò chuyện mới',
        messages: persistedMessages,
      });
      setSessionId(savedId);
    } catch (error) {
      const errorMsg: LocalMessage = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : 'Không thể gửi tin nhắn. Vui lòng thử lại.',
        isUser: false,
        timestamp: Date.now(),
        isError: true,
        retryable: !(error instanceof AiApiError) || error.status === 0 || error.status === 408 || error.status >= 500,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      requestInFlightRef.current = false;
    }
  }, [inputText, messages, sessionId, user]);

  const renderMessage = ({ item }: { item: LocalMessage }) => {
    if (item.isUser) {
      return (
        <View style={styles.messageRowUser}>
          <View style={[styles.messageBubble, styles.userBubble]}>
            <Text style={[Typography.body, { color: Colors.white }]}>{item.text}</Text>
          </View>
          <Text style={styles.timestampUser}>{formatTime(item.timestamp)}</Text>
        </View>
      );
    }

    return (
      <View style={styles.messageRowBot}>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={16} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.messageBubble, styles.botBubble, item.isError && styles.errorBubble]}>
            <Text style={[Typography.body, { color: item.isError ? Colors.error : Colors.textPrimary }]}>{item.text}</Text>
          </View>
          <View style={styles.botMetaRow}>
            <Text style={styles.timestampBot}>{formatTime(item.timestamp)}</Text>
            {item.isError && item.retryable && (
              <TouchableOpacity onPress={() => handleSend(lastUserTextRef.current, true)} disabled={isTyping}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.authGate]}>
        <View style={styles.authGateIcon}>
          <Ionicons name="chatbubbles-outline" size={34} color={Colors.primary} />
        </View>
        <Text style={styles.authGateTitle}>Đăng nhập để dùng trợ lý AI</Text>
        <Text style={styles.authGateText}>Cuộc trò chuyện cần tài khoản để áp dụng hạn mức và bảo vệ dịch vụ.</Text>
        <AppButton title="Đăng nhập" onPress={() => router.replace('/(auth)/login')} />
        <AppButton title="Quay lại" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (isLoadingSession) {
    return <SafeAreaView style={[styles.container, styles.authGate]}><TypingIndicator /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[Typography.h3, { color: Colors.white }]}>AI Tư Vấn Du Lịch</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={[Typography.caption, { color: Colors.surface }]}>Trực tuyến</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/ai/history')} accessibilityLabel="Lịch sử trò chuyện">
          <Ionicons name="time-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          accessibilityLabel="Danh sách tin nhắn"
          renderItem={renderMessage}
          ListFooterComponent={() => (
            <View>
              {isTyping && (
                <View style={styles.messageRowBot}>
                  <View style={styles.botAvatar}>
                    <Ionicons name="sparkles" size={16} color={Colors.white} />
                  </View>
                  <View style={[styles.messageBubble, styles.botBubble, { paddingVertical: 14 }]}>
                    <TypingIndicator />
                  </View>
                </View>
              )}
              {messages.length === 1 && !isTyping && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Bạn có thể hỏi:</Text>
                  {SUGGESTIONS.map((sug, idx) => (
                    <TouchableOpacity key={idx} style={styles.suggestionChip} onPress={() => handleSend(sug)} disabled={isTyping}>
                      <Text style={styles.suggestionText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Hỏi tôi bất cứ điều gì..."
            placeholderTextColor={Colors.secondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!isTyping}
            multiline={true}
            maxLength={500}
            accessibilityLabel="Nhập tin nhắn"
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            accessibilityLabel="Gửi tin nhắn"
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  authGate: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  authGateIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  authGateTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center' },
  authGateText: { ...Typography.body, color: Colors.surface, textAlign: 'center', marginBottom: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  historyBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: 4,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  messageRowUser: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  messageRowBot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    maxWidth: '90%',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  timestampUser: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.secondary,
    marginTop: 4,
    marginRight: 4,
  },
  botMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
    gap: Spacing.md,
  },
  timestampBot: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.secondary,
  },
  retryText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  suggestionsContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: 36, // Align with bot bubble
  },
  suggestionsTitle: {
    ...Typography.caption,
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.primary,
  },
  inputArea: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'flex-end', // Align bottom for multiline
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120, // Auto-grow up to this height
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.secondary,
  },
});
