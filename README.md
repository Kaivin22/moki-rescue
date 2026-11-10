# Moki Rescue

Ứng dụng điều phối cứu hộ xe máy xăng theo thời gian thực cho một mạng lưới kín gồm các đội đối tác đã được xác minh trong vùng phục vụ tại Đà Nẵng. Hiện chưa tiếp nhận xe máy điện, kể cả vận chuyển. Sản phẩm không phải sàn mở cho thợ tự đăng ký và không thay thế 113/114/115.

## Mô hình sử dụng

- **Khách đi xe máy** tạo yêu cầu, xác nhận vị trí, xem tuyến tham khảo và trạng thái ca, duyệt báo giá và đánh giá 1–5 sao cho ca đã hoàn thành.
- **Cứu hộ viên** là thành viên của một đội đối tác đã được xác minh ngoại tuyến; họ bật sẵn sàng, nhận đề nghị phù hợp và cập nhật quy trình xử lý.
- **Admin** là quản trị viên vận hành của đơn vị trung tâm. Admin xử lý ca ngoại lệ, quản lý đội, năng lực, catalog, quyền nhân sự và cảnh báo chất lượng; admin không mặc nhiên là cứu hộ viên và không có khái niệm VIP.

Đây là sản phẩm cho **một đơn vị điều phối trung tâm quản lý mạng lưới kín nhiều đội cứu hộ nhỏ**, không phải ứng dụng riêng của một đội và cũng không phải marketplace để doanh nghiệp tự đăng ký hoặc đấu giá công khai. Thuật toán tự gửi đề nghị đến các cứu hộ viên đủ điều kiện theo ETA đường thực tế.

MVP chưa thu tiền trong ứng dụng. Cứu hộ viên gửi báo giá, khách duyệt trước khi làm; thao tác duyệt giá **không phải xác nhận đã thanh toán**. Khách thanh toán trực tiếp bằng tiền mặt hoặc kênh ngoài hệ thống. Nếu phát triển thương mại, nguồn thu đơn giản nhất là phí kết nối nhỏ trên ca hoàn tất hoặc phí đối tác; đồ án không xây ví, đối soát hay kế toán.

## Phạm vi đã triển khai

- Đăng nhập bằng số điện thoại và OTP qua Supabase; tài khoản mới luôn là khách hàng.
- Đơn vị cứu hộ không có trang tự đăng ký. Sau khi ký hợp tác ngoại tuyến, admin tạo đội với mã hồ sơ nội bộ, cấp quyền cho các tài khoản đã tự đăng nhập OTP và chỉ kích hoạt khi đủ checklist, năng lực và nhân sự.
- Giao diện theo ba vai trò: khách hàng, cứu hộ viên và quản trị viên vận hành.
- Phân loại nguy cơ trước khi tạo ca; ca khẩn cấp được chuyển sang trình gọi hệ thống.
- Khách xác nhận hoặc kéo ghim điểm cứu hộ trên bản đồ trước khi gửi; không chỉ tin vào GPS thô.
- Catalog/chi tiết dịch vụ lấy từ backend; có trung tâm trợ giúp, hướng dẫn an toàn và trạng thái bảo mật tài khoản.
- Tạo ca có idempotency, giới hạn spam, kiểm tra vùng phục vụ và chỉ một ca đang mở mỗi khách.
- Khách có thể chọn điểm giao cho ca vận chuyển, hủy có lý do trước khi xác nhận đội đã đến, hoặc gửi yêu cầu hỗ trợ/khiếu nại khi ca đã đi sâu hơn.
- Lọc PostGIS theo trạng thái/năng lực/bán kính và tọa độ cửa hàng, sau đó dùng ETA OSRM, số ca hoàn thành và chính sách công bằng để xếp hạng trong nhóm ETA phù hợp. Không dùng đường chim bay làm kết quả cuối.
- Gửi đề nghị có thời hạn lần lượt từng cứu hộ viên; từ chối hoặc hết hạn thì thử người tiếp theo. Nhận ca được bảo vệ bằng transaction nguyên tử.
- State machine phía server, optimistic version, lịch sử chỉ thêm và audit log.
- Lưu tọa độ cửa hàng khi phân công để vẽ tuyến tham khảo; không yêu cầu GPS chờ ca hoặc theo dõi di chuyển trực tiếp.
- Sau khi nhận ca, khách thấy tên, đội, phương tiện và số liên hệ công việc đã xác minh của cứu hộ viên; số bị ẩn khi ca đóng.
- Bản đồ OpenStreetMap chỉ vẽ geometry OSRM; cứu hộ viên mở Google Maps bên ngoài để dẫn đường. Xem [cấu hình bản đồ/OSRM](docs/MAP_ROUTING.md).
- Xác nhận hai phía khi đến và hoàn thành; báo giá phải được khách duyệt.
- Đánh giá chỉ gắn với ca đã hoàn thành, có sửa và xóa.
- Ca mất provider chuyển sang hàng chờ điều phối lại; timeout và xác nhận quá hạn tạo cờ cần can thiệp thay vì quay loading vô hạn.
- Điểm uy tín cứu hộ viên/đội chỉ tính từ đánh giá thật không bị ẩn. Hệ thống mở tín hiệu khi đủ mẫu và điểm thấp; admin kiểm tra review, gửi cảnh báo hoặc đình chỉ thủ công. Không tự khóa đội chỉ bằng điểm sao.
- Push notification theo cài đặt thiết bị, tự đồng bộ token rollover, kiểm tra Expo receipt để dừng token không còn hợp lệ; onboarding, giao diện vi/en, consent versioned, yêu cầu xóa tài khoản và quy trình xác minh đội đối tác có audit.
- Admin chỉnh được nội dung catalog nghiệp vụ song ngữ và trạng thái nhận ca; layout giao diện vẫn được kiểm soát trong codebase.
- Admin có danh sách nhân sự đội, khiếu nại, cờ cần can thiệp và audit phân trang.
- Hộp thông báo, phiếu hỗ trợ trao đổi với admin và thông báo chung theo nhóm vai trò; xem [phạm vi và giới hạn](./docs/COMMUNICATIONS.md).
- ChatBox Gemini dạng bong bóng nổi chỉ hướng dẫn cách dùng Moki Rescue/quy trình trong app; câu ngoài lề, chẩn đoán xe và khẩn cấp được chặn cục bộ trước khi dùng quota.

