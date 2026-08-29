# Danh mục giao diện Moki Rescue cho Figma

> Rà soát ngày 22/08/2026. Danh mục được suy ra từ toàn bộ route trong `app/`, không tính `_layout.tsx` là màn hình. Chỉ trạng thái làm thay đổi quyết định hoặc hành động của người dùng mới được tách thành frame.

## Kết luận số lượng

- **23 màn hình điều hướng thực tế**: người dùng có thể tới bằng route.
- **1 màn hình khởi động/điều hướng** tại `app/index.tsx`.
- **24 màn hình ở cấp mã nguồn** nếu tính cả màn hình khởi động.
- **70 frame Figma nghiệp vụ** nếu thể hiện đủ vai trò, trạng thái ca, trợ lý và lỗi production quan trọng.

Con số 70 không có nghĩa là phải tạo 70 route hoặc 70 file code. Một route chi tiết ca phải có nhiều frame vì quyền, nội dung và nút hành động thay đổi theo role/trạng thái. ChatBox là modal toàn cục, không phải route. Không tính các biến thể thuần trang trí như pressed, màu icon hoặc spinner dùng chung để độn số lượng.

## A. Luồng nghiệp vụ nền tảng — 46 frame

| Nhóm | Route/màn hình | Frame | Biến thể bắt buộc |
|---|---|---:|---|
| Khởi động | `/` | 1 | Splash/loading trước khi redirect |
| Onboarding | `/onboarding` | 3 | Loại sự cố; tuyến đường thật; quyền riêng tư |
| Đăng nhập | `/(auth)/login` | 2 | Nhập số điện thoại; nhập OTP |
| Trang chủ | `/(tabs)` | 3 | Customer; provider; dispatcher/admin |
| Tạo yêu cầu | `/(tabs)/request` | 4 | Bước an toàn; chuyển giao khẩn cấp; bước sự cố/xe; bước bản đồ + bottom sheet xác nhận |
| Hoạt động | `/(tabs)/activity` | 2 | Ca đang mở; lịch sử đã kết thúc |
| Vận hành | `/(tabs)/operations` | 3 | Provider; dispatcher; admin có lối vào quản lý đội |
| Hồ sơ | `/(tabs)/profile` | 2 | Customer; tài khoản nội bộ |
| Cài đặt | `/profile/settings` | 1 | Ngôn ngữ, quyền vị trí, push và dữ liệu |
| Sửa hồ sơ | `/profile/edit` | 1 | Tên hiển thị |
| Xóa tài khoản | `/profile/delete-account` | 1 | Xác nhận phá hủy |
| Quyền riêng tư | `/legal/privacy` | 1 | Nội dung chính sách |
| Điều khoản | `/legal/terms` | 1 | Nội dung điều khoản |
| Đội, quyền, chất lượng và catalog | `/operator/teams` | 1 | Tạo đội với mã hồ sơ nội bộ, cấp tài khoản OTP, capability, checklist/tiến độ/người xác minh, kích hoạt hoặc đình chỉ, điểm thật/review/cảnh báo, quyền dispatcher và catalog song ngữ |
| Hàng đợi cần can thiệp | `/operator/attention` | 1 | Cảnh báo mở, mở chi tiết ca, ghi kết quả và đóng cảnh báo |
| Nhật ký quản trị | `/operator/audit` | 1 | Admin xem audit tối thiểu, phân trang và không lộ dữ liệu nhạy cảm |
| Chi tiết ca - customer | `/rescue/[id]` | 9 | Tìm/đã phát offer/không có đội; đã gán; đang đến; xác nhận đã đến; đã đến/đang chẩn đoán; duyệt báo giá; đang sửa/chở; xác nhận hoàn tất; hoàn tất + review |
| Chi tiết ca - provider | `/rescue/[id]` | 7 | Đã gán/đang đến; chờ khách xác nhận đến; đã đến; chẩn đoán không báo giá; chẩn đoán cần báo giá; đang sửa/chở; chờ khách xác nhận hoàn tất |
| Chi tiết ca - staff | `/rescue/[id]` | 1 | Theo dõi ca hoạt động, cảnh báo và tìm/điều phối lại đội trong cùng frame |
| Chọn điểm giao xe | `/rescue/[id]/destination` | 1 | Khách xác nhận điểm giao cho ca vận chuyển sau chẩn đoán |
| **Tạm tính A** |  | **46** |  |

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
| C01 | `/(auth)/login` | Gửi OTP thất bại/số điện thoại không hợp lệ |
| C02 | `/(auth)/login` | OTP sai, hết hạn hoặc vượt giới hạn thử |
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
| A. Luồng nghiệp vụ nền tảng | 46 |
| B. Giao diện khai thác thêm | 16 |
| C. Trạng thái production | 6 |
| D. Trợ lý Moki Rescue | 2 |
| **Tổng** | **70** |

## Cấu trúc file Figma đề nghị

1. `00 Foundations`: màu, typography, spacing, icon, safe area, map token.
2. `01 Components`: button, input, card, chip, status badge, map marker/callout, empty/error/loading.
3. `02 Onboarding & Auth`: bootstrap, onboarding, nhập điện thoại, OTP và hai trạng thái lỗi xác thực.
4. `03 Customer`: home, dịch vụ, trợ giúp, tạo yêu cầu, activity, profile, bảo mật và trạng thái chi tiết ca.
5. `04 Provider`: operations, lỗi GPS, bản đồ theo dõi và trạng thái xử lý ca.
6. `05 Dispatcher & Admin`: operations, đội/phân quyền và trạng thái theo dõi/tìm lại đội.
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
- Dispatcher và admin dùng cùng hệ thống component; admin chỉ có thêm quyền quản trị, không cần một visual language khác.
- Trợ lý chỉ hỗ trợ cách dùng Moki Rescue/quy trình cứu hộ, không chẩn đoán xe và không giả làm dịch vụ khẩn cấp.
