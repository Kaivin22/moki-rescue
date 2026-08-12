import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { LEGAL_VERSION } from '@/src/features/legal/constants';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Điều khoản sử dụng</Text>
        <Text style={styles.meta}>Phiên bản {LEGAL_VERSION}</Text>
        <Section title="Phạm vi dịch vụ">Ứng dụng hỗ trợ khám phá và lập lịch trình du lịch. Thông tin địa điểm, thời tiết, đường đi và nội dung AI có thể thay đổi; người dùng cần kiểm tra nguồn chính thức trước khi di chuyển.</Section>
        <Section title="Tài khoản">Bạn chịu trách nhiệm bảo mật tài khoản và cung cấp thông tin hợp lệ. Không được lạm dụng, gây quá tải, can thiệp quyền truy cập hoặc đăng nội dung trái pháp luật.</Section>
        <Section title="Nội dung đóng góp">Đánh giá, báo cáo và nội dung do bạn gửi phải trung thực và không xâm phạm quyền của bên khác. Nội dung có thể được ẩn hoặc xóa khi vi phạm quy tắc cộng đồng hoặc pháp luật.</Section>
        <Section title="AI và lịch trình">Gợi ý AI và tối ưu tuyến chỉ mang tính hỗ trợ, không phải cam kết về an toàn, thời tiết, giờ mở cửa hoặc khả năng tiếp cận. Không nhập dữ liệu nhạy cảm vào hội thoại AI.</Section>
        <Section title="Tạm ngừng và chấm dứt">Tài khoản có thể bị hạn chế khi có hành vi gian lận, phá hoại hoặc vi phạm điều khoản. Bạn có thể xóa tài khoản trong phần chỉnh sửa hồ sơ.</Section>
        <Section title="Liên hệ">Nếu cần hỗ trợ hoặc muốn khiếu nại dữ liệu, hãy tạo ticket trong mục Hỗ trợ của ứng dụng.</Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{children}</Text></>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  title: { ...Typography.h1, color: Colors.primary },
  meta: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  heading: { ...Typography.h3, color: Colors.primaryDark, marginTop: Spacing.md, marginBottom: Spacing.xs },
  body: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
});
