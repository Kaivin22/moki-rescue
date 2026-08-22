import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    header: 'Điều khoản',
    title: 'Điều khoản sử dụng',
    version: 'Phiên bản',
    sections: [
      [
        'Phạm vi',
        'MotoRescue là hệ thống điều phối cứu hộ kỹ thuật cho xe máy tại vùng đang vận hành. Ứng dụng không phải dịch vụ cấp cứu y tế, công an hoặc bảo hiểm. Khi có người bị thương, cháy nổ hay nguy hiểm tức thời, hãy gọi cơ quan khẩn cấp trước.',
      ],
      [
        'Tài khoản và vai trò',
        'Đăng nhập dùng OTP số điện thoại. Tài khoản công khai luôn là khách hàng. Mỗi cứu hộ viên phải dùng tài khoản riêng đã tự xác thực OTP; admin chỉ cấp quyền sau quy trình hợp tác và xác minh ngoại tuyến. Không chia sẻ mã OTP, mật khẩu hoặc tài khoản đội dùng chung.',
      ],
      [
        'Yêu cầu cứu hộ',
        'Bạn phải gửi vị trí và mô tả trung thực, chỉ tạo một ca đang hoạt động và ở vị trí an toàn. Hệ thống có thể không tìm được đội do vùng phục vụ, năng lực, kết nối hoặc tình trạng đội. ETA tính theo tuyến xe máy khi router khả dụng nhưng không phải cam kết thời gian đến. Số liên hệ công việc chỉ được dùng để phối hợp ca đó.',
      ],
      [
        'Báo giá và thanh toán',
        'Dịch vụ phát sinh phải có báo giá trong ứng dụng và khách chấp thuận trước khi làm. Ứng dụng không giữ ví hoặc xử lý dòng tiền; việc thanh toán bằng tiền mặt hay kênh ngoài hệ thống là giữa khách và đơn vị cứu hộ.',
      ],
      [
        'Xác nhận hai phía',
        'Cứu hộ viên gửi yêu cầu xác nhận khi đến và khi hoàn tất; khách chỉ xác nhận khi sự kiện thực sự xảy ra. Điều phối viên có thể can thiệp khi mất mạng hoặc có tranh chấp, và thao tác quan trọng được ghi audit.',
      ],
      [
        'Đánh giá',
        'Chỉ khách của ca đã hoàn tất mới được đánh giá cứu hộ viên. Đánh giá có thể sửa hoặc xóa; nội dung spam, xúc phạm, tiết lộ dữ liệu cá nhân hoặc gian lận có thể bị ẩn.',
      ],
      [
        'Trợ lý trong ứng dụng',
        'ChatBox chỉ hỗ trợ cách dùng MotoRescue và quy trình trong ứng dụng. Câu trả lời có thể không đầy đủ, không phải chẩn đoán kỹ thuật hay hướng dẫn tự sửa xe, và không thay thế cứu hộ viên hoặc 113/114/115. Không gửi OTP, số điện thoại, tọa độ chính xác hoặc dữ liệu cá nhân không cần thiết vào ChatBox.',
      ],
      [
        'Tạm ngừng',
        'Tài khoản hoặc đội có thể bị tạm ngừng khi nhận ca gian lận, spam, lạm dụng vị trí, nhận trùng, báo giá sai lệch hoặc vi phạm an toàn. Admin phải bàn giao quyền trước khi xóa tài khoản.',
      ],
    ],
  },
  en: {
    header: 'Terms',
    title: 'Terms of use',
    version: 'Version',
    sections: [
      [
        'Scope',
        'MotoRescue coordinates technical motorcycle rescue in its active service area. It is not medical emergency, police, or insurance service. If anyone is injured or there is fire, explosion, or immediate danger, contact emergency services first.',
      ],
      [
        'Accounts and roles',
        'Sign-in uses a phone OTP. Public registration always creates a customer account. Every provider uses an individual account they verified by OTP; an admin grants access only after offline partnership and verification. Never share an OTP, password, or team account.',
      ],
      [
        'Rescue requests',
        'You must provide an honest location and description, keep only one active request, and stay in a safe place. A team may be unavailable because of coverage, capability, connectivity, or capacity. ETA uses motorcycle road routes when routing is available but is not an arrival guarantee. A provider work number may only be used to coordinate that request.',
      ],
      [
        'Quotes and payment',
        'Additional work must be quoted in the app and approved before it starts. The app does not hold a wallet or process money; cash or off-platform payment is between the customer and rescue operator.',
      ],
      [
        'Two-sided confirmation',
        'The provider requests confirmation on arrival and completion; the customer confirms only when the event actually occurs. Dispatch staff may intervene during connectivity problems or disputes, and important actions are audited.',
      ],
      [
        'Reviews',
        'Only the customer of a completed request may review the assigned provider. Reviews can be edited or deleted. Spam, abuse, personal data disclosure, or fraud may be hidden.',
      ],
      [
        'In-app assistant',
        'ChatBox only supports MotoRescue app use and in-app processes. Replies may be incomplete, are not technical diagnosis or self-repair instructions, and do not replace a provider or 113/114/115. Do not send an OTP, phone number, exact coordinates, or unnecessary personal data to ChatBox.',
      ],
      [
        'Suspension',
        'An account or team may be suspended for fraudulent acceptance, spam, location abuse, duplicate acceptance, misleading quotes, or safety violations. An administrator must hand over access before deleting their account.',
      ],
    ],
  },
} as const;

export default function TermsScreen() {
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
