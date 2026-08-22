import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';
import type { AdminServiceType } from '@/src/types/rescue';

const SERVICE_ICONS = [
  'construct-outline',
  'battery-dead-outline',
  'flash-outline',
  'water-outline',
  'build-outline',
  'trail-sign-outline',
] as const;

const COPY = {
  vi: {
    title: 'Danh mục dịch vụ',
    hint: 'Chỉ chỉnh nội dung nghiệp vụ. Mã dịch vụ được giữ cố định để không làm hỏng ca và năng lực đội.',
    loadError: 'Không tải được danh mục quản trị.',
    loading: 'Đang tải danh mục quản trị…',
    retry: 'Thử lại',
    empty: 'Chưa có loại dịch vụ nào trong database.',
    labelVi: 'Tên tiếng Việt',
    descriptionVi: 'Mô tả tiếng Việt',
    labelEn: 'Tên tiếng Anh',
    descriptionEn: 'Mô tả tiếng Anh',
    icon: 'Icon ứng dụng',
    order: 'Thứ tự hiển thị',
    quote: 'Cần báo giá sau khi kiểm tra xe',
    active: 'Đang nhận yêu cầu mới',
    inactive: 'Đang tắt',
    save: 'Lưu loại dịch vụ',
    saved: 'Đã lưu danh mục dịch vụ.',
    invalid: 'Kiểm tra lại nhãn, mô tả, icon và thứ tự hiển thị.',
    saveError: 'Không thể lưu loại dịch vụ.',
  },
  en: {
    title: 'Service catalog',
    hint: 'Only edit business content. Service codes stay immutable so existing requests and team capabilities remain valid.',
    loadError: 'Could not load the administration catalog.',
    loading: 'Loading the administration catalog…',
    retry: 'Try again',
    empty: 'There are no service types in the database.',
    labelVi: 'Vietnamese name',
    descriptionVi: 'Vietnamese description',
    labelEn: 'English name',
    descriptionEn: 'English description',
    icon: 'App icon',
    order: 'Display order',
    quote: 'Requires a quote after inspection',
    active: 'Accepting new requests',
    inactive: 'Disabled',
    save: 'Save service type',
    saved: 'Service catalog saved.',
    invalid: 'Check the names, descriptions, icon, and display order.',
    saveError: 'Could not save the service type.',
  },
} as const;

