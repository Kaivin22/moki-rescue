# Moki Rescue API

Spring Boot là ranh giới tin cậy duy nhất cho mutation nghiệp vụ. Mobile không được ghi trực tiếp ca, báo giá, đề nghị điều phối hay audit log.

## Trách nhiệm

- Xác minh Supabase JWT qua JWKS và đọc vai trò/trạng thái từ `profiles`.
- Tạo ca idempotent, kiểm tra vùng phục vụ, chống ca song song và rate limit theo database.
- Lọc ứng viên hợp lệ bằng PostGIS, route toàn bộ danh sách theo các lô OSRM Table và xếp hạng ETA đường xe máy.
- Phát đề nghị có TTL, tự hết hạn bằng scheduled job và nhận ca nguyên tử tại PostgreSQL.
- Kiểm tra state machine, optimistic version, xác nhận hai phía và báo giá.
- Dùng tọa độ cửa hàng để ghép ca/tính ETA, lưu điểm xuất phát cố định khi phân công, phát push và ghi audit; không nhận GPS chờ ca hoặc theo dõi hành trình trực tiếp.
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
- `/api/provider/*`: sẵn sàng xuất phát từ cửa hàng, thống kê cá nhân, đề nghị và nhận ca. Hai endpoint GPS cũ trả 410 để app cũ dừng gửi.
- `/api/operator/*`: hàng đợi, retry dispatch, tạo/checklist/kích hoạt đội đối tác, phân vai trò, review gần đây và xử lý cảnh báo chất lượng.
- `/api/assistant/message`: trợ lý trong app cho tài khoản active, quota theo phút/ngày.

### Cửa hàng, duyệt cứu hộ viên và quyền riêng tư (V10)

Giữ ba vai trò `customer/provider/admin`, không có quản lý đội. Cửa hàng là đơn vị tổ chức/điểm xuất phát, không phải tài khoản đăng nhập. Mỗi thành viên có trạng thái sẵn sàng, lịch sử, số ca hoàn thành và điểm ưu tiên riêng. API thống kê và danh sách ca của provider lấy ID từ JWT; không mở danh sách/ca của đồng nghiệp cùng đội.

| API | Quyền và nội dung |
|---|---|
| `GET /api/provider/statistics` | Provider: `completedCases`, `activeCases`, `cancelledCases`, `rating` chỉ của bản thân, toàn bộ dữ liệu còn lưu. Ca bị rút phân công không còn tính như ca được giao; không phải doanh thu/lợi nhuận |
| `PUT /api/provider/availability` | Body `{ "available": true/false }`. Không cần GPS; bật phải có thành viên active, đội verified, tọa độ cửa hàng trong vùng và không có ca đang làm |
| `GET /api/operator/providers` | Chỉ admin: mọi tài khoản provider, gồm `unassigned` khi chưa có membership. Không nhầm 12 cửa hàng seed với 12 tài khoản |
| `POST /api/operator/providers/{providerId}/review` | Chỉ admin, body `{ "decision": "active" }` hoặc `rejected`. Chỉ quyết định hồ sơ pending, ghi audit, trả 409 nếu đã bị người khác xử lý |
| `PUT /api/operator/teams/{teamId}/location` | Chỉ admin, body `{ "latitude": 16.061, "longitude": 108.2238 }`. Chặn ngoài vùng và khi đội đang sẵn sàng/có ca hoặc đề nghị mở |

Admin thêm/gắn thành viên bằng API hiện có sẽ tạo hồ sơ `pending`; duyệt provider và xác minh cửa hàng là hai việc riêng. Các thành viên active cũ không bị chuyển về pending khi nâng cấp. File SQL thủ công và thứ tự chạy nằm trong [scripts/README.md](../scripts/README.md); không chạy lại init trên database đang có dữ liệu.

## Kết thúc ca và xử lý ngoại lệ

Luồng bình thường: cứu hộ viên gửi `request_completion` khi sửa/giao xe xong,
ca chuyển sang `awaiting_completion`. Khách gửi `confirm_completion` để kết thúc,
hoặc `reject_repair` / `reject_transport` kèm lý do để quay lại công việc.
GPS, ETA và việc mở Google Maps không phải bằng chứng công việc đã hoàn tất.

