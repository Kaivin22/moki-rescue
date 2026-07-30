import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreenWeb() {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={64} color={Colors.primary} />
      <Text style={[Typography.h2, styles.text]}>Bản đồ không khả dụng trên Web</Text>
      <Text style={[Typography.body, styles.subText]}>
        Vui lòng mở ứng dụng trên iOS hoặc Android để xem bản đồ chi tiết của Đà Nẵng.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    color: Colors.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  subText: {
    color: Colors.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
