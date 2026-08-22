import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { MapView, Marker, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useCreateRequest, useServiceTypes } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCurrentLocation } from '@/src/features/location/hooks/useCurrentLocation';
import { emergencyCallUri, EMERGENCY_CONTACTS } from '@/src/features/safety/emergencyContacts';
import { useCopy } from '@/src/i18n';
import { createUuid } from '@/src/utils/uuid';

type Step = 0 | 1 | 2;

const COPY = {
  vi: {
    safetyRequired: 'Hãy trả lời cả hai câu hỏi an toàn.',
    emergencyRequired: 'MotoRescue không phải lực lượng cứu nạn. Hãy liên hệ cơ quan khẩn cấp trước.',
    serviceRequired: 'Hãy chọn loại sự cố.',
    locationRequired: 'Hãy lấy hoặc chọn vị trí trên bản đồ.',
    labelRequired: 'Hãy nhập điểm nhận biết gần vị trí của bạn.',
    safeRequired: 'Hãy xác nhận bạn và xe đang ở vị trí an toàn.',
    createError: 'Không thể tạo yêu cầu.',
    title: 'Gọi cứu hộ',
    progress: ['An toàn', 'Sự cố', 'Vị trí'],
    safetyTitle: 'Trước tiên, bạn có an toàn không?',
    safetyBody: 'Hai câu hỏi này giúp tránh dùng cứu hộ kỹ thuật cho tình huống cần cấp cứu hoặc cứu nạn.',
    injury: 'Có người bị thương không?',
    hazard: 'Có cháy, rò rỉ nhiên liệu hoặc nguy cơ tai nạn tiếp diễn không?',
    stop: 'Dừng yêu cầu cứu hộ kỹ thuật',
    stopBody:
      'Di chuyển đến nơi an toàn nếu có thể và gọi đúng lực lượng. Ứng dụng không tự thực hiện cuộc gọi.',
    call: 'Gọi',
    issueTitle: 'Xe của bạn gặp vấn đề gì?',
    issueBody: 'Chọn một dịch vụ để hệ thống tìm đúng đội có năng lực xử lý.',
    loadServicesError: 'Không tải được danh mục dịch vụ.',
    retry: 'Thử lại',
    vehicleType: 'Loại xe',
    gasoline: 'Xe xăng',
    electric: 'Xe điện',
    unknown: 'Không rõ',
    vehicle: 'Mô tả xe (không bắt buộc)',
    vehiclePlaceholder: 'Ví dụ: Wave RSX màu đen',
    locationTitle: 'Xác nhận điểm cứu hộ',
    loadingLocation: 'Đang lấy vị trí…',
    updateLocation: 'Cập nhật GPS',
    useLocation: 'Dùng vị trí hiện tại',
    denied: 'Quyền vị trí bị từ chối. Hãy bật quyền trong cài đặt hệ thống.',
    openSettings: 'Mở cài đặt hệ thống',
    locationError: 'Không thể lấy vị trí. Kiểm tra GPS và thử lại.',
    mapEmpty: 'Chọn “Dùng vị trí hiện tại” để mở bản đồ và xác nhận điểm đón.',
    manualPin: 'Ghim đã được điều chỉnh thủ công',
    gpsAccuracy: 'Sai số GPS khoảng',
    markerTitle: 'Điểm cứu hộ',
    markerDescription: 'Kéo ghim hoặc chạm bản đồ để điều chỉnh',
    mapHint: 'Kiểm tra đúng phía đường, đầu cầu hoặc lối vào hẻm trước khi gửi.',
    nearby: 'Điểm nhận biết gần bạn',
    nearbyPlaceholder: 'Tên đường, cửa hàng hoặc cổng gần nhất',
    note: 'Ghi chú cho cứu hộ viên',
    notePlaceholder: 'Vị trí đỗ xe, dấu hiệu sự cố…',
    safe: 'Tôi đã đưa bản thân và xe ra khỏi làn xe chạy hoặc vị trí nguy hiểm.',
    next: 'Tiếp theo',
    submit: 'Tìm đội cứu hộ',
    yes: 'Có',
    no: 'Không',
  },
  en: {
    safetyRequired: 'Answer both safety questions.',
    emergencyRequired: 'MotoRescue is not an emergency response service. Contact emergency services first.',
    serviceRequired: 'Select an issue type.',
    locationRequired: 'Get or select a location on the map.',
    labelRequired: 'Enter a nearby landmark.',
    safeRequired: 'Confirm that you and the motorcycle are in a safe position.',
    createError: 'Could not create the request.',
    title: 'Request rescue',
    progress: ['Safety', 'Issue', 'Location'],
    safetyTitle: 'First, are you safe?',
    safetyBody: 'These questions keep technical rescue from being used for emergencies.',
    injury: 'Is anyone injured?',
    hazard: 'Is there fire, leaking fuel, or continuing crash risk?',
    stop: 'Stop the technical rescue request',
    stopBody:
      'Move somewhere safe if possible and call the appropriate service. The app never calls automatically.',
    call: 'Call',
    issueTitle: 'What is wrong with the motorcycle?',
    issueBody: 'Select one service so the system can find a capable team.',
    loadServicesError: 'Could not load the service catalog.',
    retry: 'Try again',
    vehicleType: 'Motorcycle type',
    gasoline: 'Gasoline',
    electric: 'Electric',
    unknown: 'Unknown',
    vehicle: 'Motorcycle description (optional)',
    vehiclePlaceholder: 'Example: black Wave RSX',
    locationTitle: 'Confirm rescue location',
    loadingLocation: 'Getting location…',
    updateLocation: 'Update GPS',
    useLocation: 'Use current location',
    denied: 'Location permission was denied. Enable it in system settings.',
    openSettings: 'Open system settings',
    locationError: 'Could not get your location. Check GPS and try again.',
    mapEmpty: 'Choose “Use current location” to open the map and confirm pickup.',
    manualPin: 'Pin adjusted manually',
    gpsAccuracy: 'GPS accuracy about',
    markerTitle: 'Rescue pickup',
    markerDescription: 'Drag the pin or tap the map to adjust',
    mapHint: 'Check the correct side of the road, bridge entrance, or alley entrance before sending.',
    nearby: 'Nearby landmark',
    nearbyPlaceholder: 'Nearest street, shop, or gate',
    note: 'Note for the rescue provider',
    notePlaceholder: 'Parking position, visible symptoms…',
    safe: 'I moved myself and the motorcycle out of the traffic lane or dangerous position.',
    next: 'Continue',
    submit: 'Find rescue team',
    yes: 'Yes',
    no: 'No',
  },
} as const;

