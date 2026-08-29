import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useSupportAction } from '@/src/features/rescue/hooks/useRescueActions';
import { useRequestMutation } from '@/src/features/rescue/hooks/useRescueQueries';
import {
  customerCancellationReasons,
  customerFeedbackReasons,
  requiresAssistedCancellation,
  transportQuoteNeedsDestination,
  type CustomerFeedbackAction,
  type CustomerFeedbackReason,
} from '@/src/features/rescue/services/rescueDetailsPolicy';
import { canCustomerCancel } from '@/src/features/rescue/status';
import type { CancellationReasonCode, RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');

export function CustomerRescueActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const support = useSupportAction(request.id);
  const c = useRescueDetailsCopy();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<CustomerFeedbackAction | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<CustomerFeedbackReason | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [supportRequested, setSupportRequested] = useState(false);

  const run = async (operation: Promise<unknown>) => {
    setMessage(null);
    try {
      await operation;
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };
  const cancellationReasons = customerCancellationReasons(request.status);
  const late = request.status === 'en_route' || request.status === 'awaiting_arrival_confirmation';
  const arrivalDispute = request.status === 'awaiting_arrival_confirmation';
  const transportNeedsDestination = transportQuoteNeedsDestination(request);

  const submitCancellation = async () => {
    if (!reasonCode) return setMessage(c.cancelReasonRequired);
    if (reasonCode === 'other' && cancelNote.trim().length < 5) {
      return setMessage(c.otherReasonRequired);
    }
    setMessage(null);
    try {
      await actions.cancel.mutateAsync({
        reasonCode,
        note: cancelNote.trim() || undefined,
        expectedVersion: request.version,
      });
      setCancelOpen(false);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.cancelError);
    }
  };

  const feedbackReasons = customerFeedbackReasons(feedbackAction);
  const submitFeedback = async () => {
    if (!feedbackAction || !feedbackReason) return setMessage(c.feedbackReasonRequired);
    if (feedbackReason === 'other' && feedbackNote.trim().length < 5) {
      return setMessage(c.otherReasonRequired);
    }
    setMessage(null);
    try {
      await actions.action.mutateAsync({
        action: feedbackAction,
        version: request.version,
        reasonCode: feedbackReason,
        note: feedbackNote.trim() || undefined,
      });
      setFeedbackAction(null);
      setFeedbackReason(null);
      setFeedbackNote('');
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };

  const requestDispatchSupport = async () => {
    setMessage(null);
    try {
      await support.mutateAsync('assisted_cancellation');
      setSupportRequested(true);
      setMessage(c.supportRequested);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.supportError);
    }
  };

  return (
    <View style={styles.actions}>
      {request.status === 'awaiting_arrival_confirmation' ? (
        <>
          <AppButton
            title={c.confirmArrival}
            onPress={() =>
              void run(actions.action.mutateAsync({ action: 'confirm_arrival', version: request.version }))
            }
          />
          <AppButton
            title={c.rejectArrival}
            variant="outline"
            onPress={() => setFeedbackAction('reject_arrival')}
          />
        </>
      ) : null}
      {request.status === 'awaiting_quote' && request.currentQuote?.status === 'pending' ? (
        <>
          {transportNeedsDestination ? (
            <View style={styles.destinationRequiredCard}>
              <Text style={styles.infoLabel}>{c.destinationBeforeQuote}</Text>
              <AppButton
                title={c.chooseDestination}
                variant="outline"
                onPress={() => router.push(`/rescue/${request.id}/destination`)}
              />
            </View>
          ) : (
            <AppButton
              title={c.approveQuote}
              onPress={() =>
                void run(
                  actions.decideQuote.mutateAsync({
                    quoteId: request.currentQuote!.id,
                    decision: 'approve',
                    version: request.version,
                  }),
                )
              }
            />
          )}
          <AppButton
            title={c.rejectQuote}
            variant="outline"
            onPress={() =>
              void run(
                actions.decideQuote.mutateAsync({
                  quoteId: request.currentQuote!.id,
                  decision: 'reject',
                  version: request.version,
                }),
              )
            }
          />
        </>
      ) : null}
      {request.status === 'awaiting_completion' ? (
        <>
          <AppButton
            title={c.confirmCompletion}
            onPress={() =>
              void run(actions.action.mutateAsync({ action: 'confirm_completion', version: request.version }))
            }
          />
          <AppButton
            title={c.incomplete}
            variant="outline"
            onPress={() =>
              setFeedbackAction(request.activeWorkType === 'transport' ? 'reject_transport' : 'reject_repair')
            }
          />
        </>
      ) : null}
      {feedbackAction ? (
        <View style={styles.feedbackPanel}>
          <Text style={styles.section}>{c.feedbackTitle}</Text>
          <View accessibilityRole="radiogroup" style={styles.reasonList}>
            {feedbackReasons.map((code) => {
              const selected = feedbackReason === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={c.feedbackReasons[code]}
                  onPress={() => setFeedbackReason(code)}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={21}
                    color={selected ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={styles.reasonOptionText}>{c.feedbackReasons[code]}</Text>
                </Pressable>
              );
            })}
          </View>
          <AppInput
            label={c.feedbackNote}
            value={feedbackNote}
            onChangeText={setFeedbackNote}
            maxLength={300}
            multiline
          />
          <AppButton
            title={c.sendFeedback}
            onPress={() => void submitFeedback()}
            loading={actions.action.isPending}
          />
          <AppButton
            title={c.closeFeedback}
            variant="ghost"
            onPress={() => {
              setFeedbackAction(null);
              setFeedbackReason(null);
              setFeedbackNote('');
            }}
          />
        </View>
      ) : null}
      {canCustomerCancel(request.status) ? (
        cancelOpen ? (
          <View style={styles.cancelPanel}>
            <Text style={styles.section}>{c.cancelTitle}</Text>
            <Text style={styles.infoLabel}>{c.cancelBody}</Text>
            {late ? (
              <View style={styles.cancelWarning}>
                <Ionicons name="warning-outline" size={20} color={Colors.warning} />
                <Text style={styles.cancelWarningText}>
                  {arrivalDispute ? c.arrivalDisputeWarning : c.lateCancelWarning}
                </Text>
              </View>
            ) : null}
            <Text style={styles.fieldLabel}>{c.chooseCancelReason}</Text>
            <View accessibilityRole="radiogroup" style={styles.reasonList}>
              {cancellationReasons.map((code) => {
                const selected = reasonCode === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setReasonCode(code);
                      setMessage(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={c.reasonLabels[code]}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={21}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={styles.reasonOptionText}>{c.reasonLabels[code]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label={reasonCode === 'other' ? c.cancelOtherNote : c.cancelNote}
              value={cancelNote}
              onChangeText={setCancelNote}
              maxLength={300}
              multiline
            />
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <AppButton
              title={c.cancel}
              variant="destructive"
              onPress={() => void submitCancellation()}
              loading={actions.cancel.isPending}
            />
            <AppButton
              title={c.keep}
              variant="ghost"
              onPress={() => {
                setCancelOpen(false);
                setReasonCode(null);
                setCancelNote('');
                setMessage(null);
              }}
            />
          </View>
        ) : (
          <AppButton title={c.cancel} variant="ghost" onPress={() => setCancelOpen(true)} />
        )
      ) : null}
      {requiresAssistedCancellation(request.status) ? (
        <View style={styles.assistedCancelCard}>
          <Text style={styles.noProviderTitle}>{c.cancelAfterArrivalTitle}</Text>
          <Text style={styles.infoLabel}>{c.cancelAfterArrivalBody}</Text>
          <AppButton
            title={supportRequested ? c.supportRequested : c.requestDispatchSupport}
            loading={support.isPending}
            disabled={supportRequested}
            onPress={() => void requestDispatchSupport()}
          />
          {SUPPORT_HOTLINE ? (
            <AppButton
              title={`${c.callDispatch} ${SUPPORT_HOTLINE}`}
              variant="outline"
              onPress={() => void Linking.openURL(`tel:${SUPPORT_HOTLINE}`)}
            />
          ) : null}
        </View>
      ) : null}
      {!cancelOpen && message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}
