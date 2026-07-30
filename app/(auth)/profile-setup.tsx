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

const TRAVEL_STYLES = [
  { id: 'beach', label: '🏖 Biển' },
  { id: 'mountain', label: '🏔 Thiên nhiên' },
  { id: 'history', label: '🏛 Lịch sử' },
  { id: 'food', label: '🍜 Ẩm thực' },
  { id: 'entertainment', label: '🎡 Vui chơi' },
  { id: 'photo', label: '📸 Chụp ảnh' },
  { id: 'relax', label: '🧘 Thư giãn' },
  { id: 'adventure', label: '🤿 Phiêu lưu' },
];

export default function ProfileSetupScreen() {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [homeCity, setHomeCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!displayName) {
      Alert.alert('Lỗi', 'Vui lòng nhập Tên hiển thị');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        home_city: homeCity,
        bio: bio,
        travel_style: selectedStyles,
      })
      .eq('id', user.id);
      
    setLoading(false);

    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
          <Text style={[Typography.display, styles.headerTitle]}>Hoàn thiện hồ sơ 👋</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={40} color={Colors.white} />
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={Colors.primary} />
            </View>
          </View>
          
          <AppInput
            label="Tên hiển thị"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={displayName}
            onChangeText={setDisplayName}
          />
          
          <AppInput
            label="Thành phố thường trú"
            placeholder="Ví dụ: Hà Nội"
            value={homeCity}
            onChangeText={setHomeCity}
          />

          <AppInput
            label="Bio ngắn (Tùy chọn)"
            placeholder="Vài dòng về bản thân..."
            value={bio}
            onChangeText={setBio}
            multiline
            style={styles.bioInput}
          />
          
          <Text style={[Typography.label, styles.sectionLabel]}>Phong cách du lịch</Text>
          <View style={styles.chipGrid}>
            {TRAVEL_STYLES.map(style => (
              <View key={style.id} style={styles.chipWrapper}>
                <TagChip
                  label={style.label}
                  selected={selectedStyles.includes(style.id)}
                  onPress={() => toggleStyle(style.id)}
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
    paddingTop: Spacing.xxl,
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
  },
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
