# Audit hardcode, mock data và độ sạch code

> Rà soát ngày 22/08/2026. Phạm vi gồm mobile, Spring backend, SQL, test và cấu hình. Theo yêu cầu, cấu hình Supabase và dữ liệu người dùng thật không bị xem là mock.

## Kết luận hiện tại

- Runtime không có mock user, đội, cứu hộ viên, ca, GPS, route, báo giá hoặc review.
- Khi backend/router lỗi, app hiển thị trạng thái lỗi/rỗng; không thay bằng card giả, ETA Haversine hay polyline đường chim bay.
- Sáu `service_types` trong `01_schema.sql` là catalog khởi tạo chính thức của sản phẩm. Admin có thể sửa nội dung vi/en, icon allowlist, thứ tự, chính sách báo giá và bật/tắt qua API có authorization + audit; mã dịch vụ không đổi.
- Sáu `team_verification_requirements` là checklist chính sách baseline, không phải dữ liệu đội giả. Kết quả theo từng đối tác đến từ admin/backend; production không seed trạng thái completed.
- Gemini vẫn là chức năng production của ChatBox. Key chỉ ở backend; mobile không gọi Google trực tiếp và không có fallback câu trả lời giả.
- Fixture chỉ nằm trong `__tests__/` và `backend/src/test/`, không được import vào runtime.
- `.env.example` chỉ chứa tên biến và placeholder. `.env`, keystore, private key và output build bị ignore.

## Hardcode đã loại bỏ hoặc gom lại

| Vấn đề | Cách xử lý |
|---|---|
| 113/114/115 lặp ở nhiều màn hình | Gom số và URI gọi vào `src/features/safety/emergencyContacts.ts`; nhãn vi/en nằm ở copy giao diện |
| Chu kỳ API/refetch/GPS rải rác | Gom vào `src/features/rescue/config/operational.ts`; ngưỡng backend có environment override và clamp |
| UUID idempotency dùng `Math.random()` fallback | Dùng `expo-crypto.randomUUID()` |
| Token push chỉ định danh bằng Expo token | Thêm `installation_id`, khóa giao dịch và ràng buộc unique; logout chỉ xóa đúng user/token/installation |
| Catalog chỉ sửa bằng SQL | Thêm giao diện admin giới hạn field, API role admin và audit log |
| Locale đổi nhưng cache giữ label cũ | Invalidate toàn bộ query rescue sau khi cập nhật locale |
| Consent chỉ kiểm timestamp | Mobile và backend đều kiểm đúng `LEGAL_VERSION`/`TERMS_VERSION` |
| Log router có thể chứa URL tọa độ | Chỉ log loại exception, không log message/URL |
| Cấp quyền có thể ghi đè vai trò đặc biệt | Khóa profile và chặn đổi trực tiếp admin/provider qua thao tác dispatcher/provider |
| Thêm provider ghi đè capability của cả đội | Tách endpoint/giao diện năng lực đội khỏi thao tác cấp quyền cứu hộ viên |
| Admin phải sao chép UUID tài khoản | Tra đúng số điện thoại đăng nhập qua hàm tối thiểu chỉ backend được gọi; UI không nhận lại số điện thoại |
| Đội có thể được verify ngay sau khi tạo | Buộc mã hồ sơ nội bộ + checklist bắt buộc + capability + provider active; lưu admin/thời điểm xác minh và audit |
| GPS provider có thể thiếu `accuracy` | Client bỏ điểm thiếu/sai định dạng; API và checkpoint SQL bắt buộc accuracy; matching kiểm ngưỡng lần nữa |
| Shortlist đường chim bay có thể bỏ sót provider nhanh hơn | Route toàn bộ ứng viên hợp lệ theo các lô OSRM rồi xếp hạng ETA thực tế |
| Copy vi/en và status team không đồng nhất | Runtime UI, backend catalog, API error mapping và push đã có vi/en |
| Nhiều file TSX nén thành dòng rất dài | Thêm Prettier, `format:check` và gate CI; TypeScript strict + no-unused vẫn bật |
| Dependency `concurrently` không dùng | Đã gỡ khỏi package/lockfile |

