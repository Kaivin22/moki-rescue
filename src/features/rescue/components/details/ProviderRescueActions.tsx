import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function ProviderRescueActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const c = useRescueDetailsCopy();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [workType, setWorkType] = useState<'repair' | 'transport'>('repair');
  const [message, setMessage] = useState<string | null>(null);
  const runAction = async (action: string, nextWork?: 'repair' | 'transport') => {
    setMessage(null);
    try {
      await actions.action.mutateAsync({ action, version: request.version, workType: nextWork });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.stateError);
    }
  };
  const quote = async () => {
    const value = Number(amount.replace(/\D/g, ''));
    if (description.trim().length < 2 || !Number.isFinite(value)) return setMessage(c.quoteInvalid);
    try {
      await actions.quote.mutateAsync({
        description: description.trim(),
        amountVnd: value,
        workType,
        expectedRequestVersion: request.version,
      });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.quoteError);
    }
  };
  return (
    <View style={styles.actions}>
      {request.status === 'assigned' ? (
        <AppButton title={c.startTrip} onPress={() => void runAction('start_trip')} />
      ) : null}
      {request.status === 'en_route' ? (
        <AppButton title={c.requestArrival} onPress={() => void runAction('request_arrival')} />
      ) : null}
      {request.status === 'arrived' ? (
        <AppButton title={c.startDiagnosis} onPress={() => void runAction('start_diagnosis')} />
      ) : null}
      {request.status === 'diagnosing' && request.serviceRequiresQuote ? (
        <View style={styles.quoteForm}>
          <Text style={styles.section}>{c.createQuote}</Text>
          <AppInput
            label={c.workDescription}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
          />
          <AppInput
            label={c.amount}
            value={amount}
            onChangeText={(value) => setAmount(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
          />
          <View style={styles.workRow} accessibilityRole="radiogroup">
            {(['repair', 'transport'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setWorkType(value)}
                accessibilityRole="radio"
                accessibilityLabel={value === 'repair' ? c.repairBike : c.transportBike}
                accessibilityState={{ checked: workType === value }}
                style={[styles.workChip, workType === value && styles.workChipActive]}
              >
                <Text style={styles.workText}>{value === 'repair' ? c.repairBike : c.transportBike}</Text>
              </Pressable>
            ))}
          </View>
          <AppButton title={c.sendQuote} onPress={() => void quote()} loading={actions.quote.isPending} />
        </View>
      ) : null}
      {request.status === 'diagnosing' && !request.serviceRequiresQuote ? (
        <>
          <AppButton title={c.startRepair} onPress={() => void runAction('start_work', 'repair')} />
          <AppButton
            title={c.switchTransport}
            variant="outline"
            onPress={() => void runAction('start_work', 'transport')}
          />
        </>
      ) : null}
      {request.status === 'quote_approved' && request.activeWorkType ? (
        <AppButton
          title={request.activeWorkType === 'transport' ? c.startApprovedTransport : c.startApprovedRepair}
          onPress={() => void runAction('start_work', request.activeWorkType!)}
        />
      ) : null}
      {request.status === 'repairing' || request.status === 'transporting' ? (
        <AppButton title={c.requestCompletion} onPress={() => void runAction('request_completion')} />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}
