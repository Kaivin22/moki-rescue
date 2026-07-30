import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const { profile, initialize } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [homeCity, setHomeCity] = useState(profile?.home_city || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        home_city: homeCity,
        bio: bio,
      })
      .eq('id', profile.id);

    if (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ');
    } else {
      await initialize();
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
      router.back();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={Colors.white} />
            </View>
            <Text style={[Typography.bodyBold, { color: Colors.primary, marginTop: Spacing.md }]}>Thay đổi ảnh đại diện</Text>
          </View>

          <AppInput
            label="Tên hiển thị"
            placeholder="Nhập tên của bạn"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <AppInput
            label="Đến từ"
            placeholder="Ví dụ: Hà Nội, TP.HCM..."
            value={homeCity}
            onChangeText={setHomeCity}
          />
          <AppInput
            label="Giới thiệu bản thân"
            placeholder="Chia sẻ một chút về bạn..."
            value={bio}
            onChangeText={setBio}
            multiline
          />

          <AppButton 
            title="Lưu thay đổi" 
            onPress={handleSave} 
            loading={loading}
            style={styles.saveBtn} 
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    marginTop: Spacing.xxl,
  },
});
