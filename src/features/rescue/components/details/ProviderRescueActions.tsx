import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { googleMapsNavigationUrl, navigationDestination } from '@/src/features/rescue/services/navigation';
import { isLiveStatus } from '@/src/features/rescue/status';
import { NavigationTarget } from '../NavigationTarget';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { useI18n } from '@/src/i18n';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function ProviderRescueActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const c = useRescueDetailsCopy();
  const english = useI18n((state) => state.language === 'en');
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [workType, setWorkType] = useState<'repair' | 'transport'>('repair');
  const [message, setMessage] = useState<string | null>(null);
  const runAction = async (action: string, nextWork?: 'repair' | 'transport') => {
    setMessage(null);
    try {
      const initialPrice = action === 'start_trip' ? Number(basePrice) : undefined;
      if (
        action === 'start_trip' &&
        (!basePrice.trim() ||
          !Number.isSafeInteger(initialPrice) ||
          initialPrice! < 0 ||
          initialPrice! > 100_000_000)
      ) {
        setMessage(
          english
            ? 'Enter a base price from 0 to 100,000,000 VND.'
            : 'Nhập giá cơ bản từ 0 đến 100.000.000 đồng.',
        );
        return;
      }
      await actions.action.mutateAsync({
        action,
        version: request.version,
        workType: nextWork,
        basePriceVnd: initialPrice,
      });
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
      {isLiveStatus(request.status) && <NavigationTarget request={request} />}
      {isLiveStatus(request.status) && (
        <AppButton
          title={c.navigate}
          variant="outline"
          onPress={() => {
            setMessage(null);
            try {
              void Linking.openURL(googleMapsNavigationUrl(navigationDestination(request))).catch(() =>
                setMessage(c.navigationError),
              );
            } catch {
              setMessage(c.navigationError);
            }
          }}
        />
      )}
      {request.status === 'assigned' ? (
        <View style={styles.quoteForm}>
          <AppInput
            label={english ? 'Base price (VND)' : 'Giá cơ bản (đồng)'}
            value={basePrice}
            keyboardType="number-pad"
            maxLength={9}
            onChangeText={(value) => setBasePrice(value.replace(/\D/g, ''))}
          />
          <Text style={styles.infoLabel}>
            {english
              ? 'Initial estimate; any revised total needs customer approval.'
              : 'Giá ban đầu; tổng tiền thay đổi cần khách đồng ý.'}
          </Text>
          <AppButton
            title={c.startTrip}
            loading={actions.action.isPending}
            onPress={() => void runAction('start_trip')}
          />
        </View>
      ) : null}
      {request.status === 'en_route' || request.status === 'awaiting_arrival_confirmation' ? (
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
          <AppButton
            title={c.requestCompletion}
            loading={actions.action.isPending}
            onPress={() => void runAction('request_completion')}
          />
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
      {request.status === 'repairing' ||
      request.status === 'transporting' ||
      request.status === 'awaiting_completion' ? (
        <AppButton
          title={c.requestCompletion}
          loading={actions.action.isPending}
          onPress={() => void runAction('request_completion')}
        />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}
