# Moki Rescue API

Spring Boot là ranh giới tin cậy duy nhất cho mutation nghiệp vụ. Mobile không được ghi trực tiếp ca, báo giá, đề nghị điều phối hay audit log.

## Trách nhiệm

- Xác minh Supabase JWT qua JWKS và đọc vai trò/trạng thái từ `profiles`.
- Tạo ca idempotent, kiểm tra vùng phục vụ, chống ca song song và rate limit theo database.
- Lọc ứng viên hợp lệ bằng PostGIS, route toàn bộ danh sách theo các lô OSRM Table và xếp hạng ETA đường xe máy.
- Phát đề nghị có TTL, tự hết hạn bằng scheduled job và nhận ca nguyên tử tại PostgreSQL.
- Kiểm tra state machine, optimistic version, xác nhận hai phía và báo giá.
- Nhận checkpoint GPS có giới hạn, phát push và ghi audit cho thao tác nhạy cảm.
- Quản lý mạng đối tác khép kín: mã hồ sơ nội bộ, checklist ngoại tuyến, năng lực, provider và dispatcher. Chỉ kích hoạt đội khi đủ điều kiện; không lưu tài liệu pháp lý hoặc giấy tờ cá nhân.
- Cung cấp trợ lý Gemini giới hạn trong cách dùng Moki Rescue, lọc input trước model, kiểm output sau model và không lưu nội dung chat.

## API chính

- `/api/me/*`: hồ sơ, push token, yêu cầu xóa tài khoản.
- `/api/catalog/service-types`: danh mục sự cố đang hoạt động theo locale.
- `/api/operator/service-types/*`: admin sửa field catalog được allowlist và ghi audit.
- `/api/requests/*`: tạo/xem/hủy theo giai đoạn, state action, route, quote và review.

Khách được tự hủy trước khi xác nhận đội đã đến. Khi đội đã xuất phát, hệ thống lưu
mã lý do, đánh dấu hủy muộn và chỉ lưu kết luận GPS gần/không gần thay vì sao chép tọa
độ. Từ lần hủy muộn có dấu hiệu lạm dụng thứ ba trong cửa sổ mặc định 30 ngày, việc tạo
ca mới tạm dừng 24 giờ; báo chưa thấy đội không bị tính nếu GPS không xác nhận đội ở gần.
Hệ thống không thu phí và không tự khóa tài khoản. Sau khi đã xác nhận đội đến, khách
phải liên hệ điều phối để dừng ca.
- `/api/provider/*`: sẵn sàng, vị trí, đề nghị và nhận ca.
- `/api/operator/*`: hàng đợi, retry dispatch, tạo/checklist/kích hoạt đội đối tác, phân vai trò, review gần đây và xử lý cảnh báo chất lượng.
- `/api/assistant/message`: trợ lý trong app cho tài khoản active, quota theo phút/ngày.

## Chạy

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

### Integration test PostgreSQL/PostGIS

Docker phải đang chạy trước khi thực thi test backend. Testcontainers khởi tạo
`postgis/postgis:16-3.5`, chạy toàn bộ Flyway migration thật rồi kiểm tra các service
trên transaction PostgreSQL thật; không kết nối Supabase cloud và không mock database.
Chỉ các hệ thống ngoài database như OSRM và Expo Push được thay bằng test double.

```powershell
# Toàn bộ test backend, gồm integration test database
.\mvnw.cmd test

# Chỉ migration và nghiệp vụ database
.\mvnw.cmd "-Dtest=DatabaseMigrationIntegrationTest,RescueDatabaseIntegrationTest" test
```

CI kiểm tra Docker trước khi chạy Maven để không thể vô tình bỏ qua integration test
do thiếu Docker daemon.

Từ 05/09/2026, chạy toàn bộ test local cũng **fail** nếu thiếu Docker, không tự skip.
Nếu chỉ muốn chạy unit test, phải chọn rõ `./mvnw "-Dtest=!*IntegrationTest" test`
(Windows: `.\mvnw.cmd "-Dtest=!*IntegrationTest" test`). Kết quả này không thay thế full test.
Test account/push/quota dùng role runtime `motorescue_api`; fixture/migration dùng owner
trong container tạm thời. Không dùng credential hoặc database Supabase thật cho test.

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

Flyway đọc migration từ `src/main/resources/db/migration`. `B1__initial_schema.sql` là baseline tích lũy cho database PostgreSQL/PostGIS sạch; V2 sửa khóa khi nhận offer, V3 phục hồi điều phối và V4 thêm push outbox. Thay đổi tiếp theo phải bắt đầu từ `V5__...` và không sửa file đã applied.

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

Dockerfile multi-stage, Compose và smoke script nằm trong `backend`; xem
[`DEPLOYMENT`](../docs/DEPLOYMENT.md) và [`STAGING_VALIDATION`](../docs/STAGING_VALIDATION.md).
API integration test khởi tạo toàn bộ Spring context, controller/security filter và
runtime JDBC thật; chỉ giả lập JWT decoder. Chữ ký/JWKS/OTP thật vẫn phải test staging.
