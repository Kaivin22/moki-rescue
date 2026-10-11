# Danh mục giao diện Moki Rescue cho Figma

> Cập nhật điều hướng ngày 07/10/2026. Số màn hình được đếm trực tiếp từ `app/`, không tính `_layout.tsx`, ảnh chụp, popup hay biến thể trạng thái. Các bảng frame Figma A–D bên dưới là đề xuất thiết kế lịch sử ngày 24/09, không phải số màn hình hiện tại hoặc bằng chứng đã dựng trên Figma/Stitch.

## Kết luận số lượng

- **58 màn hình điều hướng thực tế** (đếm theo route): gồm màn đăng nhập kiểm thử chỉ mở ở môi trường cho phép; không đồng nghĩa 58 thiết kế độc lập.
- **2 route chỉ khởi động/chuyển hướng**: `app/index.tsx` và `/support/incidents/[id]` (tìm cuộc trao đổi gắn với khiếu nại).
- **60 màn hình ở cấp mã nguồn** nếu tính cả hai route chuyển hướng, không tính `_layout.tsx`.
- `/support` và `/operator/support` dùng chung giao diện danh sách, dữ liệu và quyền khác nhau theo vai trò; không tính là hai thiết kế độc lập.
- 83 frame là số đề xuất Figma của bản cũ, chưa kiểm kê lại sau lần tách này; không dùng để báo cáo số interface đã có.

## Các màn hình tách thêm ngày 07/10/2026 — 12 route

Bổ sung ngày 08/10: `/operator/providers` — danh sách tài khoản cứu hộ viên toàn hệ thống, lọc trạng thái và duyệt/từ chối hồ sơ đang chờ. Tổng điều hướng hiện tại: 48 + 1 = 49. Không có vai trò quản lý đội mới.

| Route | Chức năng riêng |
|---|---|
| `/rescue/[id]/review` | Khách gửi/sửa/xóa đánh giá sau ca hoàn tất; có thể bỏ qua |
| `/rescue/[id]/incidents` | Danh sách khiếu nại thuộc một ca và trạng thái xử lý |
| `/rescue/[id]/incident-new` | Biểu mẫu gửi báo cáo sự cố, chọn loại và mô tả |
| `/rescue/[id]/incidents/[incidentId]` | Nội dung một khiếu nại và kết quả xử lý; admin có thể xử lý |
| `/rescue/[id]/quote` | Chi tiết báo giá hiện tại; liên kết về thao tác ca |
| `/rescue/[id]/timeline` | Lịch sử chuyển trạng thái của ca |
| `/operator/reviews` | Danh sách đánh giá toàn hệ thống, lọc hiển thị/đã ẩn, phân trang |
| `/operator/reviews/[id]` | Xem đánh giá và kiểm duyệt có lý do; không sửa lời khách/số sao |
| `/operator/incidents` | Danh sách khiếu nại toàn hệ thống, lọc trạng thái, phân trang |
| `/operator/incidents/[id]` | Xác minh một khiếu nại, ghi kết quả xử lý/bác bỏ |
| `/operator/quality-alerts` | Danh sách cảnh báo chất lượng, lọc trạng thái, phân trang |
| `/operator/quality-alerts/[id]` | Kiểm tra một cảnh báo và gửi cảnh báo/đóng sau xác minh |

36 màn cũ + 12 màn trên = 48. Trang chi tiết ca dẫn sang các trang con, không nhúng các biểu mẫu đánh giá/khiếu nại nữa. Trang chất lượng đội giữ phần tổng quan và liên kết tới trang kiểm duyệt từng nội dung. Quyền truy cập vẫn do backend kiểm tra, không chỉ ẩn nút trên app.

Mã nguồn có màn hình không đồng nghĩa tất cả đã được chạy thử trên thiết bị. Không thay đổi PRD/SRS trong lần tách này.

## Bổ sung thông báo và hỗ trợ ngày 08/10/2026

