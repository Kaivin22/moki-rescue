import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { useI18n } from '@/src/i18n';
import { Colors } from '@/src/constants/colors';
import { ApiClientError } from '@/src/features/rescue/api/client';

/** Inline confirmation works on both native and web. */
export function ConfirmAction({
  title,
  message,
  onConfirm,
}: {
  title: string;
  message: string;
  onConfirm: () => Promise<unknown>;
}) {
  const en = useI18n((s) => s.language === 'en');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e.message
          : en
            ? 'Could not save. Try again.'
            : 'Chưa thực hiện được. Hãy thử lại.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <AppButton
        title={title}
        variant="ghost"
        disabled={busy}
        onPress={() => {
          setOpen(!open);
          setError('');
        }}
      />
      {open && (
        <>
          <Text style={{ color: Colors.textPrimary }}>{message}</Text>
          <AppButton title={en ? 'Confirm' : 'Xác nhận'} loading={busy} onPress={() => void confirm()} />
          <AppButton
            title={en ? 'Cancel' : 'Hủy'}
            variant="outline"
            disabled={busy}
            onPress={() => setOpen(false)}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: Colors.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}