Quá hạn xác nhận (mặc định 15 phút, cấu hình `app.case-lifecycle.completion-confirmation-timeout`)
chỉ tạo cảnh báo vận hành; không tự chuyển ca thành hoàn thành.

`POST /api/operator/requests/{requestId}/resolution` chỉ dành cho admin:

```json
{
  "decision": "verified_completed",
  "note": "Đã liên hệ và đối chiếu kết quả thực hiện với các bên.",
  "expectedVersion": 8
}
```

- Chỉ áp dụng khi ca đang `awaiting_completion`. `note` cần 10–500 ký tự.
- `verified_completed`: admin đã xác minh công việc thực sự xong; đóng ca, ghi thời điểm,
  người thao tác và căn cứ vào lịch sử/audit. API trả `RequestDetails` mới.
- `unverified`: ghi nhận chưa xác minh, giữ ca và cảnh báo hiện có mở; không giải phóng
  cứu hộ viên, không reset thời gian chờ. Tiếp tục liên hệ hoặc xử lý hủy nếu có căn cứ.
- Nếu công việc không thể thực hiện: dùng API hủy ca hiện có, có lý do và phiên bản ca.
  Hủy không được tính vào số ca hoàn thành.
- Khóa bản ghi và kiểm tra phiên bản ngăn admin ghi đè thao tác đồng thời của khách.
  Phiên bản cũ trả HTTP 409; khách/cứu hộ viên gọi endpoint admin trả HTTP 403.
- `operatorResolution` trong chi tiết ca cung cấp quyết định gần nhất và thời điểm;
  nội dung căn cứ chỉ trả cho admin. Các quyết định trước vẫn lưu trong audit.
- Kết thúc ca đóng cảnh báo vòng đời, không tự đóng khiếu nại/sự cố hay yêu cầu hỗ trợ.
  Không cho đóng riêng cảnh báo hoàn tất/tranh chấp hoàn tất khi ca còn mở.
- Sau hoàn thành/hủy, cứu hộ viên hết bị ràng buộc bởi ca cũ nhưng ở trạng thái tắt nhận ca;
  phải chủ động bật hoạt động để cập nhật GPS và nhận ca mới.

Kiểm thử thủ công trên app: chạy một ca đến bước chờ hoàn tất, thử lần lượt khách xác nhận,
khách báo chưa xong, admin ghi chưa xác minh, và admin xác minh hoàn tất (có bước xác nhận lại).
Mỗi nhánh kết thúc dùng một ca riêng. Kiểm tra Lịch sử, thống kê, cảnh báo và bật nhận ca mới.
Giữ màn hình admin ở bước xác nhận, để khách hoàn tất trước, rồi xác nhận ở admin để kiểm tra
chặn phiên bản cũ. Thay đổi này dùng schema hiện có, không cần chạy lại SQL Supabase;
phải khởi động lại backend để nạp code mới.

## Chạy

Code hiện cần V9 cho vùng phục vụ demo. Database SQL thủ công đang ở V8: chạy file
`scripts/06_upgrade_demo_service_coverage.sql`, rồi `scripts/02_verify_rls.sql` trước khi
khởi động backend mới. Không chạy lại init/reset. Xem [thứ tự nâng cấp](../scripts/README.md#database-đã-tồn-tại).
Khách/điểm giao/cứu hộ viên dùng chung kiểm tra vùng đang bật, giới hạn trong khung
OSRM demo 15.95–16.18 Bắc, 108.05–108.34 Đông (gồm biên). Đây không phải toàn thành phố;
vẫn phải có đường OSRM hợp lệ. GPS chờ ra ngoài vùng sẽ tắt nhận ca, xóa tọa độ cũ và
trả `PROVIDER_OUTSIDE_SERVICE_AREA` (422), không tự hủy công việc đã nhận.

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

Flyway đọc migration từ `src/main/resources/db/migration`. `B1__initial_schema.sql` là baseline tích lũy cho database PostgreSQL/PostGIS sạch; V2 sửa khóa khi nhận offer, V3 phục hồi điều phối và V4 thêm push outbox. Hiện có V5 gộp vai trò, V6/V7 ghép ca có cấu hình/công bằng, V8 lưu vị trí lúc nhận ca và chặn GPS live, V9 đồng bộ giới hạn vùng OSRM demo. Thay đổi tiếp theo phải dùng V10 trở lên; không sửa migration đã applied.

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
