import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

type Step = { id: number; title: string; icon: keyof typeof Ionicons.glyphMap };

export function PlanningProgress({ steps, current, onBackTo }: { steps: Step[]; current: number; onBackTo: (step: number) => void }) {
  const completedTrackWidth = steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 64 : 0;
  return (
    <View style={styles.shell} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: current }}>
      <View style={styles.track} />
      <View style={[styles.trackDone, { width: `${completedTrackWidth}%` }]} />
      {steps.map((step) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <TouchableOpacity
            key={step.id}
            disabled={!done}
            onPress={() => onBackTo(step.id)}
            style={styles.item}
            accessibilityState={{ selected: active, disabled: !done }}
          >
            <View style={[styles.node, done && styles.nodeDone, active && styles.nodeActive]}>
              <Ionicons name={done ? 'checkmark' : step.icon} size={17} color={done || active ? Colors.white : Colors.textMuted} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>{step.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StepTransition({ step, children }: { step: number; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.stopAnimation();
      translateX.stopAnimation();
      opacity.setValue(1);
      translateX.setValue(0);
      return;
    }
    opacity.setValue(0);
    translateX.setValue(18);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [step, opacity, reduceMotion, translateX]);

  return <Animated.View style={{ opacity, transform: [{ translateX }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  shell: { minHeight: 76, backgroundColor: Colors.white, flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  track: { position: 'absolute', top: 25, left: '18%', right: '18%', height: 2, borderRadius: 1, backgroundColor: Colors.divider },
  trackDone: { position: 'absolute', top: 25, left: '18%', maxWidth: '64%', height: 2, borderRadius: 1, backgroundColor: Colors.primary },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  node: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.divider },
  nodeDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  nodeActive: { backgroundColor: Colors.primary, borderColor: Colors.accent, borderWidth: 3 },
  label: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, lineHeight: 12, textAlign: 'center' },
  labelActive: { color: Colors.primary, fontWeight: '800' },
});
