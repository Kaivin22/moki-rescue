import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';

export default function AdminPlacesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="construct" size={64} color={Colors.secondary} />
        <Text style={[Typography.h3, { color: Colors.primary, marginTop: 16 }]}>Quản lý địa điểm</Text>
        <Text style={{ color: Colors.secondary, textAlign: 'center', marginTop: 8 }}>
          Module quản lý địa điểm (Thêm, Sửa, Xóa) đang được xây dựng...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
