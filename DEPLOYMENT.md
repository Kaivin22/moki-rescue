# Triển khai DaNang Itinerary

## Yêu cầu

- Node `20.19.x` trở lên (`.nvmrc` khóa local/CI baseline ở `20.19.4`).
- JDK 21 cho backend.
- Supabase project riêng cho staging và production.
- EAS/Android Studio/Xcode nếu tạo binary.

Không cần Expo CLI toàn cục; dùng CLI của dự án qua `npx expo`.

## 1. Biến môi trường

Sao chép `.env.example` thành `.env` và thay placeholder.

- Client/public: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEATHER_API_URL`, bốn biến `EXPO_PUBLIC_OSRM_{CAR,MOTORBIKE,WALK,BICYCLE}_BASE_URL`, `GOOGLE_MAPS_KEY`.
- Backend/server-only: `GEMINI_API_KEY`, datasource credential, `SUPABASE_URL`, bốn biến `OSRM_{CAR,MOTORBIKE,WALK,BICYCLE}_BASE_URL`, quota/rate-limit config.

Production build fail-fast nếu thiếu public config bắt buộc. Trên thiết bị thật, API URL phải là HTTPS hoặc địa chỉ LAN truy cập được; `localhost` là chính điện thoại.

### Routing production

- Mỗi URL routing là origin/base URL, không kèm `/route/v1` hay `/table/v1`.
- Dựng bốn OSRM dataset/instance theo đúng profile. OSRM chọn profile lúc preprocess; đổi chuỗi `driving` ở request không biến dataset ô tô thành xe máy, đi bộ hoặc xe đạp.
- Motorbike cần profile và quy tắc access/speed được kiểm chứng riêng; public demo router không phải backend production và không có giao thông thời gian thực.
- Client dùng `/route` để lấy geometry vẽ map; frontend/backend dùng `/table` cho thứ tự và km/phút. Nếu routing lỗi hoặc waypoint không snap trong bán kính cấu hình, UI chỉ ghi “ước tính/không có tuyến” và không nối điểm bằng đường chim bay.
- Theo dõi latency/error của cả `/route` và `/table`, cập nhật dữ liệu OSM định kỳ, giới hạn truy cập gateway và smoke từng phương tiện trên staging.

Thuật toán tối ưu theo thời gian tuyến nhanh do ma trận trả về, đồng thời cân bằng giờ mở cửa/thời tiết ở client. Nó là open path giữa các điểm đã chọn; chưa tính đường từ khách sạn/vị trí hiện tại. Với danh sách nhỏ có nhánh giải chính xác; nhiều ngày/danh sách lớn là heuristic và giao diện không cam kết “ngắn nhất tuyệt đối”.

## 2. Supabase sạch

`01_schema.sql` là baseline cho database chưa cài ứng dụng. Nó không chứa seed địa điểm.

Nếu staging/local đã có schema cũ và được phép xóa, chạy hai đoạn sau trong **cùng SQL Editor session**:

```sql
SET app.allow_destructive_reset = 'yes';
-- Sau đó chạy toàn bộ scripts/00_reset.sql
```

Tiếp theo:

1. Chạy `scripts/01_schema.sql`.
2. Trên staging, chạy `scripts/02_verify_rls.sql`; script tạo fixture trong transaction và `ROLLBACK`.
3. Tạo user qua Auth, bootstrap admin đầu tiên theo `scripts/README.md`.
4. Sinh type từ database đã cài, không tự mô phỏng schema:

```powershell
npx supabase gen types typescript --project-id YOUR_STAGING_PROJECT_ID --schema public > src/types/database.generated.ts
```

Lệnh sinh type là external gate vì cần project thật/network; chỉ commit output khi nó được sinh từ đúng schema đang triển khai.

Không chạy reset trên production có dữ liệu. Reset xóa schema ứng dụng và object trong các bucket `place-images`, `place-revisions`, `avatars`.

## 3. Kiểm tra local

```powershell
npm ci
npm run check
npm start
```

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Với Expo Go tải từ App Store/Play Store, dự án giữ SDK 54. Expo Go không phải nền tảng ổn định cho production workflow; khi nâng SDK hoặc cần native module, tạo development build rồi mới nâng theo từng SDK.

## 4. Staging bắt buộc

- Test anon/user A/user B/banned/editor/admin bằng `02_verify_rls.sql` và smoke test giao diện.
- Test auth recovery deep link, share/revoke token, upload ảnh, location/photo permission, offline/timeout và resume app.
- Test backend bằng JWT thật: 401, account banned, free/VIP quota, refund quota khi Gemini lỗi và concurrent requests.
- Test routing bốn phương tiện bằng các địa điểm thật: geometry bám đường, thứ tự điểm, km/phút trước–sau/lưu lại nhất quán, timeout/no-route không xuất hiện Polyline thẳng.
- Xác nhận Maps restrictions, CORS, log redaction, backup/restore và monitoring.

## 5. Build phát hành

`eas.json` có `preview` (APK nội bộ) và `production` (store binary). Sau khi cấu hình EAS project/credentials/environment:

```powershell
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

CI dùng placeholder công khai để kiểm tra `expo config` và export đồng thời Android, iOS, web trên mọi pull request/push; do đó CI không cần và không nhúng production secret. Artifact export chỉ được giữ 14 ngày trên push `main`. Đây vẫn chỉ là JS/assets bundle, không phải APK/AAB/IPA đã ký.

CD lên EAS chưa được tự động hóa có chủ đích. Theo yêu cầu của EAS, trước tiên phải chạy thành công build từng platform từ máy tin cậy để khởi tạo `projectId`, credential và non-interactive configuration. Sau gate đó mới cấp `EXPO_TOKEN` qua GitHub Environment có reviewer và thêm workflow gọi `eas build --platform all --non-interactive --no-wait`; không tạo workflow phát hành chắc chắn thất bại khi project/credential chưa tồn tại. `eas.json` đặt `requireCommit: true` để EAS không build từ worktree bẩn.

Trình tự release: CI xanh → schema/RLS staging xanh → deploy backend → EAS production build → smoke đúng artifact → rollout có giám sát. Thanh toán không nằm trong release scope này.
