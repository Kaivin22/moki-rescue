# Đi Đà Nẵng – Trip Planner

Ứng dụng Expo giúp khám phá địa điểm thật tại Đà Nẵng, lập lịch trình, chia sẻ theo liên kết và nhận hỗ trợ. Dữ liệu nghiệp vụ đến từ Supabase; dự án không tự nạp rating, ảnh hay lịch trình giả. Catalog tùy chọn gồm 15 địa điểm thật nằm trong `scripts/03_seed_real_places.sql`.

## Phạm vi sản phẩm

- Supabase Auth: đăng ký, đăng nhập, khôi phục mật khẩu, hoàn thiện hồ sơ và xóa tài khoản.
- Địa điểm: tìm kiếm/phân trang/lọc, bản đồ, lưu, review, helpful vote và báo cáo sai thông tin.
- Lịch trình: tạo, sửa, clone, tối ưu theo ma trận đường của từng phương tiện, đổi giờ có kiểm tra xung đột, dự báo đúng ngày, chia sẻ/revoke/vote bằng token.
- AI: chat và nhận xét lịch trình qua Spring Boot; JWT, quota, VIP và trạng thái khóa đều được kiểm tra phía server.
- Hỗ trợ: ticket, phản hồi và xử lý trạng thái atomic.
- Editor/admin: quy trình nháp–duyệt địa điểm, kiểm duyệt review/report, phân trang tài khoản và audit thao tác đặc quyền.
- Thanh toán không thuộc phạm vi hoàn thiện hiện tại; không bật thu tiền chỉ dựa trên schema VIP.

Khách chưa đăng nhập chỉ đọc địa điểm đã xuất bản và lịch trình được chia sẻ bằng token còn hạn. Không có public itinerary feed trong MVP.

## Kiến trúc

```text
app/                 Expo Router routes/layouts
src/components/      UI dùng chung
src/features/        API, component và nghiệp vụ theo miền
src/services/        Supabase, weather và adapter hạ tầng
src/stores/          Auth và draft xuyên màn hình
src/types/           Hợp đồng domain dùng chung
backend/             Spring Boot API cho AI/routing/quota
scripts/             Supabase baseline + RLS verification
__tests__/           Unit/static contract tests
```

- Expo SDK 54, React Native 0.81, React 19.1.
- Zustand + TanStack Query.
- Supabase Auth/PostgreSQL/Storage với RLS.
- Spring Boot 3, Java 21, Supabase JWT/JWKS, Gemini và OSRM.
- Open-Meteo cho dự báo thời tiết.

Xem ranh giới phụ thuộc tại [ARCHITECTURE.md](./ARCHITECTURE.md).

## Cài đặt

Yêu cầu Node `>=20.19.0`, npm và JDK 21 nếu chạy backend.

```powershell
npm ci
Copy-Item .env.example .env
```

Điền biến môi trường thật theo [DEPLOYMENT.md](./DEPLOYMENT.md). Với Supabase mới hoàn toàn, cài `scripts/01_schema.sql`; chỉ dùng `scripts/00_reset.sql` khi thật sự muốn xóa môi trường local/staging. Sau schema, có thể chạy `scripts/03_seed_real_places.sql` để khởi tạo catalog thật; không có bước nạp dữ liệu giả.

```powershell
npm start
```

Expo Go trên store được dùng với SDK 54. Khi nâng SDK, ưu tiên development build để không phụ thuộc phiên bản Expo Go trên App Store/Play Store.

## Kiểm tra

```powershell
npm run check
cd backend
.\mvnw.cmd test
```

`npm run check` chạy lint, TypeScript, Jest, kiểm tra phiên bản package Expo và public config. Trạng thái xác minh thực tế và các bước bắt buộc trên staging/thiết bị nằm trong [RELEASE_READINESS.md](./RELEASE_READINESS.md).

## CI/CD

GitHub Actions chạy backend test, secret/dependency gate, lint, typecheck, Jest, Expo Doctor cố định phiên bản, package compatibility và export Android/iOS/web trên cả pull request lẫn push. Bundle CI dùng placeholder công khai, không phụ thuộc production secret. Binary ký để phát hành phải tạo bằng EAS profile `production` sau khi cấu hình project và credential:

```powershell
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

CD EAS chưa tự chạy khi push `main`: cần hoàn tất build Android/iOS đầu tiên trên máy tin cậy, tạo EAS `projectId`/credential rồi mới cấp `EXPO_TOKEN` qua GitHub Environment có reviewer. Secret backend được quản lý ở môi trường deploy backend, không đưa vào Expo config.

## Cấp admin đầu tiên

Tạo user bằng Supabase Auth, rồi chạy một lần trong SQL Editor bằng tài khoản chủ dự án:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

Không cấp VIP thủ công trong câu lệnh này. Sau bootstrap, quản lý role/khóa tài khoản qua giao diện admin để dùng RPC có guard và audit.
