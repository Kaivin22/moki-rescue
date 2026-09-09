# Moki Rescue API

Spring Boot là ranh giới tin cậy duy nhất cho mutation nghiệp vụ. Mobile không được ghi trực tiếp ca, báo giá, đề nghị điều phối hay audit log.

## Trách nhiệm

- Xác minh Supabase JWT qua JWKS và đọc vai trò/trạng thái từ `profiles`.
- Tạo ca idempotent, kiểm tra vùng phục vụ, chống ca song song và rate limit theo database.
- Lọc ứng viên hợp lệ bằng PostGIS, route toàn bộ danh sách theo các lô OSRM Table và xếp hạng ETA đường xe máy.
- Phát đề nghị có TTL, tự hết hạn bằng scheduled job và nhận ca nguyên tử tại PostgreSQL.
- Kiểm tra state machine, optimistic version, xác nhận hai phía và báo giá.
- Nhận GPS chờ ca, lưu vị trí cố định khi phân công, phát push và ghi audit; không theo dõi hành trình trực tiếp.
- Quản lý mạng đối tác khép kín: mã hồ sơ nội bộ, checklist ngoại tuyến, năng lực, cứu hộ viên và quản trị viên vận hành. Chỉ kích hoạt đội khi đủ điều kiện; không lưu tài liệu pháp lý hoặc giấy tờ cá nhân.
- Cung cấp trợ lý Gemini giới hạn trong cách dùng Moki Rescue, lọc input trước model, kiểm output sau model và không lưu nội dung chat.

## API chính

- `/api/me/*`: hồ sơ, push token, yêu cầu xóa tài khoản.
- `/api/catalog/service-types`: danh mục sự cố đang hoạt động theo locale.
- `/api/operator/service-types/*`: admin sửa field catalog được allowlist và ghi audit.
- `/api/requests/*`: tạo/xem/hủy theo giai đoạn, state action, route, quote và review.

Khách được tự hủy trước khi xác nhận đội đã đến. Khi đội đã xuất phát, hệ thống lưu
mã lý do và đánh dấu hủy muộn. Ca mới không có GPS hành trình nên bằng chứng provider gần/không gần là không xác định; không dùng snapshot lúc nhận ca để kết luận vị trí lúc hủy. Từ lần hủy muộn có dấu hiệu lạm dụng thứ ba trong cửa sổ mặc định 30 ngày, việc tạo
ca mới tạm dừng 24 giờ; báo chưa thấy đội không bị tính nếu GPS không xác nhận đội ở gần.
Hệ thống không thu phí và không tự khóa tài khoản. Sau khi đã xác nhận đội đến, khách
phải liên hệ quản trị viên vận hành để dừng ca.
- `/api/provider/*`: sẵn sàng, vị trí, đề nghị và nhận ca.
- `/api/operator/*`: hàng đợi, retry dispatch, tạo/checklist/kích hoạt đội đối tác, phân vai trò, review gần đây và xử lý cảnh báo chất lượng.
- `/api/assistant/message`: trợ lý trong app cho tài khoản active, quota theo phút/ngày.

## Chạy

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

### Integration test PostgreSQL/PostGIS

Test dùng PostgreSQL/PostGIS cài trực tiếp, cluster riêng và database ngẫu nhiên cho từng suite. Cấu hình, guard chống kết nối database thật, lệnh full test/unit test và giới hạn kiểm chứng: [TESTING.md](TESTING.md).

## Database migration

`V3__durable_dispatch_recovery.sql` lưu recovery job cùng transaction khi ca vào
`searching`. Fast path vẫn ghép ca ngay; sau 30 giây worker nhận lại job bị bỏ dở,
dùng lease/`SKIP LOCKED`, retry có backoff và tự xóa job khi ca rời `searching`.
Migration cũng backfill ca đang tìm từ phiên bản cũ. Không chạy migration lên cloud
trước khi staging đã được phê duyệt; file migration cũ giữ nguyên.

`V4__durable_push_outbox.sql` thêm hàng đợi push theo installation. Các mutation ghi
notification trong cùng transaction; worker dùng lease/`SKIP LOCKED` và gửi ngoài
transaction. `PUSH_SEND_MAX_ATTEMPTS`/`PUSH_SEND_INITIAL_BACKOFF` nay áp dụng retry
qua database, không sleep trong request. Offer hết hạn/đã nhận không được gửi lại.
Metadata outbox giữ tối đa hai ngày, không chứa token, GPS hay ghi chú tự do.
Delivery là at-least-once: crash sau khi Expo nhận nhưng trước khi lưu kết quả có
thể gửi lặp cùng `notificationId`; không cam kết exactly-once. Theo dõi bản ghi
`failed`, `expired`, backlog và receipt khi vận hành.

Flyway đọc migration từ `src/main/resources/db/migration`. `B1__initial_schema.sql` là baseline tích lũy cho database PostgreSQL/PostGIS sạch; V2 sửa khóa khi nhận offer, V3 phục hồi điều phối và V4 thêm push outbox. Hiện có V5 gộp vai trò, V6/V7 ghép ca có cấu hình/công bằng, V8 lưu vị trí lúc nhận ca và chặn GPS live. Thay đổi tiếp theo phải dùng V9 trở lên; không sửa migration đã applied.

Migration được chạy như một deployment job bằng database owner riêng:

```powershell
$env:FLYWAY_URL = 'jdbc:postgresql://<host>:5432/postgres?sslmode=require'
$env:FLYWAY_USER = '<migration-owner>'
$env:FLYWAY_PASSWORD = '<database-password>'
.\mvnw.cmd flyway:info
.\mvnw.cmd flyway:migrate
.\mvnw.cmd flyway:validate
```

Auto-migration khi application startup mặc định tắt. Chỉ bật `SPRING_FLYWAY_ENABLED=true` trong một migration job có `SPRING_FLYWAY_URL/USER/PASSWORD` riêng; runtime thường xuyên tiếp tục dùng role ít quyền `motorescue_api`. Xem đầy đủ luồng database mới, legacy baseline, staging và rollback tại [`scripts/README.md`](../scripts/README.md).

`OSRM_MOTORBIKE_BASE_URL` phải trỏ tới dataset đã preprocess bằng profile xe máy được kiểm chứng. Chuỗi `driving` trong URL không tự biến dataset ô tô thành xe máy. Khi router không trả tuyến hợp lệ, API trả trạng thái không khả dụng thay vì bịa Polyline thẳng.

Runtime database phải dùng `SPRING_DATASOURCE_USERNAME=motorescue_api`, không dùng `postgres`. `GEMINI_API_KEY` là secret backend bắt buộc nếu bật trợ lý và không bao giờ dùng prefix `EXPO_PUBLIC_`.

Backend chạy trực tiếp bằng Java 21; xem
[`DEPLOYMENT`](../docs/DEPLOYMENT.md) và [`STAGING_VALIDATION`](../docs/STAGING_VALIDATION.md).
API integration test khởi tạo toàn bộ Spring context, controller/security filter và
runtime JDBC thật; chỉ giả lập JWT decoder. Chữ ký/JWKS/OTP thật vẫn phải test staging.
