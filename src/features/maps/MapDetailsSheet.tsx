import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Keyboard, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { useCopy } from '@/src/i18n';
import { clampSheetHeight, shouldExpandSheet } from './sheetGestures';

const COPY = {
  vi: {
    expand: 'Mở thông tin',
    collapse: 'Thu gọn để xem bản đồ',
    hint: 'Kéo lên/xuống hoặc chạm để mở/thu gọn.',
  },
  en: {
    expand: 'Show details',
    collapse: 'Collapse to view map',
    hint: 'Drag up/down or tap to expand/collapse.',
  },
};

// The responder owns gesture-local mutable values, not React render state.
function createSheetResponder(
  bodyHeight: Animated.Value,
  maximum: number,
  onExpandedChange: (expanded: boolean) => void,
  reduceMotion: boolean,
) {
  let dragStart = 0;
  let dragHeight = 0;
  const finish = (velocityY: number) => {
    const next = shouldExpandSheet(dragHeight, maximum, velocityY);
    onExpandedChange(next);
    Animated.timing(bodyHeight, {
      toValue: next ? maximum : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: false,
    }).start();
  };
  return PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      Keyboard.dismiss();
      bodyHeight.stopAnimation((height) => {
        dragStart = height;
        dragHeight = height;
      });
    },
    onPanResponderMove: (_, gesture) => {
      dragHeight = clampSheetHeight(dragStart - gesture.dy, maximum);
      bodyHeight.setValue(dragHeight);
    },
    onPanResponderRelease: (_, gesture) => finish(gesture.vy),
    onPanResponderTerminate: () => finish(0),
    onPanResponderTerminationRequest: () => false,
  });
}

/** Only the header owns the drag gesture; form scrolling and map gestures stay independent. */
export function MapDetailsSheet({
  title,
  availableHeight,
  expanded,
  onExpandedChange,
  children,
  footer,
}: {
  title: string;
  availableHeight: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const c = useCopy(COPY);
  const reduceMotion = useReduceMotion();
  const [headerHeight, setHeaderHeight] = useState(80);
  const [footerHeight, setFooterHeight] = useState(80);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [bodyHeight] = useState(() => new Animated.Value(0));
  const maximum = Math.max(
    0,
    (keyboardVisible ? availableHeight : Math.min(availableHeight * 0.68, availableHeight - 100)) -
      headerHeight -
      footerHeight,
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(bodyHeight, {
      toValue: expanded ? maximum : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [bodyHeight, expanded, maximum, reduceMotion]);

  const drag = useMemo(
    () => createSheetResponder(bodyHeight, maximum, onExpandedChange, reduceMotion),
    [bodyHeight, maximum, onExpandedChange, reduceMotion],
  );

  return (
    <View style={styles.sheet}>
      <View {...drag.panHandlers} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <Pressable
          style={styles.header}
          accessibilityRole="button"
          accessibilityLabel={expanded ? c.collapse : c.expand}
          accessibilityHint={c.hint}
          accessibilityState={{ expanded }}
          onPress={() => {
            Keyboard.dismiss();
            onExpandedChange(!expanded);
          }}
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={22} color={Colors.primary} />
          </View>
          <Text style={styles.hint}>{expanded ? c.collapse : c.expand}</Text>
        </Pressable>
      </View>
      <Animated.View
        style={{ height: bodyHeight, overflow: 'hidden' }}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </Animated.View>
      <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: { minHeight: 76, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 4 },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.mist,
    marginBottom: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
  hint: { ...Typography.caption, color: Colors.primary },
});
