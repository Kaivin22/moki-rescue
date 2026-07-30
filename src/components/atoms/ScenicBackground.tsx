import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/src/constants/colors';
import { Motion } from '@/src/constants/spacing';
import { SceneId, Scenes, MountainPanorama } from '@/src/constants/scenes';

interface ScenicBackgroundProps {
  scene: SceneId;
  height?: number | `${number}%`;
  duration?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
  usePanorama?: boolean;
  fullBleed?: boolean;
}

function AmbientParticles({ scene }: { scene: SceneId }) {
  const a = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, {
          toValue: 1,
          duration: Motion.ambient,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(a, {
          toValue: 0,
          duration: Motion.ambient,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a, reduceMotion]);

  const floatY = a.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const floatX = a.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });

  if (scene === 'mountain') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.mist, { top: '18%', left: '8%', opacity, transform: [{ translateX: floatX }] }]} />
        <Animated.View style={[styles.mist, styles.mistWide, { top: '30%', right: '4%', opacity, transform: [{ translateX: Animated.multiply(floatX, -1) as any }] }]} />
      </View>
    );
  }

  if (scene === 'beach') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.wave, { bottom: '14%', opacity, transform: [{ translateY: floatY }] }]} />
        <Animated.View style={[styles.waveSoft, { bottom: '8%', opacity, transform: [{ translateY: Animated.multiply(floatY, -0.6) as any }] }]} />
        <View style={styles.sun} />
      </View>
    );
  }

  if (scene === 'hoian') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[18, 42, 68, 84].map((left, i) => (
          <Animated.View
            key={i}
            style={[
              styles.lantern,
              {
                left: `${left}%`,
                top: `${28 + (i % 3) * 8}%`,
                backgroundColor: i % 2 === 0 ? Colors.accent : '#F07A4A',
                opacity,
                transform: [{ translateY: floatY }],
              },
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 10 }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bridgeLight,
            {
              left: `${8 + i * 9}%`,
              top: `${52 + (i % 3) * 5}%`,
              backgroundColor: i % 2 === 0 ? Colors.accentSoft : '#7EC8FF',
              opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function ScenicBackground({
  scene,
  height = 220,
  duration,
  children,
  style,
  overlayOpacity = 0.48,
  usePanorama = false,
  fullBleed = false,
}: ScenicBackgroundProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const config = Scenes[scene];
  const source = scene === 'mountain' && usePanorama ? MountainPanorama : config.source;
  const panDuration = duration ?? config.duration;
  const numericHeight = typeof height === 'number' ? height : 300;
  const estimatedImageWidth = Math.max(screenWidth * 1.9, numericHeight * 2.5);
  const maxTranslation = screenWidth - estimatedImageWidth;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || maxTranslation >= 0) return;
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pan, {
            toValue: maxTranslation,
            duration: panDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(pan, {
            toValue: 0,
            duration: panDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    });
    return () => {
      anim?.stop();
      pan.stopAnimation();
    };
  }, [pan, maxTranslation, panDuration]);

  const alpha = Math.round(overlayOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  return (
    <View
      style={[styles.container, { height: fullBleed ? '100%' : height }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Cảnh ${config.label}`}
    >
      <Animated.Image
        source={source}
        style={[
          styles.image,
          {
            height: typeof height === 'number' ? height : '100%',
            width: estimatedImageWidth,
            transform: [{ translateX: pan }],
          },
        ]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[`${config.tint}66`, `${config.tint}${alpha}`, `${config.tint}DD`]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <AmbientParticles scene={scene} />
      <View style={styles.contentOverlay}>{children}</View>
    </View>
  );
}

export const AnimatedBackground = ScenicBackground;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.primary,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  contentOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mist: {
    position: 'absolute',
    width: 140,
    height: 40,
    borderRadius: 40,
    backgroundColor: Colors.white,
  },
  mistWide: {
    width: 180,
    height: 48,
  },
  wave: {
    position: 'absolute',
    alignSelf: 'center',
    width: '90%',
    height: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  waveSoft: {
    position: 'absolute',
    alignSelf: 'center',
    width: '75%',
    height: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(232,184,74,0.22)',
  },
  sun: {
    position: 'absolute',
    top: '16%',
    right: '14%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,220,140,0.45)',
  },
  lantern: {
    position: 'absolute',
    width: 14,
    height: 18,
    borderRadius: 8,
  },
  bridgeLight: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
