import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy, useI18n } from '@/src/i18n';
import type { TeamVerificationCheck } from '@/src/types/rescue';

const COPY = {
  vi: {
    title: 'Xác minh đối tác',
    privacy: 'Chỉ ghi kết quả đã đối chiếu. Không tải hợp đồng, CCCD hoặc giấy tờ cá nhân lên ứng dụng.',
    contractReference: 'Mã hồ sơ đối tác nội bộ',
    contractPlaceholder: 'Ví dụ: MR-DN-2026-0001',
    contractHelp: 'Dùng mã nội bộ duy nhất gồm chữ, số, dấu chấm, gạch ngang, gạch chéo hoặc gạch dưới.',
    progress: 'Tiến độ checklist bắt buộc',
    providers: 'Có ít nhất 1 tài khoản cứu hộ viên',
    capabilities: 'Đã khai báo ít nhất 1 năng lực',
    checklist: 'Checklist xác minh ngoại tuyến',
    required: 'Bắt buộc',
    note: 'Ghi chú tối thiểu (không bắt buộc)',
    notePlaceholder: 'Chỉ ghi kết quả hoặc đầu mối đối chiếu, không ghi số giấy tờ.',
    save: 'Lưu kết quả xác minh',
    activate: 'Xác minh và kích hoạt đội',
    saveBeforeActivate: 'Hãy lưu mọi thay đổi trước khi kích hoạt đội.',
    notReady: 'Chưa đủ điều kiện kích hoạt. Hoàn tất checklist, năng lực và tài khoản cứu hộ viên.',
    ready: 'Đã đủ điều kiện để admin kích hoạt đội.',
    verifiedBy: 'Đã xác minh bởi',
    loadError: 'Không tải được checklist xác minh.',
    retry: 'Tải lại checklist',
    actionError: 'Không thể cập nhật xác minh đối tác.',
    invalidReference: 'Mã hồ sơ phải có 4–80 ký tự hợp lệ và không chứa thông tin cá nhân.',
    invalidNote: 'Ghi chú đã nhập phải có ít nhất 5 ký tự.',
  },
  en: {
    title: 'Partner verification',
    privacy:
      'Store only verification results. Never upload contracts, identity cards, or personal documents.',
    contractReference: 'Internal partner file code',
    contractPlaceholder: 'Example: MR-DN-2026-0001',
    contractHelp:
      'Use one unique internal code with letters, numbers, dots, hyphens, slashes, or underscores.',
    progress: 'Required checklist progress',
    providers: 'At least 1 provider account is assigned',
    capabilities: 'At least 1 capability is configured',
    checklist: 'Offline verification checklist',
    required: 'Required',
    note: 'Minimal note (optional)',
    notePlaceholder: 'Record only the result or verification contact, never an identity number.',
    save: 'Save verification results',
    activate: 'Verify and activate team',
    saveBeforeActivate: 'Save all changes before activating the team.',
    notReady:
      'Activation requirements are incomplete. Finish the checklist, capabilities, and provider account.',
    ready: 'This team is ready for admin activation.',
    verifiedBy: 'Verified by',
    loadError: 'Could not load the verification checklist.',
    retry: 'Reload checklist',
    actionError: 'Could not update partner verification.',
    invalidReference: 'The file code must contain 4–80 valid characters and no personal information.',
    invalidNote: 'Any entered note must contain at least 5 characters.',
  },
} as const;

