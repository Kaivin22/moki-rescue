# Triển khai Moki Rescue

## 1. Yêu cầu

- Node `^22.13.0 || >=24.3.0` theo `package.json`, npm, JDK 21.
- Supabase project riêng cho staging và production.
- OSRM instance có dataset/profile xe máy đã kiểm chứng tại Đà Nẵng.
- EAS project, Android/iOS credential và thiết bị thật cho push/native permissions.
- SMS provider được cấu hình trong Supabase Auth cho phone OTP.

## 2. Cấu hình

Sao chép `.env.example` thành `.env`. Client chỉ nhận Supabase URL + publishable/anon key, API URL, hotline, EAS project ID và cấu hình tile OpenStreetMap. Không dùng Google Maps API key. Database password, Expo access token và Gemini key chỉ ở backend secret store. `EXPO_PUBLIC_API_URL` là origin/prefix đứng trước `/api`, không thêm `/api` lần nữa.

`APP_ENV=production` làm Expo config fail-fast nếu thiếu Supabase, API, hotline, EAS project ID hoặc tâm bản đồ ban đầu. Tâm bản đồ chỉ là viewport public; polygon `service_zones` trong database mới là nguồn quyết định có nhận ca hay không. Không dùng `localhost` cho API URL trên điện thoại thật.

Chính sách ghép ca được lưu theo từng dòng `service_types`: ngưỡng chênh lệch ETA, trọng số ETA/kinh nghiệm/thời gian chờ/số ca gần đây, các mốc chuẩn hóa, ngưỡng chống bỏ đói và TTL đề nghị. Chỉ hiệu chỉnh trên staging bằng migration hoặc SQL đã review; không sửa trực tiếp production mà không ghi lại giá trị trước/sau. “Kinh nghiệm” chỉ đếm ca hoàn thành của cứu hộ viên với đúng loại dịch vụ.

## 3. Supabase

Với project mới, chọn đúng một cách quản lý schema:

1. Cài thủ công qua SQL Editor: chạy `scripts/01_init_database.sql` trên schema trống. File đã gộp B1–V13 và kiểm tra schema/RLS trước commit; không chạy lại các migration riêng. Tùy chọn `scripts/02_seed_demo_teams.sql` chỉ cho local/staging, xem cờ xác nhận trong file.
2. Hoặc quản lý bằng Flyway: dùng direct connection Supabase port `5432` (hoặc session pooler port `5432` khi chỉ có IPv4) và database owner riêng chạy `flyway:info`, `flyway:migrate`, `flyway:validate` từ `backend`. Xác nhận B1–V13 trong `flyway_schema_history`; database trống **không được** baseline. Sinh kiểm tra chỉ đọc bằng `node scripts/build-init-sql.cjs --verify` từ gốc dự án rồi chạy `.tmp/verify-database.sql`. Không chạy bundle cài thủ công trên database do Flyway quản lý.
3. Đặt mật khẩu ngẫu nhiên cho role `motorescue_api` bằng câu lệnh trong `scripts/README.md`, lưu vào secret manager và cấu hình `SPRING_DATASOURCE_USERNAME=motorescue_api`. Không dùng database owner hoặc `postgres` cho runtime.
4. Khi chuẩn bị vận hành thật mới cấu hình phone auth/SMS provider, OTP expiry, rate limit và bot protection. Khi test ba vai trò, dùng `scripts/create-test-accounts.cjs` theo runbook; việc rút gọn SQL không tự bật/tắt xác thực toàn project.
5. Nếu dùng OTP cho admin thật: đăng nhập trước, thay đúng một số E.164 trong `scripts/optional/03_bootstrap_operator.sql` rồi chạy. Không cần bước này khi đã tạo admin bằng script tài khoản demo. Không dùng UPDATE không có `WHERE`.
6. Nếu cần retention tự động, bật Supabase Cron/`pg_cron`, đọc kỹ rồi chạy `scripts/optional/04_schedule_retention.sql`. Đây là lịch xóa dữ liệu theo chính sách, không phải bước cài bắt buộc.
7. V8 chặn GPS Broadcast của ca; V10 chuyển matching sang tọa độ cửa hàng và chặn endpoint GPS cũ. Kiểm tra tài khoản ngoài ca không đọc được vị trí qua API. Trạng thái ca dùng polling.
8. Với đối tác thật, dùng mã hồ sơ nội bộ không chứa số CCCD/số điện thoại. Từng provider tự đăng nhập OTP trước; admin cấp quyền, khai báo capability, hoàn tất checklist và kích hoạt đội. Không đưa tài liệu pháp lý hoặc ảnh giấy tờ vào Supabase Storage.

Hướng dẫn SQL/tài khoản mẫu nằm tại [`scripts/README.md`](../scripts/README.md); migration backend tại [`backend/README.md`](../backend/README.md). `baselineOnMigrate=false` và `cleanDisabled=true` là guard bắt buộc. `scripts/optional/00_reset.sql` chỉ dùng local/staging được phép xóa và yêu cầu cờ xác nhận trong cùng SQL session; database mới không cần reset. Schema có dữ liệu cần giữ phải được backup và nâng cấp theo đúng phương thức quản lý, không đoán version hoặc tự baseline database legacy.

## 4. Routing

