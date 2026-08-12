import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { LEGAL_VERSION } from '@/src/features/legal/constants';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Chính sách quyền riêng tư</Text>
        <Text style={styles.meta}>Phiên bản {LEGAL_VERSION}</Text>
        <Section title="Dữ liệu được xử lý">Ứng dụng lưu hồ sơ, lịch trình, địa điểm đã lưu, đánh giá, báo cáo, ticket hỗ trợ và lịch sử AI mà bạn chủ động tạo. Vị trí thiết bị chỉ được đọc sau khi bạn cấp quyền để tính khoảng cách và không được lưu liên tục.</Section>
        <Section title="Mục đích">Dữ liệu được dùng để cung cấp chức năng tài khoản, cá nhân hóa gợi ý, lưu lịch trình, hỗ trợ người dùng, bảo vệ hệ thống và cải thiện chất lượng dữ liệu địa điểm.</Section>
        <Section title="Chia sẻ dữ liệu">Lịch trình mặc định là riêng tư. Khi bạn bật chia sẻ, người có liên kết có thể xem nội dung được cho phép và số bình chọn tổng hợp cho đến khi liên kết hết hạn hoặc bị thu hồi. Avatar là nội dung công khai khi xuất hiện cùng đánh giá.</Section>
        <Section title="Dịch vụ xử lý">Supabase xử lý xác thực và dữ liệu ứng dụng; nhà cung cấp bản đồ, định tuyến, thời tiết và AI chỉ nhận dữ liệu cần thiết cho yêu cầu tương ứng. Không gửi khóa bí mật của máy chủ xuống ứng dụng.</Section>
        <Section title="Lưu giữ và xóa">Dữ liệu tồn tại khi tài khoản còn hoạt động hoặc trong thời gian cần thiết để xử lý hỗ trợ, an toàn và nghĩa vụ pháp lý. Bạn có thể xóa từng hội thoại AI và yêu cầu xóa toàn bộ tài khoản trong phần hồ sơ.</Section>
        <Section title="Quyền của bạn">Bạn có thể xem, sửa hoặc xóa nội dung thuộc tài khoản; thu hồi quyền vị trí/ảnh trong cài đặt thiết bị; và gửi yêu cầu liên quan dữ liệu qua mục Hỗ trợ.</Section>
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
