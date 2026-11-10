import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { apiRequest, ApiClientError } from '@/src/features/rescue/api/client';
import { useI18n } from '@/src/i18n';
import { Colors } from '@/src/constants/colors';
import type { ProviderMember } from '@/src/types/rescue';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';

type Details = { name: string; phone: string; vehicle?: string };
export function ShopDetailsEditor({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const en = useI18n((s) => s.language === 'en');
  const query = useQuery({
    queryKey: ['rescue', 'team-details', teamId],
    queryFn: () => apiRequest<{ name: string; hotline: string }>(`/api/operator/teams/${teamId}/details`),
    enabled: open,
  });
  return (
    <View style={{ gap: 8 }}>
      <AppButton
        title={en ? 'Edit shop details' : 'Sửa tên và số liên hệ cửa hàng'}
        variant="outline"
        onPress={() => setOpen(!open)}
      />
      {open && query.isError && (
        <AppButton title={en ? 'Retry' : 'Thử tải lại'} onPress={() => void query.refetch()} />
      )}
      {open && query.data && (
        <BasicDetailsForm
          initial={{ name: query.data.name, phone: query.data.hotline }}
          path={`/api/operator/teams/${teamId}/details`}
          provider={false}
          close={() => setOpen(false)}
        />
      )}
    </View>
  );
}
export function ProviderDetailsEditor({ teamId, provider }: { teamId: string; provider: ProviderMember }) {
  const [open, setOpen] = useState(false);
  const en = useI18n((s) => s.language === 'en');
  return (
    <View style={{ gap: 8 }}>
      <AppButton
        title={en ? 'Edit provider details' : 'Sửa thông tin cứu hộ viên'}
        variant="outline"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <BasicDetailsForm
          initial={{
            name: provider.displayName,
            phone: provider.contactPhone,
            vehicle: provider.rescueVehicleLabel ?? '',
          }}
          provider
          path={`/api/operator/teams/${teamId}/providers/${provider.userId}/details`}
          close={() => setOpen(false)}
        />
      )}
    </View>
  );
}
function BasicDetailsForm({
  initial,
  path,
  provider,
  close,
}: {
  initial: Details;
  path: string;
  provider: boolean;
  close: () => void;
}) {
  const en = useI18n((s) => s.language === 'en');
  const client = useQueryClient();
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const save = async () => {
    if (busy) return;
    const phone = value.phone.startsWith('+') ? value.phone : normalizeVietnamesePhone(value.phone);
    if (value.name.trim().length < 2 || !phone || !/^\+[1-9][0-9]{7,14}$/.test(phone)) {
      setError(en ? 'Check the name and phone number.' : 'Kiểm tra tên và số điện thoại.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest<void>(path, {
        method: 'PUT',
        body: JSON.stringify(
          provider
            ? {
                displayName: value.name.trim(),
                contactPhone: phone,
                rescueVehicleLabel: value.vehicle?.trim(),
              }
            : { name: value.name.trim(), hotline: phone },
        ),
      });
      await client.invalidateQueries({ queryKey: ['rescue'] });
      close();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : en ? 'Save failed.' : 'Chưa lưu được.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <AppInput
        label={en ? 'Name' : 'Tên'}
        value={value.name}
        maxLength={provider ? 80 : 120}
        editable={!busy}
        onChangeText={(name) => setValue({ ...value, name })}
      />
      <AppInput
        label={en ? 'Contact phone' : 'Số liên hệ'}
        value={value.phone}
        maxLength={16}
        keyboardType="phone-pad"
        editable={!busy}
        onChangeText={(phone) => setValue({ ...value, phone })}
      />
      {provider && (
        <AppInput
          label={en ? 'Rescue vehicle' : 'Phương tiện cứu hộ'}
          value={value.vehicle}
          maxLength={80}
          editable={!busy}
          onChangeText={(vehicle) => setValue({ ...value, vehicle })}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: Colors.error }}>
          {error}
        </Text>
      )}
      <AppButton title={en ? 'Save' : 'Lưu thay đổi'} loading={busy} onPress={() => void save()} />
      <AppButton title={en ? 'Cancel' : 'Hủy'} variant="ghost" disabled={busy} onPress={close} />
    </View>
  );
}
