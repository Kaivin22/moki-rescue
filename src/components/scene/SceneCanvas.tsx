import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SceneId, Scenes } from '@/src/constants/scenes';

export interface SceneCanvasProps {
  scene: SceneId;
  height?: number | `${number}%`;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Nền gradient tĩnh để giữ độ tương phản cho nội dung hero.
 * Chuyển động trang trí được loại bỏ vì không truyền đạt trạng thái và có thể đè lên nội dung.
 */
export function SceneCanvas({ scene, height = 220, children, style }: SceneCanvasProps) {
  const config = Scenes[scene];
  const colors = useMemo(() => [config.sky[0], config.sky[1], config.sky[2]] as const, [config]);

  return (
    <View style={[styles.container, { height }, style]} accessibilityLabel={`Mô phỏng hành trình ${config.label}`}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function ScenePoster(props: SceneCanvasProps) {
  return <SceneCanvas {...props} />;
}

const styles = StyleSheet.create({
  container: { width: '100%', position: 'relative', overflow: 'hidden' },
  content: { ...StyleSheet.absoluteFillObject },
  glowOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)', top: -70, right: -30 },
  glowTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(211,250,83,0.10)', bottom: -55, left: -25 },
});
