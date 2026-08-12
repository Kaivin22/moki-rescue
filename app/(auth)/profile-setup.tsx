import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { TagChip } from '@/src/components/atoms/TagChip';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { router } from 'expo-router';
import { TRAVEL_STYLE_OPTIONS } from '@/src/features/itinerary/config/planningOptions';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { removePreviousAvatar, uploadAvatar } from '@/src/features/profile/api/avatarStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROFILE_LIMITS, validateAndNormalizeProfileText } from '@/src/features/profile/profilePolicy';

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [homeCity, setHomeCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? '');

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Hãy cho phép ứng dụng đọc ảnh để chọn ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    const normalized = validateAndNormalizeProfileText({ displayName, homeCity, bio });
    if (!normalized.value) {
      Alert.alert('Thông tin chưa hợp lệ', normalized.error);
      return;
    }

    setLoading(true);
    let uploadedAvatar: string | null = null;
    try {
      uploadedAvatar = avatarUri && !/^https?:\/\//i.test(avatarUri) ? await uploadAvatar(avatarUri, user.id) : avatarUri || null;
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: normalized.value.displayName,
          home_city: normalized.value.homeCity,
          bio: normalized.value.bio,
          travel_style: selectedStyles,
          avatar_url: uploadedAvatar,
        })
        .eq('id', user.id);
      if (error) throw error;
      if (uploadedAvatar && uploadedAvatar !== profile?.avatar_url) {
        await removePreviousAvatar(profile?.avatar_url).catch(() => undefined);
      }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      if (uploadedAvatar && uploadedAvatar !== profile?.avatar_url) await removePreviousAvatar(uploadedAvatar).catch(() => undefined);
      Alert.alert('Không thể lưu hồ sơ', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={[Typography.display, styles.headerTitle]}>Hoàn thiện hồ sơ 👋</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarContainer} onPress={chooseAvatar} accessibilityRole="button" accessibilityLabel="Chọn ảnh đại diện">
            <View style={styles.avatarCircle}>
              {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" /> : <Ionicons name="person" size={40} color={Colors.white} />}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
          
          <AppInput
            label="Tên hiển thị"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={PROFILE_LIMITS.displayName}
          />
          
          <AppInput
            label="Thành phố thường trú"
            placeholder="Ví dụ: Hà Nội"
            value={homeCity}
            onChangeText={setHomeCity}
            maxLength={PROFILE_LIMITS.homeCity}
          />

          <AppInput
            label="Bio ngắn (Tùy chọn)"
            placeholder="Vài dòng về bản thân..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={PROFILE_LIMITS.bio}
            style={styles.bioInput}
          />
          
          <Text style={[Typography.label, styles.sectionLabel]}>Phong cách du lịch</Text>
          <View style={styles.chipGrid}>
            {TRAVEL_STYLE_OPTIONS.map(style => (
              <View key={style.value} style={styles.chipWrapper}>
                <TagChip
                  label={`${style.icon} ${style.label}`}
                  selected={selectedStyles.includes(style.value)}
                  onPress={() => toggleStyle(style.value)}
                />
              </View>
            ))}
          </View>
          
          <AppButton
            title="Bắt đầu khám phá →"
            onPress={handleSave}
            loading={loading}
            style={styles.submitBtn}
          />
          
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
            <Text style={[Typography.body, { color: Colors.secondary }]}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.white,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  bioInput: {
    height: 80,
  },
  sectionLabel: {
    color: Colors.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.xl,
  },
  chipWrapper: {
    padding: Spacing.xs,
  },
  submitBtn: {
    marginBottom: Spacing.md,
  },
  skipBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.xl,
  },
});
