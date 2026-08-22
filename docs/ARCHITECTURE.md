# Kiến trúc MotoRescue

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
  features/notifications/ Push registration theo app installation
  stores/             Session/profile duy nhất
backend/              Trusted business layer
scripts/              Supabase baseline và operational SQL
```

Route có thể import feature; feature không import từ `app/`. Component dùng chung không truy vấn Supabase. Type domain canonical nằm trong `src/types`.

## Luồng tạo và ghép ca

1. Khách trả lời phân loại nguy cơ. Ca có người bị thương/cháy/rò rỉ dừng ở luồng gọi khẩn cấp.
2. App chỉ xin GPS khi khách bấm lấy vị trí; khách kiểm tra hoặc kéo ghim trên bản đồ rồi mới gửi UUID `Idempotency-Key` cùng loại sự cố và mô tả tối thiểu.
3. Backend khóa advisory theo customer, kiểm tra payload của key cũ, một ca đang mở, rate limit và bounding box Đà Nẵng.
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
  -> awaiting_quote -> repairing|transporting
  -> awaiting_completion -> completed

searching|offered -> no_provider
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

`profiles`, `rescue_teams`, `team_verification_requirements`, `team_verification_checks`, `service_types`, `provider_members`, `team_capabilities`, `rescue_requests`, `dispatch_offers`, `quotes`, `request_status_events`, `provider_location_checkpoints`, `reviews`, `team_quality_alerts`, `push_devices`, `audit_logs`, `assistant_usage_events` là các bảng chính.

`push_devices.installation_id` cho phép một cài đặt app đổi tài khoản hoặc refresh token một cách nguyên tử. Catalog là dữ liệu database; chỉ admin được sửa field nghiệp vụ qua backend và action được ghi audit. Năng lực là thuộc tính của đội và được quản lý độc lập với thao tác thêm cứu hộ viên. Mobile không nhận quyền update trực tiếp các bảng này.

RLS dùng quan hệ customer/assigned provider/staff. Client không có grant INSERT/UPDATE/DELETE trên bảng nghiệp vụ; ngoại lệ duy nhất là các cột hồ sơ tự phục vụ đã allowlist. Privileged SQL function bị revoke khỏi `anon` và `authenticated`. Hàm tra tài khoản theo đúng số đăng nhập chỉ trả UUID/tên/vai trò và chỉ backend được gọi sau khi kiểm tra quyền admin. Spring đăng nhập bằng role `motorescue_api` có grant theo bảng nhưng không có DDL/superuser; không dùng `postgres` lúc runtime.

## Vòng đời đối tác khép kín

1. Người dùng tự xác thực OTP; trigger luôn tạo `customer`, kể cả metadata do client gửi có nội dung khác.
2. Đơn vị vận hành ký/đối chiếu hợp tác bên ngoài app. Admin tạo đội với mã hồ sơ nội bộ và hotline đã kiểm tra; không tải hợp đồng hay giấy tờ cá nhân.
3. Từng cứu hộ viên tự đăng nhập OTP một lần. Admin tra cứu chính xác số đăng nhập qua backend, rồi gắn tài khoản cá nhân vào đội; không có mật khẩu do admin cấp hoặc tài khoản đội dùng chung.
4. Admin khai báo capability và hoàn tất checklist lấy từ `team_verification_requirements`. `team_verification_checks` chỉ lưu kết quả, ghi chú tối thiểu, người và thời điểm kiểm tra.
5. Backend chỉ cho chuyển đội sang `verified` khi đủ mọi requirement bắt buộc đang hoạt động, có capability và có provider active. Dấu `verified_by/verified_at` cùng audit log cho biết ai chịu trách nhiệm kích hoạt.

Dispatcher được theo dõi đội/ca nhưng không đọc hoặc sửa hồ sơ xác minh. Chỉ admin truy cập API checklist. Provider của đội `pending`/`suspended` không thể bật sẵn sàng và không lọt vào matching.

## Uy tín và kiểm soát chất lượng

Mỗi review lưu cả `provider_id` và `team_id` tại thời điểm ca hoàn tất, nên việc chuyển cứu hộ viên sang đội khác không làm sai điểm lịch sử. Điểm hiển thị là trung bình của review thật chưa bị ẩn; không có điểm mặc định hoặc số lượt giả. Admin có thể xem review gần đây, ẩn/khôi phục spam với lý do và audit.

Backend chỉ tạo `team_quality_alerts` khi đủ số đánh giá tối thiểu. Ngưỡng điểm, khoảng cách số review giữa hai cảnh báo và số cảnh báo để đề nghị xem xét đình chỉ đều lấy từ cấu hình server. Hệ thống không đổi `rescue_teams.status` dựa trên điểm sao. Admin phải kiểm tra ca/review, gửi cảnh báo có lý do và dùng thao tác đình chỉ hiện có nếu cần; đình chỉ tắt khả năng nhận ca mới nhưng không giả định việc xử lý dòng tiền.

## Trợ lý có giới hạn

Mobile gửi tối đa 500 ký tự tới `/api/assistant/message`. Backend xử lý tình huống khẩn cấp, chẩn đoán xe, dữ liệu nhạy cảm, prompt injection rõ ràng, lời chào và câu ngoài phạm vi bằng phản hồi cục bộ. Chỉ câu về cách dùng MotoRescue/quy trình trong app mới giữ quota rồi gọi Gemini với system instruction và safety settings; output model được kiểm lại trước khi trả về. Database chỉ lưu `user_id` + thời điểm dùng quota trong hai ngày; prompt, câu trả lời và lịch sử hội thoại không được lưu hoặc đưa vào audit log.
