# Triển khai Moki Rescue

## 1. Yêu cầu

- Node `>=20.19`, npm, JDK 21.
- Supabase project riêng cho staging và production.
- OSRM instance có dataset/profile xe máy đã kiểm chứng tại Đà Nẵng.
- EAS project, Android/iOS credential và thiết bị thật cho background location/push.
- SMS provider được cấu hình trong Supabase Auth cho phone OTP.

## 2. Cấu hình

Sao chép `.env.example` thành `.env`. Client chỉ nhận Supabase URL + publishable/anon key, API URL, hotline, EAS project ID và Maps key đã restriction. Database password, Expo access token và Gemini key chỉ ở backend secret store. `EXPO_PUBLIC_API_URL` là origin/prefix đứng trước `/api`, không thêm `/api` lần nữa.

`APP_ENV=production` làm Expo config fail-fast nếu thiếu Supabase, API, Maps, hotline, EAS project ID hoặc tâm bản đồ ban đầu. Tâm bản đồ chỉ là viewport public; polygon `service_zones` trong database mới là nguồn quyết định có nhận ca hay không. Không dùng `localhost` cho API URL trên điện thoại thật.

## 3. Supabase

Với project mới:

1. Dùng direct connection Supabase port `5432` (hoặc session pooler port `5432` khi chỉ có IPv4) và database owner riêng để chạy `flyway:info`, `flyway:migrate`, `flyway:validate` từ thư mục `backend`. Database chưa từng chạy SQL **không được** dùng `flyway:baseline`.
2. Xác nhận `B1__initial_schema.sql` thành công trong `flyway_schema_history`, sau đó chạy `scripts/02_verify_rls.sql`.
3. Đặt mật khẩu ngẫu nhiên cho role `motorescue_api` bằng câu lệnh trong `scripts/README.md`, lưu vào secret manager và cấu hình `SPRING_DATASOURCE_USERNAME=motorescue_api`. Không dùng database owner hoặc `postgres` cho runtime.
4. Bật phone auth và SMS provider. Đặt OTP expiry ngắn, rate limit, CAPTCHA/bot protection theo gói Supabase.
5. Đăng nhập OTP cho tài khoản operator đầu tiên. Thay đúng một số E.164 trong `03_bootstrap_operator.sql` rồi chạy. Không dùng UPDATE không có `WHERE`.
6. Bật Supabase Cron/`pg_cron`, sau đó chạy `04_schedule_retention.sql`.
7. Trong Realtime Settings, tắt public access và kiểm tra private topic `request:<uuid>` bằng hai tài khoản không liên quan.
8. Với đối tác thật, dùng mã hồ sơ nội bộ không chứa số CCCD/số điện thoại. Từng provider tự đăng nhập OTP trước; admin cấp quyền, khai báo capability, hoàn tất checklist và kích hoạt đội. Không đưa tài liệu pháp lý hoặc ảnh giấy tờ vào Supabase Storage.

Chi tiết biến môi trường Flyway, bootstrap database sạch, cách baseline database legacy, quy trình staging và rollback nằm tại [`scripts/README.md`](../scripts/README.md). `baselineOnMigrate=false` và `cleanDisabled=true` là guard bắt buộc. `00_reset.sql` chỉ dùng local/staging được phép xóa và yêu cầu cờ xác nhận trong cùng SQL session; sau reset phải chạy lại Flyway. Không chạy reset trên production có dữ liệu cần giữ.

## 4. Routing

- `OSRM_MOTORBIKE_BASE_URL` là base origin, không kèm `/route/v1` hoặc `/table/v1`.
- Dataset phải được preprocess bằng profile xe máy phù hợp luật giao thông; không dùng public demo router production.
- Đặt `OSRM_TABLE_BATCH_SIZE` không quá giới hạn coordinate của instance (mặc định dự án là 80, tối đa code là 99 nguồn + một đích).
- Smoke `/table` với nhiều provider đến một pickup và `/route` với geometry. Kiểm tra cầu, đường một chiều, đường cấm xe máy, bán kính snap và `NoRoute`.
- OSRM tĩnh không có traffic live. UI dùng từ “ETA theo tuyến”, không cam kết thời gian đến tuyệt đối.

## 5. Backend

Chạy một Flyway migration job duy nhất và hoàn tất validate/verify trước khi rollout JAR cần schema mới. Auto-migration lúc startup mặc định tắt để các replica runtime không giữ DDL credential. Deploy JAR sau reverse proxy HTTPS. Cấu hình database TLS, Supabase issuer/JWKS, CORS allowlist, connection pool, OSRM, push access token, Gemini key/model/quota và `TERMS_VERSION` khớp `LEGAL_VERSION`. Hiệu chỉnh polygon `service_zones` bằng SQL được review trước khi nhận ca thật. Chỉ chạy một replica cho đến khi đã kiểm chứng scheduled expiry job/locking dưới nhiều replica. Rate limit trong API dùng PostgreSQL chung giữa các replica, nhưng reverse proxy vẫn phải có request/body limit để chặn tải trước khi vào ứng dụng.

Smoke trợ lý bằng ba nhóm: câu về cách dùng app phải gọi Gemini; câu ngoài lề/chẩn đoán xe phải trả local và không giảm quota; thương tích/cháy/rò nhiên liệu phải trả bàn giao 113/114/115. Kiểm log/database không có prompt hoặc reply.

Liveness dùng `GET /api/health`; readiness kiểm database bằng `GET /api/health/ready`. Log production phải redaction Authorization, phone, exact coordinates và datasource URL.

## 6. Mobile

Expo Go SDK 54 phù hợp smoke luồng foreground. Background location, push token/channel và native permissions phải kiểm chứng bằng preview/development build:

```powershell
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Kiểm tra status bar/cutout trên map, quyền location deny/allow, kill/resume app, pin notification, deep link từ push và dừng tracking sau khi đóng ca.

## 7. CI/CD và release

Repository có đúng một workflow `ci.yml`. Một lần push commit lên `main` tạo một run, một job tuần tự: backend test, audit critical, secret scan, lint, format check, typecheck, Jest, Expo config/package check và export bundle. Concurrency hủy run cũ cùng ref.

CI không deploy Supabase, backend hay EAS. Release có thay đổi bên ngoài chỉ được thêm sau khi EAS credential/project và staging gate đã tồn tại, qua GitHub Environment có reviewer.