| Route | Chức năng |
|---|---|
| `/notifications` | Hộp thông báo, lọc chưa đọc, phân trang |
| `/notifications/[id]` | Đọc nội dung, đánh dấu đã đọc, mở ca/phiếu liên quan |
| `/support` | Người dùng xem phiếu của mình; admin xem hàng đợi |
| `/support/new` | Tạo phiếu vấn đề ứng dụng/tài khoản |
| `/support/[id]` | Trao đổi, ghi chú nội bộ admin, trạng thái và kết quả xử lý |
| `/support/incidents/[id]` | Chỉ chuyển hướng tới phiếu gắn với khiếu nại, không tính giao diện mới |
| `/operator/support` | Lối vào hàng đợi hỗ trợ cho admin, dùng chung trang danh sách |
| `/operator/announcements` | Danh sách thông báo admin đã gửi |
| `/operator/announcements/new` | Soạn, chọn nhóm, xem trước và xác nhận gửi |
| `/operator/announcements/[id]` | Nội dung đã gửi và số hộp thông báo được ghi nhận |

Không dùng số route mới để khẳng định đã kiểm thử giao diện thực tế. Không cập nhật các frame lịch sử bên dưới.

## Bản đề xuất frame lịch sử (24/09/2026)

Con số 83 không có nghĩa là phải tạo 83 route hoặc 83 file code. Một route chi tiết ca phải có nhiều frame vì quyền, nội dung và nút hành động thay đổi theo role/trạng thái. ChatBox là modal toàn cục, không phải route. Không tính các biến thể thuần trang trí như pressed, màu icon hoặc spinner dùng chung để độn số lượng. So với bản 70 frame ngày 22/08, tăng 2 frame đăng nhập và 11 frame quản trị do tách các biểu mẫu thành màn riêng; bản đặc tả Stitch 70 frame trước đây chưa phản ánh lần tách này.

## A. Luồng nghiệp vụ nền tảng — 59 frame

| Nhóm | Route/màn hình | Frame | Biến thể bắt buộc |
|---|---|---:|---|
| Khởi động | `/` | 1 | Splash/loading trước khi redirect |
| Onboarding | `/onboarding` | 3 | Loại sự cố; tuyến đường thật; quyền riêng tư |
| Chọn cách đăng nhập | `/(auth)/login` | 1 | Menu phương thức, không chứa biểu mẫu |
| Đăng nhập SMS | `/(auth)/sms-login` | 2 | Nhập số điện thoại; nhập OTP |
| Đăng nhập kiểm thử | `/(auth)/test-login` | 1 | Email/mật khẩu; chỉ môi trường cho phép |
| Trang chủ | `/(tabs)` | 3 | Khách hàng; cứu hộ viên; admin |
| Tạo yêu cầu | `/(tabs)/request` | 4 | Bước an toàn; chuyển giao khẩn cấp; bước sự cố/xe; bước bản đồ + bottom sheet xác nhận |
| Hoạt động | `/(tabs)/activity` | 2 | Ca đang mở; lịch sử đã kết thúc |
| Vận hành | `/(tabs)/operations` | 3 | Cứu hộ viên; admin theo dõi; admin xử lý ca ngoại lệ và có lối vào quản lý đội |
| Hồ sơ | `/(tabs)/profile` | 2 | Customer; tài khoản nội bộ |
| Cài đặt | `/profile/settings` | 1 | Ngôn ngữ, quyền vị trí, push và dữ liệu |
| Sửa hồ sơ | `/profile/edit` | 1 | Tên hiển thị |
| Xóa tài khoản | `/profile/delete-account` | 1 | Xác nhận phá hủy |
| Quyền riêng tư | `/legal/privacy` | 1 | Nội dung chính sách |
| Điều khoản | `/legal/terms` | 1 | Nội dung điều khoản |
| Menu quản lý | `/operator` | 1 | Lối vào đội, dịch vụ, quyền admin, cảnh báo, nhật ký |
| Danh sách đội | `/operator/teams` | 1 | Danh sách, trạng thái, lối vào tạo và chi tiết đội |
| Tạo đội | `/operator/team-new` | 1 | Biểu mẫu tạo đội với mã hồ sơ nội bộ |
| Chi tiết đội | `/operator/team/[id]` | 1 | Menu cứu hộ viên, năng lực, xác minh, chất lượng |
| Cứu hộ viên | `/operator/team/[id]/providers` | 1 | Danh sách và trạng thái thành viên |
| Thêm cứu hộ viên | `/operator/team/[id]/provider-new` | 1 | Tìm tài khoản OTP, thông tin nghiệp vụ, cấp quyền |
| Năng lực đội | `/operator/team/[id]/capabilities` | 1 | Chọn và lưu dịch vụ đội cung cấp |
| Xác minh đội | `/operator/team/[id]/verification` | 1 | Checklist, tiến độ, người xác minh, kích hoạt |
| Chất lượng đội | `/operator/team/[id]/quality` | 1 | Review, kiểm duyệt và cảnh báo |
| Quyền admin | `/operator/admins` | 1 | Tìm tài khoản, cấp/thu hồi quyền |
| Danh mục quản trị | `/operator/services` | 1 | Danh sách dịch vụ, không nhúng biểu mẫu |
| Sửa dịch vụ | `/operator/service/[code]` | 1 | Biểu mẫu song ngữ của một dịch vụ |
| Hàng đợi cần can thiệp | `/operator/attention` | 1 | Cảnh báo mở, mở chi tiết ca, ghi kết quả và đóng cảnh báo |
| Nhật ký quản trị | `/operator/audit` | 1 | Admin xem audit tối thiểu, phân trang và không lộ dữ liệu nhạy cảm |
| Chi tiết ca - customer | `/rescue/[id]` | 9 | Tìm/đã phát offer/không có đội; đã gán; đang đến; xác nhận đã đến; đã đến/đang chẩn đoán; duyệt báo giá; đang sửa/chở; xác nhận hoàn tất; hoàn tất + review |
| Chi tiết ca - provider | `/rescue/[id]` | 7 | Đã gán/đang đến; chờ khách xác nhận đến; đã đến; chẩn đoán không báo giá; chẩn đoán cần báo giá; đang sửa/chở; chờ khách xác nhận hoàn tất |
| Chi tiết ca - admin | `/rescue/[id]` | 1 | Theo dõi ca hoạt động, cảnh báo và tìm/điều phối lại đội trong cùng frame |
| Chọn điểm giao xe | `/rescue/[id]/destination` | 1 | Khách xác nhận điểm giao cho ca vận chuyển sau chẩn đoán |
| **Tạm tính A** |  | **59** |  |

