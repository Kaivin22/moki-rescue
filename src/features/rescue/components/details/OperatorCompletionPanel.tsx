import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';
import type { CaseResolutionInput, RequestDetails } from '@/src/types/rescue';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

const COPY = {
  vi: {
    title: 'Admin: xác minh kết thúc ca',
    body: 'Liên hệ các bên và kiểm tra căn cứ trước khi quyết định. Chỉ xác nhận hoàn thành khi công việc thực sự đã xong. Nếu công việc không thực hiện được, dùng phần hủy ca có lý do bên dưới.',
    note: 'Căn cứ và kết quả liên hệ (chỉ admin xem)',
    verified: 'Đã xác minh công việc hoàn tất',
    unverified: 'Chưa xác minh — giữ ca mở',
    confirm: 'Xác nhận kết thúc ca là hoàn thành',
    confirmBody:
      'Thao tác này ghi nhận ca hoàn thành, chuyển vào lịch sử và giải phóng cứu hộ viên. Không dùng chỉ vì khách chưa phản hồi.',
    back: 'Quay lại kiểm tra',
    required: 'Ghi căn cứ từ 10 đến 500 ký tự trước khi xác nhận.',
    error: 'Không lưu được quyết định. Hãy tải lại ca và kiểm tra.',
    saved: 'Đã lưu: chưa xác minh. Ca và cảnh báo hiện có vẫn mở; tiếp tục liên hệ các bên.',
    previous: 'Ghi nhận gần nhất của admin',
  },
  en: {
    title: 'Admin: verify job completion',
    body: 'Contact the parties and review evidence. Confirm only when the work is actually finished. If the work cannot be performed, use cancellation with a reason below.',
    note: 'Evidence and contact outcome (admins only)',
    verified: 'Work completion has been verified',
    unverified: 'Unverified — keep job open',
    confirm: 'Confirm and close as completed',
    confirmBody:
      'This records completion, moves the job to history and releases the provider. Do not use it only because the customer has not responded.',
    back: 'Back to review',
    required: 'Enter 10–500 characters of evidence before confirming.',
    error: 'Could not save the decision. Reload the job and review it.',
    saved:
      'Recorded as unverified. The job and existing alerts remain open; continue contacting the parties.',
    previous: 'Latest admin record',
  },
} as const;

export function OperatorCompletionPanel({ request }: { request: RequestDetails }) {
  const c = useCopy(COPY);
  const { resolveCase } = useRequestMutation(request.id);
  const [note, setNote] = useState('');
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = resolveCase.isPending;
  const submit = async (decision: CaseResolutionInput['decision']) => {
    if (note.trim().length < 10) return setMessage(c.required);
    setMessage(null);
    try {
      await resolveCase.mutateAsync({
        decision,
        note: note.trim(),
        expectedVersion: decision === 'verified_completed' ? confirmVersion! : request.version,
      });
      setConfirmVersion(null);
      setNote('');
      if (decision === 'unverified') setMessage(c.saved);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.error);
      setConfirmVersion(null);
    }
  };
  if (request.status !== 'awaiting_completion' && !request.operatorResolution?.note) return null;
  return (
    <View style={styles.cancelPanel}>
      <Text style={styles.section}>{c.title}</Text>
      {request.operatorResolution?.note ? (
        <Text style={styles.infoLabel}>
          {c.previous} ({new Date(request.operatorResolution.createdAt).toLocaleString()}):{' '}
          {request.operatorResolution.note}
        </Text>
      ) : null}
      {request.status === 'awaiting_completion' ? (
        <>
          <Text style={styles.infoLabel}>{c.body}</Text>
          <AppInput
            label={c.note}
            value={note}
            onChangeText={(value) => {
              setNote(value);
              setConfirmVersion(null);
            }}
            maxLength={500}
            multiline
            editable={!pending}
          />
          {message ? (
            <Text accessibilityRole="alert" style={styles.infoLabel}>
              {message}
            </Text>
          ) : null}
          {confirmVersion !== null ? (
            <>
              <Text style={styles.infoLabel}>{c.confirmBody}</Text>
              <AppButton
                title={c.confirm}
                loading={pending}
                onPress={() => void submit('verified_completed')}
              />
              <AppButton
                title={c.back}
                variant="ghost"
                disabled={pending}
                onPress={() => setConfirmVersion(null)}
              />
            </>
          ) : (
            <>
              <AppButton
                title={c.verified}
                disabled={pending || note.trim().length < 10}
                onPress={() => {
                  setMessage(null);
                  setConfirmVersion(request.version);
                }}
              />
              <AppButton
                title={c.unverified}
                variant="outline"
                loading={pending}
                disabled={note.trim().length < 10}
                onPress={() => void submit('unverified')}
              />
            </>
          )}
        </>
      ) : null}
    </View>
  );
}
