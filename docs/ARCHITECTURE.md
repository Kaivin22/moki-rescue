# Kiến trúc Moki Rescue

## Biên hệ thống

```text
Expo / React Native (customer, provider, dispatcher, admin)
             | HTTPS + Supabase JWT
             v
Spring Boot API (authorization, state machine, matching, quote, audit)
        | JDBC/TLS             | HTTPS                 | HTTPS
        v                      v                       v
Supabase Auth + PostgreSQL   OSRM + Expo Push     Gemini app assistant
+ PostGIS + RLS + Realtime                         (server key only)
```

Mobile chỉ đọc dữ liệu được RLS cho phép và gửi business mutation qua API. Backend dùng database credential riêng, nhưng vẫn phải kiểm tra JWT, vai trò, quan hệ với ca, trạng thái hiện tại và version. Nút bị ẩn trên UI không được coi là authorization.

## Cây mã nguồn

```text
app/
  (auth)/             Đăng nhập OTP
  (tabs)/             Home, request/activity/operations/profile theo role
  rescue/[id].tsx     Bản đồ, state action, quote, review
  rescue/[id]/map.tsx Bản đồ ca toàn màn hình, chỉ dùng route geometry backend
  service/             Catalog và chi tiết dịch vụ từ backend
  help/                Trợ giúp và an toàn bên đường
  operator/           Quản lý đội và vai trò
  profile/, legal/    Hồ sơ, cài đặt, xóa dữ liệu, pháp lý
src/
  components/         UI atoms và map adapter native/web
  features/auth/      Chuẩn hóa số điện Việt Nam
  features/safety/    Danh bạ khẩn cấp dùng chung
  features/location/  Foreground permission/current GPS
  features/rescue/    API, query, status, tracking, realtime, GPS outbox
  features/assistant/ ChatBox phiên hiện tại; chỉ gọi backend, không có Gemini key
  features/notifications/ Push registration, token rollover và retry theo app installation
  stores/             Session/profile duy nhất
backend/              Trusted business layer
scripts/              Database runbook, verify/bootstrap/retention operational SQL
backend/.../migration Flyway baseline và versioned PostgreSQL/PostGIS migrations
```

Route có thể import feature; feature không import từ `app/`. Component dùng chung không truy vấn Supabase. Type domain canonical nằm trong `src/types`.

## Luồng tạo và ghép ca

1. Khách trả lời phân loại nguy cơ. Ca có người bị thương/cháy/rò rỉ dừng ở luồng gọi khẩn cấp.
2. App chỉ xin GPS khi khách bấm lấy vị trí; khách kiểm tra hoặc kéo ghim trên bản đồ rồi mới gửi UUID `Idempotency-Key` cùng loại sự cố và mô tả tối thiểu.
3. Backend khóa advisory theo customer, kiểm tra payload của key cũ, một ca đang mở, rate limit và polygon `service_zones` đang hoạt động trong PostGIS.
4. PostGIS lọc provider active/available, đội verified, capability đúng, GPS có sai số trong ngưỡng, vị trí không quá ba phút và nằm trong bán kính đội.
5. Backend gọi OSRM Table cho toàn bộ ứng viên hợp lệ theo các lô tối đa 99 điểm gốc, loại `NoRoute`, xếp theo duration đường xe máy rồi distance và tạo tối đa số offer đã cấu hình.
6. Provider nhận push chỉ có khu vực tương đối. SQL function khóa request/offer/provider; hai người nhận đồng thời chỉ một người thành công.
7. Sau khi nhận ca, API trả tên và số liên hệ công việc đã được admin xác minh cho participant. Số không nằm trong offer/push và được ẩn khi ca đóng.
8. Scheduled job quét offer hết hạn mỗi 15 giây và kết thúc `no_provider`; không quay loading vô hạn.

PostGIS chỉ lọc phạm vi phục vụ, không quyết định người nhanh nhất. Khi OSRM lỗi, backend không fallback Haversine và UI không vẽ Polyline thẳng.

## State machine

```text
searching -> offered -> assigned -> en_route
  -> awaiting_arrival_confirmation -> arrived -> diagnosing
  -> awaiting_quote -> quote_approved -> repairing|transporting
  -> awaiting_completion -> completed

searching|offered -> no_provider
ca mất người nhận -> needs_dispatch -> searching
trạng thái cho phép -> cancelled
```

Mỗi transition được kiểm tra hai lần: service xác định action hợp lệ, trigger PostgreSQL chặn cạnh sai. `version` tăng trong trigger. Khách là bên xác nhận đã đến, báo giá và hoàn thành; GPS không tự động kết luận.

## Vị trí và realtime

- Provider bật sẵn sàng: foreground GPS cập nhật vị trí nội bộ dùng matching; khách không thấy.
- Điểm GPS provider thiếu `accuracy` bị bỏ; backend và database đều buộc checkpoint phải có độ chính xác hợp lệ.
- Sau khi nhận ca: foreground tracking hoạt động trong Expo Go; background tracking chỉ khởi động trên development/production build.
- App gửi private Broadcast topic `request:<uuid>`. RLS chỉ cho assigned provider ghi và participant/staff đọc.
- Mất mạng: outbox chỉ giữ điểm GPS mới nhất, chỉ retry nếu chưa quá hai phút; không phát lại hành trình cũ.
- Khi ca kết thúc hoặc provider không sẵn sàng, tracking dừng và vị trí matching bị xóa.

## Dữ liệu và RLS

Ngoài hồ sơ, đội, catalog và ca cứu hộ, schema có các nhóm dữ liệu riêng cho vùng phục vụ, offer/báo giá, cờ cần điều phối, phản hồi xác nhận, khiếu nại, đánh giá, cảnh báo chất lượng, push receipt, audit, quota AI và cửa sổ rate limit. Khi ca đóng, hủy, bị thu hồi hoặc tài khoản provider bị vô hiệu, tọa độ matching cuối của provider được xóa; checkpoint có retention riêng.

