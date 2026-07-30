import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';

export default function AdminReportsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="warning" size={64} color={Colors.secondary} />
        <Text style={[Typography.h3, { color: Colors.primary, marginTop: 16 }]}>Báo cáo vi phạm</Text>
        <Text style={{ color: Colors.secondary, textAlign: 'center', marginTop: 8 }}>
          Tính năng đang được phát triển...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