- Cấu hình và luồng tích hợp nằm tại [MAP_ROUTING.md](MAP_ROUTING.md). Repository không kèm bộ demo, script khởi động hoặc dataset OSRM; cần cấp endpoint OSRM độc lập.
- `OSRM_MOTORBIKE_BASE_URL` là base origin, không kèm `/route/v1` hoặc `/table/v1`.
- Dataset phải được preprocess bằng profile xe máy phù hợp luật giao thông; không dùng public demo router production.
- Đặt `OSRM_TABLE_BATCH_SIZE` không quá giới hạn coordinate của instance (mặc định dự án là 80, tối đa code là 99 nguồn + một đích).
- Smoke `/table` với nhiều provider đến một pickup và `/route` với geometry. Kiểm tra cầu, đường một chiều, đường cấm xe máy, bán kính snap và `NoRoute`.
- OSRM tĩnh không có traffic live. UI dùng từ “ETA theo tuyến”, không cam kết thời gian đến tuyệt đối.

## 5. Backend

### Chạy Java trực tiếp

Sau khi đặt các biến backend trong terminal, IDE hoặc service manager:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Để chạy bản JAR, dùng `.\mvnw.cmd package` sau khi chuẩn bị môi trường integration test riêng, rồi `java -jar target/moki-rescue-0.0.1-SNAPSHOT.jar`. Không bỏ kiểm thử khi phát hành. Tham khảo [kiểm thử PostgreSQL/PostGIS trực tiếp](../backend/TESTING.md).

Spring Boot không tự đọc `.env`/`.env.runtime`; đây chỉ là file tham khảo biến. Nạp cấu hình bằng môi trường tiến trình, IDE hoặc secret store, không đưa mật khẩu vào command line/JAR. Runtime dùng `motorescue_api`, migration owner tách riêng. Điện thoại dùng IP LAN/HTTPS API, không dùng localhost; OSRM có thể chạy độc lập và backend gọi qua `OSRM_MOTORBIKE_BASE_URL`.

Healthcheck dùng `GET /api/health/ready`. Production cần HTTPS reverse proxy, tài khoản hệ điều hành ít quyền, giám sát và rollback JAR. CI chỉ kiểm chứng mã nguồn, không tự triển khai môi trường thật.

### Migration và rollout

Chạy một Flyway migration job duy nhất và hoàn tất validate/verify trước khi rollout JAR cần schema mới. Auto-migration lúc startup mặc định tắt để các replica runtime không giữ DDL credential. Deploy JAR sau reverse proxy HTTPS. Cấu hình database TLS, Supabase issuer/JWKS, CORS allowlist, connection pool, OSRM, push access token, Gemini key/model/quota và `TERMS_VERSION` khớp `LEGAL_VERSION`. Hiệu chỉnh polygon `service_zones` bằng SQL được review trước khi nhận ca thật. Chỉ chạy một replica cho đến khi đã kiểm chứng scheduled expiry job/locking dưới nhiều replica. Rate limit trong API dùng PostgreSQL chung giữa các replica, nhưng reverse proxy vẫn phải có request/body limit để chặn tải trước khi vào ứng dụng.

Smoke trợ lý bằng ba nhóm: câu về cách dùng app phải gọi Gemini; câu ngoài lề/chẩn đoán xe phải trả local và không giảm quota; thương tích/cháy/rò nhiên liệu phải trả bàn giao 113/114/115. Kiểm log/database không có prompt hoặc reply.

Liveness dùng `GET /api/health`; readiness kiểm database bằng `GET /api/health/ready`. Log production phải redaction Authorization, phone, exact coordinates và datasource URL.

## 6. Mobile

`package.json` hiện khai báo Expo SDK 57; `AGENTS.md` vẫn ghi chính sách SDK 54. Đây là điểm cần chủ dự án xác nhận để đồng bộ chính sách, không tự nâng/hạ package. Chỉ smoke bằng Expo Go hỗ trợ đúng SDK của source; không suy ra khả năng tương thích từ số phiên bản ứng dụng. Push token/channel và native permissions phải kiểm chứng bằng preview/development build:

```powershell
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Kiểm tra chọn/kéo ghim OpenStreetMap, geometry OSRM, attribution không bị che, lỗi mạng, quyền location, kill/resume, push và nút Google Maps trên Android/iOS thật.

Availability hiện dùng vị trí cửa hàng đã cấu hình; không yêu cầu quyền GPS để bật sẵn sàng.
Khi nhận ca, lưu tọa độ cửa hàng cho tuyến tham khảo, không khởi động tracking ca.
Mã xử lý task GPS cũ được giữ để dừng task và dọn chủ sở hữu trên bản app nâng cấp,
không phải tính năng GPS nền đang dùng. Test thu hồi quyền location vẫn bật nhận ca được
khi cửa hàng/thành viên hợp lệ; cửa hàng ngoài vùng hoặc thành viên chưa duyệt phải bị chặn.
Thử đóng/mở lại app, đổi tài khoản, nhận push đề nghị và mở Google Maps đến đúng điểm đón.

## 7. CI/CD và release

Repository có đúng một workflow `ci.yml`, chạy khi push `develop`/`main` hoặc mở PR vào `main`. Mỗi run có một job tuần tự: backend test, audit critical, secret scan, lint, format check, typecheck, Jest, Expo config/package check, export bundle. PostgreSQL/PostGIS cho integration test được cài trực tiếp trên runner; không có bước đóng gói image. Concurrency hủy run cũ cùng ref.

CI không deploy Supabase, backend hay EAS. Release có thay đổi bên ngoài chỉ được thêm sau khi EAS credential/project và staging gate đã tồn tại, qua GitHub Environment có reviewer.
