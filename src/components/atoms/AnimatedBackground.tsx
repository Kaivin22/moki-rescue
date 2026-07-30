import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SceneId } from '@/src/constants/scenes';

export function AnimatedBackground({
  height = 200,
  duration,
  children,
  scene = 'beach',
  source,
}: {
  source?: any;
  height?: number;
  duration?: number;
  children?: React.ReactNode;
  scene?: SceneId;
}) {
  const getVideoSource = () => {
    switch (scene) {
      case 'beach': return { uri: 'https://cdn.pixabay.com/video/2020/05/11/38600-417281636_tiny.mp4' };
      case 'mountain': return { uri: 'https://cdn.pixabay.com/video/2021/08/13/84903-588497880_tiny.mp4' };
      case 'city': return { uri: 'https://cdn.pixabay.com/video/2019/11/26/29583-376510103_tiny.mp4' };
      default: return { uri: 'https://cdn.pixabay.com/video/2018/06/15/16832-276180556_tiny.mp4' };
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      {source && (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}
          resizeMode="cover"
        />
      )}
      <Video
        source={getVideoSource()}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
});
