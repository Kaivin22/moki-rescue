import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
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
        <Info icon="location-outline" label={c.landmark} value={request.pickupAreaLabel} />
        {request.destinationAreaLabel ? (
          <Info icon="flag-outline" label={c.destination} value={request.destinationAreaLabel} />
        ) : null}
        {request.providerName ? (
          <Info icon="person-outline" label={c.provider} value={request.providerName} />
        ) : null}
        {request.assignedProviderId ? (
          <RatingBadge rating={request.providerRating} label={c.provider} />
        ) : null}
        {request.providerContactPhone ? <ProviderContactCard phone={request.providerContactPhone} /> : null}
        {request.providerTeamName ? (
          <Info icon="people-outline" label={c.team} value={request.providerTeamName} />
        ) : null}
        {request.providerTeamName ? <RatingBadge rating={request.teamRating} label={c.team} /> : null}
        {request.rescueVehicleLabel ? (
          <Info icon="bicycle-outline" label={c.vehicle} value={request.rescueVehicleLabel} />
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
      {request.providerLocationStatus === 'stale' ? (
        <View style={styles.warning}>
          <Text style={styles.noProviderTitle}>{c.gpsStaleTitle}</Text>
          <Text style={styles.warningText}>{c.gpsStaleBody}</Text>
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
          <Text style={styles.noProviderTitle}>{c.noProviderTitle}</Text>
          <Text style={styles.infoLabel}>{c.noProviderBody}</Text>
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

function ProviderContactCard({ phone }: { phone: string }) {
  const visiblePhone = displayPhone(phone);
  const c = useRescueDetailsCopy();
  return (
    <Pressable
      style={styles.infoRow}
      onPress={() => void Linking.openURL(`tel:${phone}`)}
      accessibilityRole="button"
      accessibilityLabel={`${c.callProvider} ${visiblePhone}`}
    >
      <Ionicons name="call-outline" size={20} color={Colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{c.contactLabel}</Text>
        <Text style={styles.infoValue}>{visiblePhone}</Text>
        <Text style={styles.contactPrivacy}>{c.contactPrivacy}</Text>
      </View>
      <View style={styles.callChip}>
        <Text style={styles.callChipText}>{c.call}</Text>
      </View>
    </Pressable>
  );
}