export default function CreateRequestScreen() {
  const params = useLocalSearchParams<{ service?: string }>();
  const services = useServiceTypes();
  const create = useCreateRequest();
  const location = useCurrentLocation();
  const [step, setStep] = useState<Step>(0);
  const [serviceCode, setServiceCode] = useState('');
  const [power, setPower] = useState<'gasoline' | 'electric' | 'unknown'>('gasoline');
  const [vehicle, setVehicle] = useState('');
  const [note, setNote] = useState('');
  const [hasInjury, setHasInjury] = useState<boolean | null>(null);
  const [hasImmediateHazard, setHasImmediateHazard] = useState<boolean | null>(null);
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = useCopy(COPY);

  useEffect(() => {
    if (params.service && services.data?.some((service) => service.code === params.service)) {
      setServiceCode(params.service);
    }
  }, [params.service, services.data]);

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((step - 1) as Step);
    else router.replace('/(tabs)');
  };
  const nextFromSafety = () => {
    if (hasInjury === null || hasImmediateHazard === null) return setError(c.safetyRequired);
    if (hasInjury || hasImmediateHazard) return setError(c.emergencyRequired);
    setError(null);
    setStep(1);
  };
  const nextFromIssue = () => {
    if (!serviceCode) return setError(c.serviceRequired);
    setError(null);
    setStep(2);
  };
  const selectPickup = (latitude: number, longitude: number) => {
    void location.selectCoordinate({ latitude, longitude, accuracy: null });
  };
  const submit = async () => {
    if (!location.coordinate) return setError(c.locationRequired);
    if (!location.label.trim()) return setError(c.labelRequired);
    if (!safe) return setError(c.safeRequired);
    setError(null);
    try {
      const request = await create.mutateAsync({
        idempotencyKey: createUuid(),
        input: {
          serviceCode,
          vehiclePowerType: power,
          vehicleDescription: vehicle.trim() || undefined,
          pickupAreaLabel: location.label.trim(),
          pickupNote: note.trim() || undefined,
          latitude: location.coordinate.latitude,
          longitude: location.coordinate.longitude,
          hasInjury: false,
          hasImmediateHazard: false,
          safetyAcknowledged: true,
        },
      });
      router.replace(`/rescue/${request.id}`);
    } catch (submitError) {
      setError(submitError instanceof ApiClientError ? submitError.message : c.createError);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title={c.title} onBack={goBack} />
        <Progress step={step} labels={c.progress} />
        {step === 0 ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{c.safetyTitle}</Text>
            <Text style={styles.subtitle}>{c.safetyBody}</Text>
            <SafetyQuestion
              label={c.injury}
              value={hasInjury}
              onChange={setHasInjury}
              yes={c.yes}
              no={c.no}
            />
            <SafetyQuestion
              label={c.hazard}
              value={hasImmediateHazard}
              onChange={setHasImmediateHazard}
              yes={c.yes}
              no={c.no}
            />
            {hasInjury || hasImmediateHazard ? <EmergencyCard copy={c} /> : null}
            <InlineError value={error} />
            <AppButton title={c.next} onPress={nextFromSafety} />
          </ScrollView>
        ) : null}

        {step === 1 ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{c.issueTitle}</Text>
            <Text style={styles.subtitle}>{c.issueBody}</Text>
            {services.isError ? (
              <View style={styles.errorCard}>
                <Text style={styles.error}>{c.loadServicesError}</Text>
                <AppButton title={c.retry} variant="outline" onPress={() => void services.refetch()} />
              </View>
            ) : null}
            <View style={styles.serviceList} accessibilityRole="radiogroup">
              {(services.data ?? []).map((service) => {
                const selected = service.code === serviceCode;
                return (
                  <Pressable
                    key={service.code}
                    onPress={() => setServiceCode(service.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.service, selected && styles.selected]}
                  >
                    <View style={[styles.serviceIcon, selected && styles.serviceIconSelected]}>
                      <Ionicons
                        name={service.iconName as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={selected ? Colors.textOnAccent : Colors.primary}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.serviceTitle}>{service.label}</Text>
                      <Text style={styles.serviceBody}>{service.description}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>{c.vehicleType}</Text>
            <View style={styles.segmentRow} accessibilityRole="radiogroup">
              {(
                [
                  ['gasoline', c.gasoline],
                  ['electric', c.electric],
                  ['unknown', c.unknown],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setPower(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: power === value }}
                  style={[styles.segment, power === value && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, power === value && styles.segmentTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <AppInput
              label={c.vehicle}
              value={vehicle}
              onChangeText={setVehicle}
              maxLength={160}
              placeholder={c.vehiclePlaceholder}
            />
            <InlineError value={error} />
            <AppButton title={c.next} onPress={nextFromIssue} disabled={services.isLoading} />
          </ScrollView>
        ) : null}

        {step === 2 ? (
          <View style={styles.locationLayout}>
            <View style={styles.mapArea}>
              {location.coordinate ? (
                <MapView
                  style={StyleSheet.absoluteFill}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  region={{
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                  mapPadding={{ top: Spacing.md, right: Spacing.md, bottom: Spacing.md, left: Spacing.md }}
                  toolbarEnabled={false}
                  showsMyLocationButton={false}
                  onPress={(event) =>
                    selectPickup(
                      event.nativeEvent.coordinate.latitude,
                      event.nativeEvent.coordinate.longitude,
                    )
                  }
                >
                  <Marker
                    coordinate={location.coordinate}
                    title={c.markerTitle}
                    description={c.markerDescription}
                    draggable
                    onDragEnd={(event) =>
                      selectPickup(
                        event.nativeEvent.coordinate.latitude,
                        event.nativeEvent.coordinate.longitude,
                      )
                    }
                  />
                </MapView>
              ) : (
                <View style={styles.mapEmpty}>
                  <View style={styles.mapEmptyIcon}>
                    <Ionicons name="location-outline" size={34} color={Colors.primary} />
                  </View>
                  <Text style={styles.mapEmptyText}>{c.mapEmpty}</Text>
                </View>
              )}
            </View>
            <View style={styles.locationSheet}>
              <View style={styles.sheetHandle} />
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetTitle}>{c.locationTitle}</Text>
                <AppButton
                  title={
                    location.status === 'loading'
                      ? c.loadingLocation
                      : location.coordinate
                        ? c.updateLocation
                        : c.useLocation
                  }
                  variant="outline"
                  loading={location.status === 'loading'}
                  onPress={() => void location.requestLocation()}
                />
                {location.status === 'denied' ? (
                  <View style={styles.permissionError}>
                    <Text style={styles.error}>{c.denied}</Text>
                    <AppButton
                      title={c.openSettings}
                      variant="outline"
                      onPress={() => void Linking.openSettings()}
                    />
                  </View>
                ) : null}
                {location.status === 'error' ? <Text style={styles.error}>{c.locationError}</Text> : null}
                {location.coordinate ? (
                  <Text style={styles.coordinate}>
                    {location.coordinate.accuracy == null
                      ? c.manualPin
                      : `${c.gpsAccuracy} ${Math.round(location.coordinate.accuracy)} m`}
                  </Text>
                ) : null}
                <Text style={styles.mapHint}>{c.mapHint}</Text>
                <AppInput
                  label={c.nearby}
                  value={location.label}
                  onChangeText={location.setLabel}
                  maxLength={160}
                  placeholder={c.nearbyPlaceholder}
                />
                <AppInput
                  label={c.note}
                  value={note}
                  onChangeText={setNote}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  placeholder={c.notePlaceholder}
                />
                <Pressable
                  onPress={() => setSafe((value) => !value)}
                  style={[styles.safety, safe && styles.safetyChecked]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: safe }}
                >
                  <Ionicons
                    name={safe ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={safe ? Colors.success : Colors.textMuted}
                  />
                  <Text style={styles.safetyText}>{c.safe}</Text>
                </Pressable>
                <InlineError value={error} />
              </ScrollView>
              <View style={styles.sheetAction}>
                <AppButton title={c.submit} onPress={() => void submit()} loading={create.isPending} />
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Progress({ step, labels }: { step: Step; labels: readonly string[] }) {
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: 3, now: step + 1 }}
    >
      {labels.map((label, index) => (
        <View key={label} style={styles.progressItem}>
          <View style={[styles.progressDot, index <= step && styles.progressDotActive]}>
            {index < step ? (
              <Ionicons name="checkmark" size={14} color={Colors.textOnAccent} />
            ) : (
              <Text style={[styles.progressNumber, index <= step && styles.progressNumberActive]}>
                {index + 1}
              </Text>
            )}
          </View>
          <Text style={[styles.progressLabel, index === step && styles.progressLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function InlineError({ value }: { value: string | null }) {
  return value ? (
    <Text style={styles.error} accessibilityRole="alert">
      {value}
    </Text>
  ) : null;
}

function EmergencyCard({ copy }: { copy: { stop: string; stopBody: string; call: string } }) {
  return (
    <View style={styles.emergencyCard}>
      <Text style={styles.emergencyTitle}>{copy.stop}</Text>
      <Text style={styles.emergencyBody}>{copy.stopBody}</Text>
      <View style={styles.emergencyButtons}>
        {EMERGENCY_CONTACTS.map((contact) => (
          <Pressable
            key={contact.number}
            accessibilityRole="button"
            style={styles.emergencyButton}
            onPress={() => void Linking.openURL(emergencyCallUri(contact.number))}
          >
            <Text style={styles.emergencyButtonText}>
              {copy.call} {contact.number}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SafetyQuestion({
  label,
  value,
  onChange,
  yes,
  no,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <View style={styles.safetyQuestion}>
      <Text style={styles.safetyQuestionText}>{label}</Text>
      <View style={styles.answerRow} accessibilityRole="radiogroup">
        {([true, false] as const).map((answer) => (
          <Pressable
            key={String(answer)}
            onPress={() => onChange(answer)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === answer }}
            style={[styles.answer, value === answer && styles.answerSelected]}
          >
            <Text style={[styles.answerText, value === answer && styles.answerTextSelected]}>
              {answer ? yes : no}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  label: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  progress: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  progressItem: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accentDark },
  progressNumber: { ...Typography.caption, color: Colors.textMuted },
  progressNumberActive: { color: Colors.textOnAccent },
  progressLabel: { ...Typography.caption, color: Colors.textMuted },
  progressLabelActive: { color: Colors.textPrimary, fontFamily: 'BeVietnamPro_600SemiBold' },
  serviceList: { gap: Spacing.sm },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.accentSoft },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  serviceIconSelected: { backgroundColor: Colors.accent },
  serviceTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  serviceBody: { ...Typography.caption, color: Colors.textSecondary },
  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { ...Typography.caption, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white, fontFamily: 'BeVietnamPro_600SemiBold' },
  locationLayout: { flex: 1, backgroundColor: Colors.surface },
  mapArea: { flex: 1, minHeight: 150 },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  mapEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
  },
  mapEmptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  locationSheet: {
    maxHeight: '62%',
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.mist,
    marginTop: Spacing.sm,
  },
  sheetContent: { padding: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  sheetScroll: { flexShrink: 1 },
  sheetAction: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.cardBg,
  },
  sheetTitle: { ...Typography.h2, color: Colors.textPrimary },
  coordinate: { ...Typography.caption, color: Colors.success },
  mapHint: { ...Typography.caption, color: Colors.textSecondary },
  safety: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  safetyChecked: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
  safetyText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  error: { ...Typography.caption, color: Colors.error },
  errorCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSoft,
  },
  permissionError: { gap: Spacing.sm },
  safetyQuestion: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  safetyQuestionText: { ...Typography.bodyBold, color: Colors.textPrimary },
  answerRow: { flexDirection: 'row', gap: Spacing.sm },
  answer: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  answerSelected: { backgroundColor: Colors.primary },
  answerText: { ...Typography.bodyBold, color: Colors.textSecondary },
  answerTextSelected: { color: Colors.white },
  emergencyCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  emergencyTitle: { ...Typography.bodyBold, color: Colors.error },
  emergencyBody: { ...Typography.caption, color: Colors.textSecondary },
  emergencyButtons: { flexDirection: 'row', gap: Spacing.sm },
  emergencyButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
  },
  emergencyButtonText: { ...Typography.caption, color: Colors.white, fontFamily: 'BeVietnamPro_600SemiBold' },
});
