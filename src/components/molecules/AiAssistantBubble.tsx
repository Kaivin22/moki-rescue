import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';

const AI_BUBBLE_OPEN_COUNT_KEY = 'ai-assistant-bubble-open-count-v1';
const EXPANDED_OPEN_LIMIT = 3;
let cachedOpenCount: number | undefined;
let openCountRequest: Promise<number> | null = null;
const openCountListeners = new Set<(count: number) => void>();

interface AiAssistantBubbleProps {
  bottom: number;
  compact?: boolean;
  placeName?: string;
  style?: StyleProp<ViewStyle>;
}

function parseOpenCount(value: string | null): number {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, EXPANDED_OPEN_LIMIT) : 0;
}

function loadOpenCount(): Promise<number> {
  if (cachedOpenCount !== undefined) return Promise.resolve(cachedOpenCount);
  if (openCountRequest) return openCountRequest;
  openCountRequest = AsyncStorage.getItem(AI_BUBBLE_OPEN_COUNT_KEY)
    .then((value) => {
      if (cachedOpenCount === undefined) cachedOpenCount = parseOpenCount(value);
      return cachedOpenCount;
    })
    .catch(() => {
      cachedOpenCount ??= 0;
      return cachedOpenCount;
    })
    .finally(() => { openCountRequest = null; });
  return openCountRequest;
}

function publishOpenCount(count: number) {
  cachedOpenCount = count;
  openCountListeners.forEach((listener) => listener(count));
}

/** Điểm truy cập nhanh tới trợ lý AI; tự ẩn khi bàn phím đang mở. */
export function AiAssistantBubble({ bottom, compact = false, placeName, style }: AiAssistantBubbleProps) {
  const user = useAuthStore((state) => state.user);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showLabel, setShowLabel] = useState(!compact);
  const openCountRef = useRef(0);

  useEffect(() => {
    let active = true;
    const syncLabel = (count: number) => {
      if (!active) return;
      openCountRef.current = count;
      setShowLabel(!compact && count < EXPANDED_OPEN_LIMIT);
    };
    openCountListeners.add(syncLabel);
    loadOpenCount()
      .then(syncLabel)
      .catch(() => {
        if (active) setShowLabel(!compact);
      });
    return () => {
      active = false;
      openCountListeners.delete(syncLabel);
    };
  }, [compact]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  const normalizedPlaceName = placeName?.trim().slice(0, 120);
  const handlePress = () => {
    const nextCount = Math.min((cachedOpenCount ?? openCountRef.current) + 1, EXPANDED_OPEN_LIMIT);
    publishOpenCount(nextCount);
    void AsyncStorage.setItem(AI_BUBBLE_OPEN_COUNT_KEY, String(nextCount)).catch(() => undefined);

    const chatParams = normalizedPlaceName ? { placeName: normalizedPlaceName } : undefined;
    if (!user) {
      const returnTo = normalizedPlaceName
        ? `/ai/chat?placeName=${encodeURIComponent(normalizedPlaceName)}`
        : '/ai/chat';
      router.push({ pathname: '/(auth)/login', params: { returnTo } });
      return;
    }
    router.push({ pathname: '/ai/chat', params: chatParams });
  };

  const accessibilityLabel = normalizedPlaceName
    ? `Hỏi trợ lý AI về ${normalizedPlaceName}`
    : 'Mở trợ lý AI du lịch Đà Nẵng';

  return (
    <TouchableOpacity
      style={[
        styles.bubble,
        !showLabel && styles.bubbleCompact,
        { bottom },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.86}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Mở màn hình trò chuyện với trợ lý AI"
      testID="ai-assistant-bubble"
    >
      <Ionicons name="sparkles" size={22} color={Colors.textOnAccent} />
      {showLabel ? (
        <>
          <Text style={styles.label}>Hỏi AI</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textOnAccent} />
        </>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 40,
    elevation: 9,
    minWidth: 56,
    height: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
  },
  bubbleCompact: {
    width: 56,
    paddingHorizontal: 0,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.textOnAccent,
  },
});
