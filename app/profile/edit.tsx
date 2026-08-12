import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TagChip } from '@/src/components/atoms/TagChip';
import { TRANSPORT_OPTIONS, TRAVEL_STYLE_OPTIONS } from '@/src/features/itinerary/config/planningOptions';
import * as ImagePicker from 'expo-image-picker';
import { removePreviousAvatar, uploadAvatar } from '@/src/features/profile/api/avatarStorage';
import { PROFILE_LIMITS, validateAndNormalizeProfileText } from '@/src/features/profile/profilePolicy';

const TRAVEL_WITH_OPTIONS = [
  { value: 'solo' as const, label: 'Một mình' },
  { value: 'couple' as const, label: 'Cặp đôi' },
  { value: 'family' as const, label: 'Gia đình' },
  { value: 'group' as const, label: 'Nhóm bạn' },
];

export default function EditProfileScreen() {
  const { profile, refreshProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [homeCity, setHomeCity] = useState(profile?.home_city || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [travelStyles, setTravelStyles] = useState<string[]>(profile?.travel_style || []);
  const [transport, setTransport] = useState(profile?.preferred_transport || 'motorbike');
  const [travelWith, setTravelWith] = useState(profile?.travel_with || 'couple');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Hãy cho phép truy cập thư viện ảnh để chọn ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const removeAvatar = () => {
    Alert.alert('Xóa ảnh đại diện', 'Ảnh hiện tại sẽ bị xóa sau khi bạn lưu thay đổi.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa ảnh', style: 'destructive', onPress: () => setAvatarUri('') },
    ]);
  };

  const handleSave = async () => {
    if (!profile) return;
    const normalized = validateAndNormalizeProfileText({ displayName, homeCity, bio });
    if (!normalized.value) {
      Alert.alert('Thông tin chưa hợp lệ', normalized.error);
      return;
    }
    setLoading(true);
    let uploadedAvatar: string | null = null;
    try {
      uploadedAvatar = avatarUri && !/^https?:\/\//i.test(avatarUri) ? await uploadAvatar(avatarUri, profile.id) : avatarUri || null;
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: normalized.value.displayName,
          home_city: normalized.value.homeCity,
          bio: normalized.value.bio,
          travel_style: travelStyles,
          preferred_transport: transport,
          travel_with: travelWith,
          avatar_url: uploadedAvatar,
        })
        .eq('id', profile.id);
      if (error) {
        if (uploadedAvatar && uploadedAvatar !== profile.avatar_url) await removePreviousAvatar(uploadedAvatar).catch(() => undefined);
        throw error;
      }
      if (uploadedAvatar !== (profile.avatar_url ?? null) && profile.avatar_url) {
        await removePreviousAvatar(profile.avatar_url).catch(() => undefined);
      }
      await refreshProfile();
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
      router.back();
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatar} activeOpacity={0.9} onPress={chooseAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Ionicons name="person" size={40} color={Colors.white} />
              )}
            </TouchableOpacity>
            <Text style={[Typography.bodyBold, { color: Colors.secondary, marginTop: Spacing.md }]}>Chạm để thay ảnh đại diện</Text>
            {avatarUri ? (
              <TouchableOpacity style={styles.removeAvatarButton} onPress={removeAvatar} accessibilityRole="button">
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.removeAvatarText}>Xóa ảnh</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <AppInput
            label="Tên hiển thị"
            placeholder="Nhập tên của bạn"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={PROFILE_LIMITS.displayName}
          />

          <Text style={styles.sectionLabel}>Phong cách du lịch</Text>
          <View style={styles.chipGrid}>
            {TRAVEL_STYLE_OPTIONS.map((option) => (
              <TagChip
                key={option.value}
                label={`${option.icon} ${option.label}`}
                selected={travelStyles.includes(option.value)}
                onPress={() => setTravelStyles((current) => current.includes(option.value) ? current.filter((value) => value !== option.value) : [...current, option.value])}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Phương tiện ưu tiên</Text>
          <View style={styles.chipGrid}>
            {TRANSPORT_OPTIONS.map((option) => (
              <TagChip key={option.value} label={`${option.icon} ${option.label}`} selected={transport === option.value} onPress={() => setTransport(option.value)} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Thường đi cùng</Text>
          <View style={styles.chipGrid}>
            {TRAVEL_WITH_OPTIONS.map((option) => (
              <TagChip key={option.value} label={option.label} selected={travelWith === option.value} onPress={() => setTravelWith(option.value)} />
            ))}
          </View>
          <AppInput
            label="Đến từ"
            placeholder="Ví dụ: Hà Nội, TP.HCM..."
            value={homeCity}
            onChangeText={setHomeCity}
            maxLength={PROFILE_LIMITS.homeCity}
          />
          <AppInput
            label="Giới thiệu bản thân"
            placeholder="Chia sẻ một chút về bạn..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={PROFILE_LIMITS.bio}
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  saveBtn: {
    marginTop: Spacing.xxl,
  },
  removeAvatarButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, marginTop: Spacing.xs },
  removeAvatarText: { ...Typography.caption, color: Colors.error, fontWeight: '700' },
  sectionLabel: { ...Typography.label, color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