## B. Giao diện khai thác thêm — 16 frame

| Nhóm | Route/màn hình | Frame | Biến thể bắt buộc |
|---|---|---:|---|
| Danh mục dịch vụ | `/service` | 4 | Danh mục; đang tải; lỗi backend; catalog rỗng |
| Chi tiết dịch vụ | `/service/[code]` | 3 | Dịch vụ cần báo giá; không cần báo giá; mã không tồn tại/đã ngừng |
| Trung tâm trợ giúp | `/help` | 2 | Đã cấu hình hotline; môi trường chưa cấu hình hotline |
| An toàn bên đường | `/help/safety` | 1 | Hướng dẫn và bàn giao 113/114/115 |
| Bảo mật tài khoản | `/profile/security` | 2 | Điện thoại/OTP đã xác minh; trạng thái chưa xác minh |
| Bản đồ ca toàn màn hình | `/rescue/[id]/map` | 4 | Có tuyến đường bộ; chờ vị trí provider; router không khả dụng; ca không tồn tại/không có quyền |
| **Tạm tính B** |  | **16** |  |

## C. Trạng thái production cần thiết kế riêng — 6 frame

Các frame này nằm trên route đã có nhưng làm thay đổi hành động tiếp theo, vì vậy không gom vào component state:

| Mã | Route | Frame |
|---|---|---|
| C01 | `/(auth)/sms-login` | Gửi OTP thất bại/số điện thoại không hợp lệ |
| C02 | `/(auth)/sms-login` | OTP sai, hết hạn hoặc vượt giới hạn thử |
| C03 | `/(tabs)/request` | Catalog dịch vụ không tải được, không cho gửi dữ liệu không xác định |
| C04 | `/(tabs)/request` | Đang xin GPS trước khi hiển thị bản đồ xác nhận |
| C05 | `/(tabs)/request` | Backend từ chối tạo ca: ngoài vùng, rate limit hoặc đã có ca hoạt động |
| C06 | `/(tabs)/operations` | Provider mất/từ chối GPS nên không thể bật sẵn sàng an toàn |
| **Tạm tính C** |  | **6** |

