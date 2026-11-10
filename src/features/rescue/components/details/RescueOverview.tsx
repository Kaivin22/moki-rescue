import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { displayPhone, template } from '@/src/features/rescue/services/rescueDetailsPolicy';
import { statusColor, statusLabel } from '@/src/features/rescue/status';
import { useI18n } from '@/src/i18n';
import type { ProfileRole } from '@/src/types/profile';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

interface Props {
  request: RequestDetails;
  role: ProfileRole;
  showAttention: boolean;
  supportHotline: string;
  retryingDispatch: boolean;
  requestingSupport: boolean;
  onRetryDispatch: () => void;
  onRequestSupport: () => void;
}

export function RescueOverview({
  request,
  role,
  showAttention,
  supportHotline,
  retryingDispatch,
  requestingSupport,
  onRetryDispatch,
  onRequestSupport,
}: Props) {
  const c = useRescueDetailsCopy();
  const language = useI18n((state) => state.language);
  return (
    <>
      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, { backgroundColor: `${statusColor(request.status)}18` }]}>
          <Ionicons
            name={request.serviceIcon as keyof typeof Ionicons.glyphMap}
            size={25}
            color={statusColor(request.status)}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.service}>{request.serviceLabel}</Text>
          <Text style={[styles.status, { color: statusColor(request.status) }]}>
            {statusLabel(request.status, language)}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        {request.basePriceVnd != null ? (
          <Info
            icon="cash-outline"
            label={language === 'en' ? 'Base price (initial estimate)' : 'Giá cơ bản (ban đầu)'}
            value={`${request.basePriceVnd.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} đ`}
          />
        ) : null}
        {request.pickupNote ? (
          <Info
            icon="construct-outline"
            label={language === 'en' ? 'Reported issue' : 'Tình trạng khách báo'}
            value={request.pickupNote}
          />
        ) : null}
        <Info icon="location-outline" label={c.landmark} value={request.pickupAreaLabel} />
        {request.destinationAreaLabel ? (
          <Info icon="flag-outline" label={c.destination} value={request.destinationAreaLabel} />
        ) : null}
        {request.providerName ? (
          <Info icon="person-outline" label={c.provider} value={request.providerName} />
        ) : null}
        {role !== 'provider' && request.providerContactPhone ? (
          <CaseContactCard phone={request.providerContactPhone} customer={false} />
        ) : null}
        {role !== 'customer' && request.customerContactPhone ? (
          <CaseContactCard phone={request.customerContactPhone} customer />
        ) : null}
        {request.etaMinutes != null ? (
          <Info
            icon="time-outline"
            label={c.initialEta}
            value={template(c.aboutMinutes, { value: request.etaMinutes })}
          />
        ) : null}
        {request.roadDistanceM != null ? (
          <Info
            icon="navigate-outline"
            label={c.road}
            value={`${(request.roadDistanceM / 1000).toFixed(1)} km`}
          />
        ) : null}
      </View>

      {request.assignedProviderId ? (
        <AppButton
          title={c.fullscreen}
          variant="outline"
          onPress={() => router.push(`/rescue/${request.id}/map`)}
        />
      ) : null}

      {request.routingStatus === 'unavailable' ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{c.routingWarning}</Text>
        </View>
      ) : null}
      {request.status === 'needs_dispatch' ? (
        <View style={styles.noProviderCard}>
          <Text style={styles.noProviderTitle}>{c.dispatchRequiredTitle}</Text>
          <Text style={styles.infoLabel}>{c.dispatchRequiredBody}</Text>
        </View>
      ) : null}
      {showAttention ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            {c.attentionRequired}: {request.attentionCodes.join(', ')}
          </Text>
        </View>
      ) : null}
      {role === 'customer' && request.status === 'no_provider' ? (
        <View style={styles.noProviderCard}>
          <Text style={styles.noProviderTitle}>
            {request.routingStatus === 'unavailable' ? c.routingUnavailableTitle : c.noProviderTitle}
          </Text>
          <Text style={styles.infoLabel}>
            {request.routingStatus === 'unavailable' ? c.routingUnavailableBody : c.noProviderBody}
          </Text>
          <AppButton title={c.retry} loading={retryingDispatch} onPress={onRetryDispatch} />
          <AppButton
            title={c.requestDispatchSupport}
            variant="outline"
            loading={requestingSupport}
            onPress={onRequestSupport}
          />
          {supportHotline ? (
            <AppButton
              title={`${c.callDispatch} ${supportHotline}`}
              variant="outline"
              onPress={() => void Linking.openURL(`tel:${supportHotline}`)}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function CaseContactCard({ phone, customer }: { phone: string; customer: boolean }) {
  const visiblePhone = displayPhone(phone);
  const c = useRescueDetailsCopy();
  return (
    <Pressable
      style={styles.infoRow}
      onPress={() => void Linking.openURL(`tel:${phone}`)}
      accessibilityRole="button"
      accessibilityLabel={`${customer ? c.callCustomer : c.callProvider} ${visiblePhone}`}
    >
      <Ionicons name="call-outline" size={20} color={Colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{customer ? c.customerContactLabel : c.contactLabel}</Text>
        <Text style={styles.infoValue}>{visiblePhone}</Text>
        <Text style={styles.contactPrivacy}>{customer ? c.customerContactPrivacy : c.contactPrivacy}</Text>
      </View>
      <View style={styles.callChip}>
        <Text style={styles.callChipText}>{c.call}</Text>
      </View>
    </Pressable>
  );
}
