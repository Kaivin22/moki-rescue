import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';
import type { RequestDetails } from '@/src/types/rescue';
import type { ProfileRole } from '@/src/types/profile';
import { statusLabel, statusColor } from '@/src/features/rescue/status';
import { journeyProgress, recentJourneyEvents } from '@/src/features/rescue/services/rescueJourney';

export function RescueJourney({ request, role }: { request: RequestDetails; role: ProfileRole }) {
  const en = useI18n((s) => s.language === 'en'),
    { phase, stopped, complete } = journeyProgress(request.status);
  const labels = en
    ? ['Requested', 'On the way', 'Service', 'Finished']
    : ['Yêu cầu', 'Di chuyển', 'Xử lý', 'Hoàn tất'];
  const icons = ['checkmark', 'navigate-outline', 'construct-outline', 'flag-outline'] as const;
  const price =
    request.currentQuote?.status === 'approved' ? request.currentQuote.amountVnd : request.basePriceVnd;
  const title =
    request.status === 'assigned' && role === 'provider'
      ? en
        ? 'Prepare for departure'
        : 'Chuẩn bị khởi hành'
      : statusLabel(request.status, en ? 'en' : 'vi');
  return (
    <View style={journeyStyles.card}>
      <View style={journeyStyles.metaRow}>
        <Text selectable style={journeyStyles.meta}>
          {en ? 'Case' : 'Ca'} #{request.id.slice(0, 8).toUpperCase()}
        </Text>
        <View style={journeyStyles.badge}>
          <View style={[journeyStyles.smallDot, { backgroundColor: statusColor(request.status) }]} />
          <Text style={[journeyStyles.meta, { color: statusColor(request.status) }]}>
            {complete
              ? en
                ? 'Finished'
                : 'Đã hoàn tất'
              : stopped
                ? en
                  ? 'Stopped'
                  : 'Đã dừng'
                : en
                  ? 'In progress'
                  : 'Đang xử lý'}
          </Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={journeyStyles.title}>
        {title}
      </Text>
      <Text style={journeyStyles.body}>{request.serviceLabel}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: 4, now: phase + 1, text: title }}
        style={journeyStyles.steps}
      >
        {labels.map((label, i) => {
          const done = complete || i < phase;
          const active = !complete && !stopped && i === phase;
          return (
            <View key={label} style={journeyStyles.step}>
              <View style={journeyStyles.rail}>
                {i > 0 && (
                  <View
                    style={[
                      journeyStyles.connector,
                      {
                        left: 0,
                        backgroundColor: i <= phase && !stopped ? Colors.progressComplete : Colors.border,
                      },
                    ]}
                  />
                )}
                {i < 3 && (
                  <View
                    style={[
                      journeyStyles.connector,
                      {
                        right: 0,
                        backgroundColor: i < phase && !stopped ? Colors.progressComplete : Colors.border,
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    journeyStyles.circle,
                    done && journeyStyles.done,
                    active && journeyStyles.current,
                    stopped && i === 0 && journeyStyles.stopped,
                  ]}
                >
                  <Ionicons
                    name={done ? 'checkmark' : stopped && i === 0 ? 'close' : icons[i]}
                    size={16}
                    color={done || active || (stopped && i === 0) ? Colors.cardBg : Colors.textMuted}
                  />
                </View>
              </View>
              <Text style={[journeyStyles.stepText, (done || active) && journeyStyles.stepEmphasis]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      {(price != null ||
        (request.etaMinutes != null && request.routingStatus === 'road' && !stopped && !complete)) && (
        <View style={journeyStyles.metrics}>
          {request.etaMinutes != null && request.routingStatus === 'road' && !stopped && !complete && (
            <View style={journeyStyles.metric}>
              <Text style={journeyStyles.meta}>{en ? 'Arrival time' : 'Thời gian đến'}</Text>
              <Text style={journeyStyles.metricValue}>
                {en ? 'About' : 'Khoảng'} {request.etaMinutes} {en ? 'min' : 'phút'}
              </Text>
            </View>
          )}
          {price != null && (
            <View style={journeyStyles.metric}>
              <Text style={journeyStyles.meta}>
                {request.currentQuote?.status === 'approved'
                  ? en
                    ? 'Approved price'
                    : 'Giá đã duyệt'
                  : en
                    ? 'Base price'
                    : 'Giá cơ bản'}
              </Text>
              <Text style={journeyStyles.metricValue}>{price.toLocaleString(en ? 'en-US' : 'vi-VN')} đ</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function JourneyTimeline({ request, onOpen }: { request: RequestDetails; onOpen: () => void }) {
  const en = useI18n((s) => s.language === 'en'),
    events = recentJourneyEvents(request.events);
  return (
    <View style={journeyStyles.card}>
      <View style={journeyStyles.metaRow}>
        <Text accessibilityRole="header" style={journeyStyles.section}>
          {en ? 'Rescue progress' : 'Tiến độ cứu hộ'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en ? 'View full timeline' : 'Xem toàn bộ tiến độ'}
          onPress={onOpen}
          style={journeyStyles.more}
        >
          <Text style={journeyStyles.moreText}>{en ? 'View all' : 'Xem tất cả'}</Text>
        </Pressable>
      </View>
      {events.length === 0 ? (
        <Text style={journeyStyles.body}>
          {en ? 'No processing events yet.' : 'Chưa có mốc xử lý được ghi nhận.'}
        </Text>
      ) : (
        events.map((event, i) => {
          const latest = i === events.length - 1;
          return (
            <View key={event.createdAt + '-' + i} style={journeyStyles.event}>
              <View style={journeyStyles.eventRail}>
                <View
                  style={[journeyStyles.eventDot, latest && { backgroundColor: statusColor(request.status) }]}
                />
                {!latest && <View style={journeyStyles.eventLine} />}
              </View>
              <View style={journeyStyles.eventBody}>
                <Text style={[journeyStyles.eventTitle, latest && { color: statusColor(request.status) }]}>
                  {statusLabel(event.toStatus, en ? 'en' : 'vi')}
                </Text>
                <Text style={journeyStyles.meta}>
                  {new Date(event.createdAt).toLocaleString(en ? 'en-US' : 'vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
export const journeyStyles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: 24, borderCurve: 'continuous', padding: 20, gap: 12 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  meta: { ...Typography.caption, color: Colors.textMuted },
  badge: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  smallDot: { width: 6, height: 6, borderRadius: 3 },
  title: { ...Typography.h2, color: Colors.textPrimary },
  body: { ...Typography.body, color: Colors.textSecondary },
  steps: { flexDirection: 'row', marginTop: 12, marginHorizontal: -8 },
  step: { flex: 1, minWidth: 0, gap: 8 },
  rail: { height: 32, alignItems: 'center', justifyContent: 'center' },
  connector: { position: 'absolute', height: 2, width: '50%', top: 15 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.cardBg,
  },
  done: { backgroundColor: Colors.progressComplete },
  current: { backgroundColor: Colors.primary },
  stopped: { backgroundColor: Colors.error },
  stepText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  stepEmphasis: { color: Colors.textPrimary },
  metrics: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metric: { flex: 1, minWidth: 120, gap: 4 },
  metricValue: { ...Typography.bodyBold, color: Colors.textPrimary },
  section: { ...Typography.h3, color: Colors.textPrimary },
  more: { minHeight: 44, justifyContent: 'center' },
  moreText: { ...Typography.caption, color: Colors.primary },
  event: { flexDirection: 'row', gap: 12 },
  eventRail: { width: 18, alignItems: 'center' },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.progressComplete,
    marginTop: 4,
  },
  eventLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: Colors.divider, marginTop: 6 },
  eventBody: { flex: 1, gap: 4, paddingBottom: 12 },
  eventTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
});