interface Props {
  teamId: string;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function PartnerVerificationEditor({ teamId, onChanged, onError }: Props) {
  const client = useQueryClient();
  const language = useI18n((state) => state.language);
  const c = useCopy(COPY);
  const verification = useQuery({
    queryKey: rescueKeys.teamVerification(teamId),
    queryFn: () => rescueApi.teamVerification(teamId),
    enabled: Boolean(teamId),
  });
  const [contractReference, setContractReference] = useState('');
  const [checks, setChecks] = useState<TeamVerificationCheck[]>([]);
  const [dirty, setDirty] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!verification.data) return;
    setContractReference(verification.data.contractReference);
    setChecks(verification.data.checks);
    setDirty(false);
  }, [verification.data]);

  const refresh = async () => {
    setActionMessage(null);
    await Promise.all([
      client.invalidateQueries({ queryKey: rescueKeys.teamVerification(teamId) }),
      client.invalidateQueries({ queryKey: rescueKeys.teams }),
    ]);
    onChanged();
  };
  const showError = (message: string) => {
    setActionMessage(message);
    onError(message);
  };
  const report = (error: unknown) =>
    showError(error instanceof ApiClientError ? error.message : c.actionError);
  const save = useMutation({
    mutationFn: () =>
      rescueApi.updateTeamVerification(teamId, {
        contractReference: contractReference.trim().toUpperCase(),
        checks: checks.map((check) => ({
          code: check.code,
          completed: check.completed,
          note: check.note?.trim() || undefined,
        })),
      }),
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: () => rescueApi.setTeamStatus(teamId, 'verified'),
    onSuccess: refresh,
  });

  if (verification.isPending) {
    return (
      <View style={styles.card} accessibilityState={{ busy: true }}>
        <Text style={styles.section}>{c.title}</Text>
        <Text style={styles.muted}>{c.progress}…</Text>
      </View>
    );
  }
  if (verification.isError || !verification.data) {
    const message = verification.error instanceof ApiClientError ? verification.error.message : c.loadError;
    return (
      <View style={styles.errorCard}>
        <Text style={styles.error} accessibilityRole="alert">
          {message}
        </Text>
        <AppButton title={c.retry} variant="outline" onPress={() => void verification.refetch()} />
      </View>
    );
  }

  const data = verification.data;
  const locked = data.status === 'verified';
  const completedRequired = checks.filter((check) => check.required && check.completed).length;
  const localReady =
    completedRequired === data.requiredCount &&
    data.requiredCount > 0 &&
    data.activeProviderCount > 0 &&
    data.capabilityCount > 0;
  const verifiedAt = data.verifiedAt
    ? new Date(data.verifiedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')
    : null;

  const updateCheck = (code: string, update: Partial<Pick<TeamVerificationCheck, 'completed' | 'note'>>) => {
    setChecks((current) => current.map((check) => (check.code === code ? { ...check, ...update } : check)));
    setDirty(true);
    setActionMessage(null);
  };
  const submitSave = () => {
    const normalizedReference = contractReference.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._/-]{3,79}$/.test(normalizedReference)) {
      showError(c.invalidReference);
      return;
    }
    if (checks.some((check) => check.note?.trim() && check.note.trim().length < 5)) {
      showError(c.invalidNote);
      return;
    }
    void save.mutateAsync().catch(report);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.section}>{c.title}</Text>
      <Text style={styles.privacy}>{c.privacy}</Text>
      <AppInput
        label={c.contractReference}
        value={contractReference}
        onChangeText={(value) => {
          setContractReference(value.toUpperCase());
          setDirty(true);
          setActionMessage(null);
        }}
        editable={!locked}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={80}
        placeholder={c.contractPlaceholder}
      />
      <Text style={styles.muted}>{c.contractHelp}</Text>

      <Text style={styles.subheading}>
        {c.progress}: {completedRequired}/{data.requiredCount}
      </Text>
      <RequirementState met={data.activeProviderCount > 0} label={c.providers} />
      <RequirementState met={data.capabilityCount > 0} label={c.capabilities} />

      <Text style={styles.subheading}>{c.checklist}</Text>
      {checks.map((check) => {
        const label = language === 'vi' ? check.labelVi : check.labelEn;
        const description = language === 'vi' ? check.descriptionVi : check.descriptionEn;
        return (
          <View key={check.code} style={styles.checkGroup}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: check.completed, disabled: locked }}
              accessibilityLabel={`${label}${check.required ? `, ${c.required}` : ''}`}
              accessibilityHint={description}
              disabled={locked}
              onPress={() => updateCheck(check.code, { completed: !check.completed })}
              style={[styles.checkRow, check.completed && styles.checkRowActive, locked && styles.locked]}
            >
              <Ionicons
                name={check.completed ? 'checkbox' : 'square-outline'}
                size={Spacing.lg}
                color={check.completed ? Colors.success : Colors.textMuted}
              />
              <View style={styles.flex}>
                <Text style={styles.checkLabel}>
                  {label} {check.required ? `• ${c.required}` : ''}
                </Text>
                <Text style={styles.muted}>{description}</Text>
              </View>
            </Pressable>
            <AppInput
              label={`${c.note}: ${label}`}
              value={check.note ?? ''}
              onChangeText={(note) => updateCheck(check.code, { note })}
              editable={!locked}
              maxLength={300}
              placeholder={c.notePlaceholder}
              multiline
            />
          </View>
        );
      })}

      {actionMessage ? (
        <Text style={styles.error} accessibilityRole="alert">
          {actionMessage}
        </Text>
      ) : null}

      {locked ? (
        <View style={styles.verifiedBox}>
          <Ionicons name="shield-checkmark" size={Spacing.lg} color={Colors.success} />
          <Text style={[styles.successText, styles.flex]}>
            {c.verifiedBy}: {data.verifiedByName ?? '—'}
            {verifiedAt ? ` • ${verifiedAt}` : ''}
          </Text>
        </View>
      ) : (
        <>
          <Text style={localReady ? styles.successText : styles.warningText} accessibilityRole="summary">
            {localReady ? c.ready : c.notReady}
          </Text>
          {dirty ? <Text style={styles.warningText}>{c.saveBeforeActivate}</Text> : null}
          <AppButton
            title={c.save}
            variant="outline"
            disabled={!dirty}
            loading={save.isPending}
            onPress={submitSave}
          />
          <AppButton
            title={c.activate}
            disabled={dirty || !data.readyToVerify}
            loading={activate.isPending}
            onPress={() => void activate.mutateAsync().catch(report)}
          />
        </>
      )}
    </View>
  );
}

function RequirementState({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'alert-circle-outline'}
        size={Spacing.lg}
        color={met ? Colors.success : Colors.warning}
      />
      <Text style={[met ? styles.successText : styles.warningText, styles.flex]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
  },
  errorCard: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSoft,
  },
  section: { ...Typography.h3, color: Colors.textPrimary },
  subheading: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.sm },
  privacy: {
    ...Typography.body,
    color: Colors.textSecondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.sky,
  },
  muted: { ...Typography.caption, color: Colors.textMuted },
  checkGroup: {
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  checkRowActive: { backgroundColor: Colors.successSoft },
  locked: { opacity: 0.72 },
  checkLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
  successText: { ...Typography.caption, color: Colors.success },
  warningText: { ...Typography.caption, color: Colors.warning },
  error: { ...Typography.body, color: Colors.error },
  flex: { flex: 1 },
});
