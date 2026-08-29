import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import type { ProfileRole } from '@/src/types/profile';
import type { CancellationReasonCode, RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function CancellationSummary({ request, role }: { request: RequestDetails; role: ProfileRole }) {
  const c = useRescueDetailsCopy();
  const reasonLabel = request.cancellationCode ? c.reasonLabels[request.cancellationCode] : null;
  const canSeeOperationalEvidence = role === 'dispatcher' || role === 'admin';
  return (
    <View style={styles.cancellationSummary}>
      <View style={styles.summaryTitleRow}>
        <Ionicons name="document-text-outline" size={21} color={Colors.primary} />
        <Text style={styles.section}>{c.cancellationRecorded}</Text>
      </View>
      {reasonLabel ? <Text style={styles.infoValue}>{reasonLabel}</Text> : null}
      {!reasonLabel && request.cancellationStage === 'operational' ? (
        <Text style={styles.infoValue}>{c.operationalCancellation}</Text>
      ) : null}
      {request.cancellationReason ? <Text style={styles.infoLabel}>{request.cancellationReason}</Text> : null}
      {request.lateCancellation ? (
        <Text style={styles.lateCancellationText}>{c.lateCancellationRecorded}</Text>
      ) : null}
      {canSeeOperationalEvidence && request.providerNearPickupOnCancel === true ? (
        <Text style={styles.infoLabel}>{c.gpsNearRecorded}</Text>
      ) : null}
    </View>
  );
}

interface OperationalCancellationPanelProps {
  request: RequestDetails;
  actorLabel: string;
  reasonCode: CancellationReasonCode;
  providerWithdrawal?: boolean;
}

export function OperationalCancellationPanel({
  request,
  actorLabel,
  reasonCode,
  providerWithdrawal = false,
}: OperationalCancellationPanelProps) {
  const actions = useRequestMutation(request.id);
  const c = useRescueDetailsCopy();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  if (request.status === 'completed' || request.status === 'cancelled') return null;
  const submit = async () => {
    if (reason.trim().length < 5) return setMessage(c.reasonRequired);
    setMessage(null);
    try {
      if (providerWithdrawal) {
        await rescueApi.withdrawProvider(request.id, reason.trim());
        router.replace('/(tabs)/operations');
      } else {
        await actions.cancel.mutateAsync({
          reasonCode,
          note: reason.trim(),
          expectedVersion: request.version,
        });
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.cancelError);
    }
  };
  if (!open) {
    return (
      <AppButton title={`${actorLabel}: ${c.cannotContinue}`} variant="ghost" onPress={() => setOpen(true)} />
    );
  }
  return (
    <View style={styles.cancelPanel}>
      <Text style={styles.section}>{c.auditCancel}</Text>
      <Text style={styles.infoLabel}>{providerWithdrawal ? c.withdrawBody : c.auditBody}</Text>
      <AppInput label={c.reason} value={reason} onChangeText={setReason} maxLength={300} multiline />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <AppButton
        title={c.confirmCancel}
        variant="destructive"
        onPress={() => void submit()}
        loading={actions.cancel.isPending}
      />
      <AppButton
        title={c.keep}
        variant="ghost"
        onPress={() => {
          setOpen(false);
          setMessage(null);
        }}
      />
    </View>
  );
}