Thanh toán, ví, AI chẩn đoán, chatbot kiến thức chung, dashboard web và marketplace mở không thuộc MVP.

## Kiến trúc

```text
app/                 Expo Router screens theo vai trò
src/features/        Auth, location, notification, rescue và trợ lý trong app
src/components/      UI/map adapter dùng chung
backend/             Spring Boot 3 / Java 21 - cổng mutation tin cậy
scripts/             Database runbook, verify, bootstrap và retention
backend/src/main/resources/db/migration/  Flyway schema versioned
docs/                Kiến trúc, triển khai, release checklist
__tests__/           Contract/unit test phía mobile
```

Danh mục bàn giao thiết kế gồm số route và toàn bộ frame nghiệp vụ nằm tại [docs/FIGMA_SCREEN_INVENTORY.md](./docs/FIGMA_SCREEN_INVENTORY.md).

Đặc tả hiện hành nằm tại [specs/Moki_Rescue_ky_thuat.txt](./specs/Moki_Rescue_ky_thuat.txt) và [specs/Moki_Rescue_UI_Stitch.txt](./specs/Moki_Rescue_UI_Stitch.txt). Kết quả rà soát dữ liệu cứng/mẫu nằm tại [docs/HARDCODE_AND_MOCK_AUDIT.md](./docs/HARDCODE_AND_MOCK_AUDIT.md).

Mobile là client không tin cậy. Các thay đổi nghiệp vụ đi qua Spring Boot; Supabase RLS vẫn là lớp phòng thủ cuối. Xem [kiến trúc chi tiết](./docs/ARCHITECTURE.md).

## Cài đặt local

Yêu cầu Node `^22.13.0 || >=24.3.0` (CI dùng Node `24.14.x`), npm và JDK 21.

Repository đặt `legacy-peer-deps=false`: bộ thư viện SDK 58 được giải với kiểm tra peer dependency bật. Dùng `npm ci` để cài đúng `package-lock.json` trên máy mới và CI. Không dùng `--force` hoặc `--legacy-peer-deps` để che lỗi tương thích; vẫn cần kiểm tra Expo, export bundle và kiểm thử thiết bị.

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Điền cấu hình thật theo [hướng dẫn triển khai](./docs/DEPLOYMENT.md). Trên điện thoại thật, `EXPO_PUBLIC_API_URL` phải là HTTPS hoặc IP LAN truy cập được; `localhost` là chính điện thoại. Không chép đè `.env` nếu đã có thông tin thật.

Chạy thường ngày chỉ chỉnh `.env` (app và backend); `.env.example` là mẫu không chứa bí mật. Không cần `.env.local` hay file env riêng trong backend. Docker dùng `.env.docker.local` và mẫu `.env.docker.example` vì có cấu hình kết nối riêng. Chỉ khi cần sao lưu mới tạo cấu hình tùy chọn theo [hướng dẫn sao lưu](./docs/DISASTER-RECOVERY.md).

`npm start` / `npm run dev` hiện kiểm tra `/api/health/ready` trước khi mở Expo. Nếu backend local chưa chạy, launcher build bằng Maven cache đã có rồi chạy backend; không tự tải thư viện, không chạy migration/reset và không dùng Docker. Log nằm trong `.tmp/local-development/backend.log` trên ổ chứa dự án. Nếu backend đã chạy thì dùng lại; Ctrl+C chỉ dừng các tiến trình do chính launcher mở.