export function ServiceCatalogEditor() {
  const c = useCopy(COPY);
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: rescueKeys.adminServices, queryFn: rescueApi.adminServiceTypes });
  const [draft, setDraft] = useState<AdminServiceType | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!catalog.data?.length) return;
    setDraft((current) => {
      const stillExists = current && catalog.data.some((service) => service.code === current.code);
      return stillExists ? current : { ...catalog.data[0] };
    });
  }, [catalog.data]);

  const update = useMutation({
    mutationFn: rescueApi.updateServiceType,
    onSuccess: async () => {
      setMessage(c.saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rescueKeys.adminServices }),
        queryClient.invalidateQueries({ queryKey: rescueKeys.services }),
      ]);
    },
  });

  const patchDraft = (patch: Partial<AdminServiceType>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const save = async () => {
    if (
      !draft ||
      draft.labelVi.trim().length < 2 ||
      draft.descriptionVi.trim().length < 2 ||
      draft.labelEn.trim().length < 2 ||
      draft.descriptionEn.trim().length < 2 ||
      !SERVICE_ICONS.includes(draft.iconName as (typeof SERVICE_ICONS)[number]) ||
      !Number.isInteger(draft.sortOrder) ||
      draft.sortOrder < 0 ||
      draft.sortOrder > 1000
    ) {
      setMessage(c.invalid);
      return;
    }
    setMessage(null);
    try {
      await update.mutateAsync({
        ...draft,
        labelVi: draft.labelVi.trim(),
        descriptionVi: draft.descriptionVi.trim(),
        labelEn: draft.labelEn.trim(),
        descriptionEn: draft.descriptionEn.trim(),
      });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.saveError);
    }
  };

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.hint}>{c.hint}</Text>
      {catalog.isLoading ? <Text style={styles.hint}>{c.loading}</Text> : null}
      {catalog.isError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.error}>{c.loadError}</Text>
          <AppButton title={c.retry} variant="outline" onPress={() => void catalog.refetch()} />
        </View>
      ) : null}
      {!catalog.isLoading && catalog.data?.length === 0 ? <Text style={styles.hint}>{c.empty}</Text> : null}
      <View style={styles.selector}>
        {(catalog.data ?? []).map((service) => (
          <Pressable
            key={service.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: draft?.code === service.code }}
            onPress={() => {
              setDraft({ ...service });
              setMessage(null);
            }}
            style={[styles.serviceChip, draft?.code === service.code && styles.selectedChip]}
          >
            <Ionicons
              name={service.iconName as keyof typeof Ionicons.glyphMap}
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.serviceChipText}>{service.labelVi}</Text>
            {!service.active ? <Text style={styles.inactive}>{c.inactive}</Text> : null}
          </Pressable>
        ))}
      </View>

      {draft ? (
        <View style={styles.card}>
          <AppInput
            label={c.labelVi}
            value={draft.labelVi}
            onChangeText={(value) => patchDraft({ labelVi: value })}
            maxLength={80}
          />
          <AppInput
            label={c.descriptionVi}
            value={draft.descriptionVi}
            onChangeText={(value) => patchDraft({ descriptionVi: value })}
            maxLength={300}
            multiline
          />
          <AppInput
            label={c.labelEn}
            value={draft.labelEn}
            onChangeText={(value) => patchDraft({ labelEn: value })}
            maxLength={80}
          />
          <AppInput
            label={c.descriptionEn}
            value={draft.descriptionEn}
            onChangeText={(value) => patchDraft({ descriptionEn: value })}
            maxLength={300}
            multiline
          />
          <Text style={styles.label}>{c.icon}</Text>
          <View style={styles.iconRow}>
            {SERVICE_ICONS.map((icon) => (
              <Pressable
                key={icon}
                accessibilityRole="radio"
                accessibilityState={{ checked: draft.iconName === icon }}
                onPress={() => patchDraft({ iconName: icon })}
                style={[styles.iconButton, draft.iconName === icon && styles.selectedIcon]}
              >
                <Ionicons name={icon} size={22} color={Colors.primary} />
              </Pressable>
            ))}
          </View>
          <AppInput
            label={c.order}
            value={String(draft.sortOrder)}
            onChangeText={(value) => patchDraft({ sortOrder: Number(value.replace(/\D/g, '').slice(0, 4)) })}
            keyboardType="number-pad"
            maxLength={4}
          />
          <ToggleRow
            label={c.quote}
            value={draft.requiresQuote}
            onChange={(value) => patchDraft({ requiresQuote: value })}
          />
          <ToggleRow
            label={c.active}
            value={draft.active}
            onChange={(value) => patchDraft({ active: value })}
          />
          <AppButton title={c.save} onPress={() => void save()} loading={update.isPending} />
          {message ? (
            <Text accessibilityRole="alert" style={message === c.saved ? styles.success : styles.error}>
              {message}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.mist, true: Colors.success }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: { gap: Spacing.sm, marginTop: Spacing.sm },
  title: { ...Typography.h3, color: Colors.textPrimary },
  hint: { ...Typography.caption, color: Colors.textMuted },
  selector: { gap: Spacing.sm },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedChip: { borderColor: Colors.primary, backgroundColor: Colors.accentSoft },
  serviceChipText: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
  inactive: { ...Typography.caption, color: Colors.error },
  card: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  label: { ...Typography.label, color: Colors.textSecondary },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedIcon: { borderColor: Colors.primary, backgroundColor: Colors.accentSoft },
  toggleRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  error: { ...Typography.caption, color: Colors.error },
  errorBlock: { gap: Spacing.sm },
  success: { ...Typography.caption, color: Colors.success },
});