## Hardcode được giữ có chủ đích

| Nhóm | Lý do |
|---|---|
| Design tokens, font, spacing, motion | Là hệ thiết kế được version cùng binary |
| State/action graph và enum domain | Là luật toàn vẹn cần code review, test và deploy đồng bộ với SQL trigger |
| 113/114/115 | Hằng số an toàn quốc gia, phải dùng được khi backend lỗi |
| Validation bounds | Lớp phòng thủ API/database, không phải dữ liệu demo |
| Storage key, background task name, Realtime topic prefix | Namespace kỹ thuật phải ổn định qua phiên bản |
| `LEGAL_VERSION` và default `TERMS_VERSION` | Mốc release; production phải đặt cùng giá trị ở app/backend |
| Onboarding/help/safety/legal copy | Nội dung cần offline và duyệt cùng release; không tải layout hoặc JavaScript động |
| Danh sách icon catalog được phép | Ngăn admin nhập icon không tồn tại; mở rộng bằng release có kiểm thử |
| Sáu mã service baseline | Contract ổn định cho request/capability; nội dung và active state đã server-driven |
| Sáu mã requirement xác minh đối tác | Chính sách integrity/audit ổn định; nhãn/mô tả nằm trong database, không phải team/provider mock |
| 24 giờ checkpoint, 30 ngày làm mờ ca, 2 ngày quota | Default privacy có kiểm soát; cron và hàm SQL giới hạn phạm vi thay đổi |
| Placeholder `0901234567`, `MR-DN-2026-0001`, tên xe | Chỉ hướng dẫn định dạng trường nhập, không tự submit và không tạo dữ liệu |

## Cấu hình môi trường, không phải hardcode runtime

Các giá trị sau đi qua `.env`/Spring configuration: Supabase, API origin, EAS project, Maps key, hotline, database login, OSRM URL/profile/snap radius/table batch, vùng phục vụ, offer TTL, GPS freshness/accuracy, rate limit, ngưỡng/cỡ mẫu/nhịp cảnh báo chất lượng, CORS, Expo Push, Gemini model/key/quota và `TERMS_VERSION`.

Production Expo config fail-fast khi thiếu public config bắt buộc hoặc dùng URL không phải HTTPS/localhost. Backend secret không có prefix `EXPO_PUBLIC_` và không được đưa vào Expo `extra`.

## Giới hạn còn lại — không được gọi là mock

- Router xe máy, Supabase OTP/Realtime, Expo Push credential, cron và đối tác thật là external gate; source code không thể chứng minh chúng đã vận hành.
- Push receipt bất đồng bộ để tự vô hiệu token `DeviceNotRegistered` chưa triển khai; cần trước khi có lượng thiết bị lớn.
- Help/legal vẫn bundle trong binary. Chỉ xây content service versioned khi đơn vị vận hành thật cần sửa thường xuyên; không xây CMS tổng quát cho MVP.
- Dữ liệu demo bảo vệ phải nằm ở Supabase staging riêng và được gắn nhãn demo, không đưa vào schema production.

## Quy tắc chống tái phát

- Không thêm fallback array cho team/provider/request/service khi API lỗi.
- Không thêm Haversine/Polyline thẳng làm route hoặc ETA cuối.
- Không thêm secret vào `EXPO_PUBLIC_*`, Expo config, log, fixture hay tài liệu.
- Business mutation mới phải có validation, authorization, transaction/optimistic version phù hợp và audit.
- Nội dung server-driven mới phải có schema/field allowlist; không tải code hoặc layout động.
- PR/commit phải qua format, lint, typecheck, Jest, Maven, Expo package/config và secret scan.
