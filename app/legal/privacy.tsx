import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    header: 'Quyền riêng tư',
    title: 'Chính sách quyền riêng tư',
    version: 'Phiên bản',
    sections: [
      [
        'Dữ liệu tối thiểu',
        'Hồ sơ ứng dụng chỉ lưu tên hiển thị, vai trò, ngôn ngữ và trạng thái tài khoản. Số điện thoại nằm trong Supabase Auth để xác minh OTP. Khách hàng không phải cung cấp CCCD, giấy phép lái xe, danh bạ hoặc thông tin thanh toán.',
      ],
      [
        'Vị trí',
        'Vị trí chính xác của khách chỉ được gửi khi khách chủ động tạo yêu cầu. Vị trí cứu hộ viên chỉ cập nhật khi sẵn sàng hoặc đang xử lý ca. Chỉ khách, cứu hộ viên được phân công và điều phối viên được xem vị trí ca tương ứng. Checkpoint vị trí được xóa tự động theo thời hạn vận hành.',
      ],
      [
        'Đối tác cứu hộ',
        'Đơn vị vận hành đối chiếu hợp tác và nhân sự ngoại tuyến. Database chỉ lưu mã hồ sơ đối tác nội bộ, kết quả checklist, người/thời điểm xác minh, đội, năng lực, trạng thái và số liên hệ công việc đã duyệt; không lưu hợp đồng, số hoặc ảnh giấy tờ cá nhân. Số công việc chỉ hiển thị trong ca đang hoạt động.',
      ],
      [
        'Mục đích và bên xử lý',
        'Dữ liệu được dùng để xác thực, tìm đội phù hợp, tính tuyến đường, cập nhật trạng thái, báo giá, chống nhận trùng và giải quyết tranh chấp. Supabase xử lý xác thực/dữ liệu; nhà cung cấp bản đồ và định tuyến nhận tọa độ cần thiết để tính tuyến.',
      ],
      [
        'Trợ lý Moki Rescue',
        'Khi bạn hỏi cách dùng ứng dụng hoặc quy trình cứu hộ, backend gửi câu hỏi tới Gemini để tạo câu trả lời. Câu ngoài phạm vi, chẩn đoán xe và tình huống khẩn cấp được xử lý cục bộ trước khi gọi Gemini. Moki Rescue không lưu câu hỏi, câu trả lời hoặc lịch sử ChatBox; chỉ lưu mã tài khoản và thời điểm dùng quota tối đa 2 ngày.',
      ],
      [
        'Chia sẻ',
        'Vị trí và nội dung ca không công khai. Đội chỉ thấy khu vực gần đúng trước khi nhận; cứu hộ viên trúng ca mới nhận vị trí chính xác. Moki Rescue không bán dữ liệu cá nhân hoặc dùng hồ sơ cứu hộ để quảng cáo.',
      ],
      [
        'Lưu giữ và xóa',
        'Vết vị trí tạm thời được xóa theo job lưu giữ. Yêu cầu đã đóng được giảm chi tiết hoặc ẩn danh sau thời hạn giải quyết khiếu nại. Bạn có thể yêu cầu xóa tài khoản trong Cài đặt khi không còn ca hoạt động; audit tối thiểu có thể được giữ để chống gian lận hoặc tuân thủ pháp luật.',
      ],
      [
        'Quyền của bạn',
        'Bạn có thể xem và sửa tên hiển thị, thu hồi quyền vị trí trong cài đặt hệ thống, xem lịch sử ca và yêu cầu xóa tài khoản. Thu hồi vị trí sẽ làm chức năng tạo/nhận cứu hộ không hoạt động.',
      ],
    ],
  },
  en: {
    header: 'Privacy',
    title: 'Privacy policy',
    version: 'Version',
    sections: [
      [
        'Minimal data',
        'The app profile stores only a display name, role, language, and account status. The phone number stays in Supabase Auth for OTP verification. Customers do not provide a national ID, driver license, contacts, or payment information.',
      ],
      [
        'Location',
        "A customer's exact location is sent only when they actively create a request. A provider location is updated only while available or handling a request. Only the customer, assigned provider, and dispatch staff can see the corresponding request location. Location checkpoints are automatically deleted after the operational retention period.",
      ],
      [
        'Rescue partners',
        'The operator checks partnership and personnel offline. The database stores only an internal partner file code, checklist results, verifier/time, team, capabilities, status, and an approved work number; it stores no contract, identity-document number, or document image. The work number is visible only during an active request.',
      ],
      [
        'Purpose and processors',
        'Data is used to authenticate users, find a suitable team, calculate road routes, update status, handle quotes, prevent duplicate acceptance, and resolve disputes. Supabase processes authentication and data. Map and routing providers receive coordinates required for route calculation.',
      ],
      [
        'Moki Rescue assistant',
        'When you ask how to use the app or its rescue process, the backend sends the question to Gemini to generate a reply. Off-topic questions, vehicle diagnosis requests, and emergencies are handled locally before any Gemini call. Moki Rescue does not store questions, replies, or ChatBox history; only the account ID and quota-use timestamp are retained for at most two days.',
      ],
      [
        'Sharing',
        'Request location and content are not public. Teams see only an approximate area before acceptance; only the assigned provider receives the exact location. Moki Rescue does not sell personal data or use rescue profiles for advertising.',
      ],
      [
        'Retention and deletion',
        'Temporary location traces are removed by retention jobs. Closed requests are minimized or anonymized after the dispute period. You may request account deletion in Settings when no request is active. Minimal audit records may be retained to prevent fraud or comply with law.',
      ],
      [
        'Your controls',
        'You can view and edit your display name, revoke location permission in system settings, view request history, and request account deletion. Revoking location disables creating or accepting rescue requests.',
      ],
    ],
  },
} as const;

export default function PrivacyScreen() {
  const c = useCopy(COPY);
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.header} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.meta}>
          {c.version} {LEGAL_VERSION}
        </Text>
        {c.sections.map(([title, body]) => (
          <Section key={title} title={title}>
            {body}
          </Section>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { ...Typography.h1, color: Colors.textPrimary },
  meta: { ...Typography.caption, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md },
  heading: { ...Typography.h3, color: Colors.primary, marginTop: Spacing.md },
  body: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
});