## D. Trợ lý Moki Rescue có giới hạn — 2 frame

| Mã | Bề mặt | Frame |
|---|---|---|
| D01 | Bong bóng nổi + bottom sheet | Mở trợ lý, câu gợi ý, hội thoại trong phiên và trạng thái đang trả lời; không che tab bar/safe area |
| D02 | Bottom sheet | Từ chối câu ngoài app/chẩn đoán xe ở local, cảnh báo khẩn cấp và lỗi quota/upstream rõ ràng |
| **Tạm tính D** |  | **2** |

## Tổng kiểm kê

| Phần | Frame |
|---|---:|
| A. Luồng nghiệp vụ nền tảng | 59 |
| B. Giao diện khai thác thêm | 16 |
| C. Trạng thái production | 6 |
| D. Trợ lý Moki Rescue | 2 |
| **Tổng** | **83** |

## Cấu trúc file Figma đề nghị

1. `00 Foundations`: màu, typography, spacing, icon, safe area, map token.
2. `01 Components`: button, input, card, chip, status badge, map marker/callout, empty/error/loading.
3. `02 Onboarding & Auth`: bootstrap, onboarding, nhập điện thoại, OTP và hai trạng thái lỗi xác thực.
4. `03 Customer`: home, dịch vụ, trợ giúp, tạo yêu cầu, activity, profile, bảo mật và trạng thái chi tiết ca.
5. `04 Provider`: operations, lỗi GPS, bản đồ theo dõi và trạng thái xử lý ca.
6. `05 Admin`: vận hành, đội/phân quyền và trạng thái theo dõi/tìm lại đội.
7. `06 Assistant`: bong bóng nổi, sheet, scope guard, quota và upstream error.
8. `07 Prototype`: happy path, khẩn cấp, không có provider, router lỗi, GPS lỗi và cạnh tranh nhận ca.

## Component variant không tính thành frame riêng

- Button: default, pressed, loading, disabled, destructive.
- Input: empty, focused, filled, invalid, multiline.
- Provider availability: off, locating, online, stale/error khi không đổi luồng.
- Offer card: active, accepting, expired.
- Request card: màu/nhãn của status không tạo thêm frame nếu hành động không đổi.
- Quote: approved, rejected, superseded sau khi đã biểu diễn bước quyết định.
- Review: create/edit dùng chung editor; xác nhận xóa là dialog, không phải màn hình.
- Quality alert: điểm bình thường/cảnh báo nghiêm trọng và review ẩn là state của màn quản trị đội, không tạo route hoặc dashboard doanh thu mới.
- Partner verification: pending/checklist chưa đủ/đủ điều kiện/đã xác minh là state của cùng màn quản trị đội, không tạo trang đăng ký provider công khai hoặc frame riêng.
- Safe area: iOS notch/Dynamic Island và Android camera cutout là constraint của mọi frame, không phải frame riêng.
- Assistant bubble: pressed/open là component state; chỉ hai trạng thái làm thay đổi nội dung/hành động được tính frame.

## Ghi chú thiết kế

- Khách không xem danh sách provider gần đó và không tự chọn provider.
- Bản đồ trước khi gửi chỉ dùng xác nhận/chỉnh điểm nhận cứu hộ.
- Tên, số công việc, đội và phương tiện của provider chỉ xuất hiện sau khi nhận ca; số bị ẩn khi ca đóng.
- Polyline chỉ dùng geometry do router đường bộ trả về; không thiết kế fallback đường thẳng giữa hai marker.
- Catalog dịch vụ lấy từ backend. Figma phải có trạng thái backend lỗi/rỗng, không giả bằng mock data.
- Admin dùng chung hệ thống component với các vai trò khác; quyền quản trị được thể hiện bằng hành động và nhãn rõ ràng, không cần một ngôn ngữ hình ảnh riêng.
- Trợ lý chỉ hỗ trợ cách dùng Moki Rescue/quy trình cứu hộ, không chẩn đoán xe và không giả làm dịch vụ khẩn cấp.