- Điện thoại và máy tính cùng Wi-Fi. Mở `http://<IP máy tính>:8080/api/health/ready` trong Safari; phải thấy `ready` trước khi kiểm thử nghiệp vụ.
- IP Wi-Fi thay đổi: cập nhật `EXPO_PUBLIC_API_URL` trong `.env`, khởi động lại Metro bằng `npm start -- --clear --go --lan`. Khi chưa cấu hình URL và có đúng một card LAN phù hợp, launcher dùng IP đó cho phiên chạy.
- OSRM là tiến trình riêng đã cài trước đó. Backend dùng `OSRM_MOTORBIKE_BASE_URL`; `ready` chỉ xác nhận database, không xác nhận OSRM hoặc GPS điện thoại.
- `npm run dev:backend` chỉ mở backend; `npm run dev:frontend` chỉ mở Expo sau khi API đã sẵn sàng. Nếu vừa sửa backend, dừng tiến trình backend cũ rồi chạy lại để build mã mới.
- Production phải dùng tài khoản database runtime `motorescue_api`, không dùng `postgres`. Launcher không tự đổi mật khẩu hoặc quyền database.

Backend:

```powershell
cd backend
.\mvnw.cmd test
cd ..
npm run dev:backend # nạp .env cho backend
```

Database mới/schema trống chỉ cần chạy `scripts/01_init_database.sql`: dựng schema B1–V13 và kiểm tra RLS/quyền trước khi commit. Tùy chọn chạy `scripts/02_seed_demo_teams.sql` để thêm 12 cửa hàng mô phỏng, không seed ca hay review giả. Xem [thứ tự SQL và tài khoản demo](./scripts/README.md). Database đã có dữ liệu không chạy lại init; migration Flyway gốc vẫn được giữ và không trộn hai cách quản lý trên cùng database.

## Expo SDK 58

Dự án nâng từ SDK 57 lên SDK 58 theo phê duyệt của chủ dự án, dùng React Native `0.88.1` và React `19.3.0`. Giữ cả `package.json` và `package-lock.json` đồng bộ; không chỉ đổi số `sdkVersion` trong app config. Các bản nâng SDK tiếp theo vẫn cần được chủ dự án phê duyệt.

Sau khi cập nhật mã nguồn, dừng Metro cũ, chạy `npm ci` rồi `npm run dev -- -c`. Máy tính và iPhone cần truy cập được nhau qua mạng LAN; quét QR bằng Camera trên iPhone để mở Expo Go. Không dùng `--localhost` cho điện thoại thật vì loopback trên điện thoại không trỏ đến máy tính.

Expo Go trên thiết bị **phải hỗ trợ SDK 58**; số phiên bản ứng dụng Expo Go không phải số SDK. Xem [hướng dẫn nâng Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). Không tự nâng SDK mỗi lần khởi động: các thư viện native phải được đồng bộ và kiểm thử cùng nhau.

Expo Go chỉ dùng cho các luồng tương thích với môi trường này. App không đăng ký remote push trong Expo Go; kiểm thử push cần development/preview build. Cơ chế hiện tại không dùng GPS nền để nhận ca. Type-check, unit test và export bundle không thay thế kiểm thử đăng nhập OTP, bản đồ, quyền GPS và điều hướng trên iPhone thật.

## Kiểm tra

Để thử đủ ba vai trò mà không nhận SMS/email, dùng [thiết lập tài khoản kiểm thử](./scripts/README.md).
Form đăng nhập nhập email/mật khẩu trực tiếp, không có nút chọn tài khoản hoặc vai trò. Form này được bật trong bản phát triển và APK staging; phiên Supabase và quyền trong database vẫn là thật. Chỉ có code/script không có nghĩa tài khoản đã được tạo trên cloud: phải hoàn tất bước setup.

### Tài khoản demo hiện có

**Email và mật khẩu đầy đủ trên máy này:** [mở README tài khoản demo](./.tmp/README.md). File chứa mật khẩu nằm trong `.tmp`, được Git bỏ qua; bảng dưới đây có thể lưu trong README của repository.

| Vai trò | Email |
| --- | --- |
| Khách hàng | `customer.rescue@example.com` |
| Cứu hộ 1 — Hải Châu | `provider.rescue@example.com` |
| Cứu hộ 2 — Hải Châu | `provider2.rescue@example.com` |
| Cứu hộ 3 — Mỹ An | `provider3.rescue@example.com` |
| Cứu hộ 4 — Hòa Xuân | `provider4.rescue@example.com` |
| Quản trị viên | `admin.rescue@example.com` |

Đây là tài khoản mô phỏng, không dùng số điện thoại demo để gọi thật. Bản clone mới không có README mật khẩu local; cần tạo tài khoản cho đúng dự án Supabase trước khi đăng nhập.

Rà soát chức năng quản trị và quyền sửa/xóa đánh giá: [biên bản ngày 10/11/2026](./docs/ADMIN-CRUD-AUDIT-2026-11-10.md).

```powershell
npm run check
cd backend
.\mvnw.cmd clean test
```

Chưa đủ bằng chứng để gọi dự án production-ready. Các gate Supabase staging, OSRM xe máy, push và hai thiết bị thật nằm trong [release checklist](./docs/RELEASE_READINESS.md). Biên bản rà soát local trước đây: [09/10/2026](./docs/PROJECT_AUDIT_2026-10-09.md); hướng dẫn cài hiện hành nằm ở [scripts/README.md](./scripts/README.md).
