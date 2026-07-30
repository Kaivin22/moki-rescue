import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ChatMessage, sendChatMessage } from '@/src/features/ai/services/gemini';

export default function AIChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Chào bạn! Tôi là trợ lý AI chuyên về Đà Nẵng. Tôi có thể giúp gì cho bạn hôm nay?',
      isUser: false,
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const reply = await sendChatMessage(messages, userMsg.text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

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
        <View style={{ width: 40 }} />
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View style={[
              styles.messageBubble,
              item.isUser ? styles.userBubble : styles.botBubble
            ]}>
              <Text style={[
                Typography.body,
                { color: item.isUser ? Colors.primary : Colors.textPrimary }
              ]}>
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={() => 
            isTyping ? (
              <View style={[styles.messageBubble, styles.botBubble, { width: 60 }]}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />

        <View style={styles.inputArea}>
          <AppInput
            placeholder="Hỏi tôi bất cứ điều gì..."
            value={inputText}
            onChangeText={setInputText}
            style={styles.input}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
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
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  inputArea: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.secondary,
  },
});
