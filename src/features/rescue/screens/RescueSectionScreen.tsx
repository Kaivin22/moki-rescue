import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { OperatorPage } from '@/src/features/operator/OperatorPage';
import { ReviewPanel } from '../components/details/ReviewPanel';
import { IncidentPanel } from '../components/details/IncidentPanel';
import { RescueTimeline } from '../components/details/RescueTimeline';
import { RescueQuoteCard } from '../components/details/RescueQuoteCard';
import { useRescueDetailsCopy } from '../components/details/rescueDetailsCopy';
import { rescueDetailsStyles as styles } from '../components/details/rescueDetailsStyles';
import { useRequest } from '../hooks/useRescueQueries';
import { getRescuePermissions } from '../hooks/useRescuePermissions';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/stores/authStore';

export type RescueSection = 'review' | 'incidents' | 'incident-new' | 'incident' | 'timeline' | 'quote';
const TITLES = {
  review: ['Đánh giá ca cứu hộ', 'Review rescue case'],
  incidents: ['Khiếu nại của ca', 'Case reports'],
  'incident-new': ['Gửi khiếu nại / báo sự cố', 'Submit complaint / incident'],
  incident: ['Chi tiết và kết quả khiếu nại', 'Report and resolution'],
  timeline: ['Lịch sử xử lý ca', 'Case timeline'],
  quote: ['Chi tiết báo giá', 'Quote details'],
} as const;

export function RescueSectionScreen({ section }: { section: RescueSection }) {
  const { id = '', incidentId = '' } = useLocalSearchParams<{ id: string; incidentId?: string }>();
  const query = useRequest(id);
  const request = query.data;
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role ?? 'customer';
  const permissions = getRescuePermissions(role, profile?.id, request);
  const en = useI18n((s) => s.language === 'en');
  const c = useRescueDetailsCopy();
  const incidents = section === 'incidents' || section === 'incident-new' || section === 'incident';
  const allowed =
    section === 'review'
      ? permissions.showReview
      : incidents
        ? permissions.showIncident && (section !== 'incident-new' || role === 'customer')
        : true;
  const backToCase = () => router.replace(`/rescue/${id}`);
  return (
    <OperatorPage title={TITLES[section][en ? 1 : 0]} fallback={`/rescue/${id}`}>
      {query.isLoading && <ActivityIndicator />}
      {query.isError && (
        <>
          <Text style={styles.error}>{c.loadError}</Text>
          <AppButton title={en ? 'Retry' : 'Thử lại'} onPress={() => void query.refetch()} />
        </>
      )}
      {request && !allowed && (
        <Text style={styles.infoLabel}>
          {en
            ? 'This section is not available for your role or the current case status.'
            : 'Vai trò hoặc trạng thái ca hiện tại không cho phép sử dụng mục này.'}
        </Text>
      )}
      {request && allowed && (
        <>
          <Text style={styles.infoValue}>
            {request.serviceLabel} · {request.pickupAreaLabel}
          </Text>
          {section === 'review' && (
            <>
              <Text style={styles.infoLabel}>
                {en
                  ? 'Reviewing is optional. Skipping does not affect case completion or future requests.'
                  : 'Đánh giá là tùy chọn. Bỏ qua không ảnh hưởng việc hoàn thành ca hoặc yêu cầu cứu hộ sau này.'}
              </Text>
              <ReviewPanel key={`${id}:${request.review?.updatedAt ?? 'new'}`} request={request} />
              {request.review && (
                <Text style={styles.infoLabel}>
                  {en
                    ? 'Your review is saved. You may edit or delete it within the allowed period.'
                    : 'Đánh giá của bạn đã được lưu. Bạn có thể sửa hoặc xóa trong thời hạn cho phép.'}
                </Text>
              )}
              <AppButton
                title={en ? 'Skip / return to case' : 'Bỏ qua / quay lại ca'}
                variant="ghost"
                onPress={backToCase}
              />
            </>
          )}
          {section === 'timeline' && <RescueTimeline events={request.events} />}
          {section === 'quote' && (
            <>
              {request.currentQuote ? (
                <RescueQuoteCard quote={request.currentQuote} />
              ) : (
                <Text style={styles.infoLabel}>
                  {en ? 'No quote has been submitted.' : 'Ca này chưa có báo giá.'}
                </Text>
              )}
              <Text style={styles.infoLabel}>
                {en
                  ? 'Approval and rejection remain in the case action area, using the latest case status.'
                  : 'Thao tác chấp nhận/từ chối nằm ở phần xử lý ca và sử dụng trạng thái ca mới nhất.'}
              </Text>
              <AppButton title={en ? 'Return to case actions' : 'Về phần xử lý ca'} onPress={backToCase} />
            </>
          )}
          {section === 'incidents' && (
            <>
              <Text style={styles.infoLabel}>{c.incidentIntro}</Text>
              {role === 'customer' && (
                <AppButton
                  title={c.reportIncident}
                  onPress={() => router.push(`/rescue/${id}/incident-new` as Href)}
                />
              )}
              {!request.incidentReports.length && (
                <Text style={styles.infoLabel}>
                  {en ? 'No reports for this case.' : 'Chưa có khiếu nại hoặc báo sự cố cho ca này.'}
                </Text>
              )}
              {request.incidentReports.map((report) => (
                <NavigationCard
                  key={report.id}
                  title={c.incidentCategories[report.category]}
                  description={`${c.incidentStatuses[report.status]} · ${new Date(report.createdAt).toLocaleString(en ? 'en-US' : 'vi-VN')}`}
                  icon="flag-outline"
                  onPress={() => router.push(`/rescue/${id}/incidents/${report.id}` as Href)}
                />
              ))}
            </>
          )}
          {section === 'incident-new' && (
            <IncidentPanel
              key={id}
              request={request}
              role={role}
              mode="create"
              onSubmitted={() => router.replace(`/rescue/${id}/incidents` as Href)}
            />
          )}
          {section === 'incident' &&
            (request.incidentReports.some((report) => report.id === incidentId) ? (
              <IncidentPanel
                key={incidentId}
                request={request}
                role={role}
                mode="detail"
                incidentId={incidentId}
              />
            ) : (
              <Text style={styles.error}>
                {en ? 'Report not found in this case.' : 'Không tìm thấy khiếu nại thuộc ca này.'}
              </Text>
            ))}
        </>
      )}
    </OperatorPage>
  );
}
