import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmit,
  authColors,
  styles,
} from '@/src/features/auth/AccountScreen';
import { accountError, contactPhone } from '@/src/features/auth/accountAuth';
import { hasCurrentConsent } from '@/src/features/auth/access';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import { useI18n } from '@/src/i18n';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';

export default function CompleteProfileScreen() {
  const user = useAuthStore((s) => s.user),
    profile = useAuthStore((s) => s.profile),
    en = useI18n((s) => s.language) === 'en',
    router = useRouter();
  const [phone, setPhone] = useState(contactPhone(user) ?? ''),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const consent = hasCurrentConsent(profile);
  if (!user) return <Redirect href="/(auth)/login" />;
  async function save() {
    const number = normalizeVietnamesePhone(phone);
    if (!number) {
      setError(en ? 'Enter a valid Vietnamese phone number.' : 'Hãy nhập số điện thoại Việt Nam hợp lệ.');
      return;
    }
    if (!consent && !accepted) {
      setError(en ? 'Accept the terms to continue.' : 'Bạn cần đồng ý điều khoản để tiếp tục.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await supabase.auth.updateUser({ data: { contact_phone: number } });
      if (updated.error) throw updated.error;
      if (!consent) {
        const r = await supabase
          .from('profiles')
          .update({ terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() })
          .eq('id', user!.id)
          .eq('is_active', true)
          .select('id')
          .single();
        if (r.error) throw r.error;
      }
      await useAuthStore.getState().syncUser(updated.data.user);
      if (useAuthStore.getState().error) throw Error('Profile unavailable');
      router.replace('/(tabs)');
    } catch (e) {
      setError(accountError(e, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title={en ? 'Contact phone' : 'Số điện thoại liên hệ'}
      subtitle={
        en
          ? 'Add a phone number before using services so your assigned provider can contact you.'
          : 'Bổ sung số điện thoại trước khi dùng dịch vụ để cứu hộ viên được giao có thể liên hệ.'
      }
      back={false}
    >
      <AuthField
        icon="call"
        placeholder={en ? 'Phone number' : 'Số điện thoại'}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        editable={!busy}
      />
      {!consent && (
        <>
          <Pressable
            style={styles.consent}
            accessibilityRole="checkbox"
            accessibilityLabel={
              en ? 'Accept terms and privacy policy' : 'Đồng ý điều khoản và chính sách quyền riêng tư'
            }
            accessibilityState={{ checked: accepted }}
            disabled={busy}
            onPress={() => setAccepted(!accepted)}
          >
            <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={authColors.green} />
            <Text style={styles.consentText}>
              {en
                ? 'I accept the Terms and Privacy Policy.'
                : 'Tôi đồng ý Điều khoản và Chính sách quyền riêng tư.'}
            </Text>
          </Pressable>
          <View style={styles.legal}>
            <Link href="/legal/terms" style={styles.link}>
              {en ? 'Terms' : 'Điều khoản'}
            </Link>
            <Link href="/legal/privacy" style={styles.link}>
              {en ? 'Privacy' : 'Quyền riêng tư'}
            </Link>
          </View>
        </>
      )}
      <AuthMessage text={error} error />
      <AuthSubmit
        title={en ? 'Save and continue' : 'Lưu và tiếp tục'}
        onPress={() => void save()}
        busy={busy}
      />
      <Pressable
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={en ? 'Sign out' : 'Đăng xuất'}
        onPress={() =>
          void useAuthStore
            .getState()
            .signOut()
            .catch((e) => setError(accountError(e, en)))
        }
        style={styles.google}
      >
        <Text style={styles.link}>{en ? 'Sign out' : 'Đăng xuất'}</Text>
      </Pressable>
    </AuthShell>
  );
}