`push_devices.installation_id` cho phép một cài đặt app đổi tài khoản hoặc refresh token một cách nguyên tử. Mobile lắng nghe native token rollover, lấy lại Expo token và đăng ký lại mà không tự mở permission prompt. Backend gửi tối đa 100 message mỗi request, lưu ticket tối thiểu, bắt đầu hỏi receipt sau 15 phút theo lô tối đa 1.000 và vô hiệu đúng device khi Expo trả `DeviceNotRegistered`. `push_delivery_receipts` không lưu title, body, payload, token bản sao hoặc dữ liệu ca và được xóa định kỳ.

Catalog là dữ liệu database; chỉ admin được sửa field nghiệp vụ qua backend và action được ghi audit. Năng lực là thuộc tính của đội và được quản lý độc lập với thao tác thêm cứu hộ viên. Mobile không nhận quyền update trực tiếp các bảng này.

Danh sách lịch sử ca và audit dùng cursor `(timestamp, id)` thay vì tải toàn bộ. Rate limit mutation được ghi nguyên tử trong PostgreSQL nên không bị đặt lại theo từng replica; lớp rate limit tại reverse proxy vẫn cần thiết để chặn lưu lượng trước khi vào ứng dụng.

RLS dùng quan hệ customer/assigned provider/staff. Client không có grant INSERT/UPDATE/DELETE trên bảng nghiệp vụ; ngoại lệ duy nhất là các cột hồ sơ tự phục vụ đã allowlist. Privileged SQL function bị revoke khỏi `anon` và `authenticated`. Hàm tra tài khoản theo đúng số đăng nhập chỉ trả UUID/tên/vai trò và chỉ backend được gọi sau khi kiểm tra quyền admin. Spring đăng nhập bằng role `motorescue_api` có grant theo bảng nhưng không có DDL/superuser; không dùng `postgres` lúc runtime.

## Vòng đời đối tác khép kín

1. Người dùng tự xác thực OTP; trigger luôn tạo `customer`, kể cả metadata do client gửi có nội dung khác.
2. Đơn vị vận hành xác minh quan hệ đối tác bên ngoài app. Admin tạo đội với mã hồ sơ nội bộ và hotline đã kiểm tra; không tải tài liệu pháp lý hay giấy tờ cá nhân.
3. Từng cứu hộ viên tự đăng nhập OTP một lần. Admin tra cứu chính xác số đăng nhập qua backend, rồi gắn tài khoản cá nhân vào đội; không có mật khẩu do admin cấp hoặc tài khoản đội dùng chung.
4. Admin khai báo capability và hoàn tất checklist lấy từ `team_verification_requirements`. `team_verification_checks` chỉ lưu kết quả, ghi chú tối thiểu, người và thời điểm kiểm tra.
5. Backend chỉ cho chuyển đội sang `verified` khi đủ mọi requirement bắt buộc đang hoạt động, có capability và có provider active. Dấu `verified_by/verified_at` cùng audit log cho biết ai chịu trách nhiệm kích hoạt.

Dispatcher được theo dõi đội/ca nhưng không đọc hoặc sửa hồ sơ xác minh. Chỉ admin truy cập API checklist. Provider của đội `pending`/`suspended` không thể bật sẵn sàng và không lọt vào matching.

## Uy tín và kiểm soát chất lượng

Mỗi review lưu cả `provider_id` và `team_id` tại thời điểm ca hoàn tất, nên việc chuyển cứu hộ viên sang đội khác không làm sai điểm lịch sử. Điểm hiển thị là trung bình của review thật chưa bị ẩn; không có điểm mặc định hoặc số lượt giả. Admin có thể xem review gần đây, ẩn/khôi phục spam với lý do và audit.

Backend chỉ tạo `team_quality_alerts` khi đủ số đánh giá tối thiểu. Ngưỡng điểm, khoảng cách số review giữa hai cảnh báo và số cảnh báo để đề nghị xem xét đình chỉ đều lấy từ cấu hình server. Hệ thống không đổi `rescue_teams.status` dựa trên điểm sao. Admin phải kiểm tra ca/review, gửi cảnh báo có lý do và dùng thao tác đình chỉ hiện có nếu cần; đình chỉ tắt khả năng nhận ca mới nhưng không giả định việc xử lý dòng tiền.

Khiếu nại được lưu riêng trong `incident_reports`, không làm biến dạng điểm sao. Chỉ khách của ca và nhân sự vận hành được xem qua API; dispatcher/admin xử lý có ghi người, thời điểm, kết quả và audit. Nếu đội/provider bị đình chỉ giữa ca, ca chuyển sang `needs_dispatch`, offer cũ bị thu hồi và hàng chờ attention buộc nhân sự kiểm tra trước khi ghép lại.

## Trợ lý có giới hạn

Mobile gửi tối đa 500 ký tự tới `/api/assistant/message`. Backend xử lý tình huống khẩn cấp, chẩn đoán xe, dữ liệu nhạy cảm, prompt injection rõ ràng, lời chào và câu ngoài phạm vi bằng phản hồi cục bộ. Chỉ câu về cách dùng Moki Rescue/quy trình trong app mới giữ quota rồi gọi Gemini với system instruction và safety settings; output model được kiểm lại trước khi trả về. Nếu Gemini lỗi hoặc output bị scope guard từ chối, lượt quota vừa giữ được hoàn lại. Database chỉ lưu `user_id` + thời điểm dùng quota trong hai ngày; prompt, câu trả lời và lịch sử hội thoại không được lưu hoặc đưa vào audit log.
