# Moki Rescue

Ứng dụng điều phối cứu hộ xe máy theo thời gian thực cho một mạng lưới kín gồm các đội đối tác đã được xác minh tại Đà Nẵng. Sản phẩm không phải sàn mở cho thợ tự đăng ký và không thay thế 113/114/115.

## Mô hình sử dụng

- **Khách đi xe máy** tạo yêu cầu, xác nhận vị trí, theo dõi cứu hộ viên, duyệt báo giá và đánh giá 1–5 sao cho ca đã hoàn thành.
- **Cứu hộ viên** là thành viên của một đội đối tác đã được xác minh ngoại tuyến; họ bật sẵn sàng, nhận đề nghị phù hợp và cập nhật quy trình xử lý.
- **Điều phối viên** là nhân sự của đơn vị vận hành trung tâm, theo dõi ca và tìm lại đội khi hệ thống chưa ghép được.
- **Admin** là quản trị vận hành của chính đơn vị trung tâm. Admin quản lý đội, năng lực, catalog, quyền nhân sự và cảnh báo chất lượng; admin không mặc nhiên là cứu hộ viên và không có khái niệm VIP.

Đây là sản phẩm cho **một đơn vị điều phối trung tâm quản lý mạng lưới kín nhiều đội cứu hộ nhỏ**, không phải ứng dụng riêng của một đội và cũng không phải marketplace để doanh nghiệp tự đăng ký hoặc đấu giá công khai. Thuật toán tự gửi đề nghị đến các cứu hộ viên đủ điều kiện theo ETA đường thực tế.

MVP chưa thu tiền trong ứng dụng. Cứu hộ viên gửi báo giá, khách duyệt trước khi làm; thao tác duyệt giá **không phải xác nhận đã thanh toán**. Khách thanh toán trực tiếp bằng tiền mặt hoặc kênh ngoài hệ thống. Nếu phát triển thương mại, nguồn thu đơn giản nhất là phí kết nối nhỏ trên ca hoàn tất hoặc phí đối tác; đồ án không xây ví, đối soát hay kế toán.

## Phạm vi đã triển khai

- Đăng nhập bằng số điện thoại và OTP qua Supabase; tài khoản mới luôn là khách hàng.
- Đơn vị cứu hộ không có trang tự đăng ký. Sau khi ký hợp tác ngoại tuyến, admin tạo đội với mã hồ sơ nội bộ, cấp quyền cho các tài khoản đã tự đăng nhập OTP và chỉ kích hoạt khi đủ checklist, năng lực và nhân sự.
- Giao diện theo bốn vai trò: khách, cứu hộ viên, điều phối và admin vận hành.
- Phân loại nguy cơ trước khi tạo ca; ca khẩn cấp được chuyển sang trình gọi hệ thống.
- Khách xác nhận hoặc kéo ghim điểm cứu hộ trên bản đồ trước khi gửi; không chỉ tin vào GPS thô.
- Catalog/chi tiết dịch vụ lấy từ backend; có trung tâm trợ giúp, hướng dẫn an toàn và trạng thái bảo mật tài khoản.
- Tạo ca có idempotency, giới hạn spam, kiểm tra vùng phục vụ và chỉ một ca đang mở mỗi khách.
- Khách có thể chọn điểm giao cho ca vận chuyển, hủy có lý do trước khi xác nhận đội đã đến, hoặc gửi yêu cầu hỗ trợ/khiếu nại khi ca đã đi sâu hơn.
- Lọc PostGIS theo năng lực/bán kính/độ mới và độ chính xác GPS, sau đó xếp hạng toàn bộ ứng viên bằng ETA OSRM theo đường xe máy. Không dùng đường chim bay làm kết quả cuối.
- Phát nhiều đề nghị có thời hạn; chỉ một cứu hộ viên có thể nhận ca nhờ transaction nguyên tử.
- State machine phía server, optimistic version, lịch sử chỉ thêm và audit log.
- Vị trí live qua private Realtime Broadcast; checkpoint tối thiểu, outbox GPS khi mất mạng và job xóa/làm mờ dữ liệu.
- Sau khi nhận ca, khách thấy tên, đội, phương tiện và số liên hệ công việc đã xác minh của cứu hộ viên; số bị ẩn khi ca đóng.
- Bản đồ ca toàn màn hình theo dõi provider bằng GPS live và chỉ vẽ geometry tuyến đường bộ do router trả về.
- Xác nhận hai phía khi đến và hoàn thành; báo giá phải được khách duyệt.
- Đánh giá chỉ gắn với ca đã hoàn thành, có sửa và xóa.
- Ca mất provider chuyển sang hàng chờ điều phối lại; timeout, GPS cũ và xác nhận quá hạn tạo cờ attention thay vì quay loading vô hạn.
- Điểm uy tín cứu hộ viên/đội chỉ tính từ đánh giá thật không bị ẩn. Hệ thống mở tín hiệu khi đủ mẫu và điểm thấp; admin kiểm tra review, gửi cảnh báo hoặc đình chỉ thủ công. Không tự khóa đội chỉ bằng điểm sao.
- Push notification theo cài đặt thiết bị, tự đồng bộ token rollover, kiểm tra Expo receipt để dừng token không còn hợp lệ; onboarding, giao diện vi/en, consent versioned, yêu cầu xóa tài khoản và quy trình xác minh đội đối tác có audit.
- Admin chỉnh được nội dung catalog nghiệp vụ song ngữ và trạng thái nhận ca; layout giao diện vẫn được kiểm soát trong codebase.
- Admin có danh sách nhân sự đội, khiếu nại, cờ cần can thiệp và audit phân trang; dispatcher chỉ nhận quyền vận hành cần thiết.
- ChatBox Gemini dạng bong bóng nổi chỉ hướng dẫn cách dùng Moki Rescue/quy trình trong app; câu ngoài lề, chẩn đoán xe và khẩn cấp được chặn cục bộ trước khi dùng quota.

Thanh toán, ví, AI chẩn đoán, chatbot kiến thức chung, dashboard web và marketplace mở không thuộc MVP.

## Kiến trúc

```text
app/                 Expo Router screens theo vai trò
src/features/        Auth, location, notification, rescue và trợ lý trong app
src/components/      UI/map adapter dùng chung
backend/             Spring Boot 3 / Java 21 - cổng mutation tin cậy
scripts/             Supabase schema, RLS, bootstrap và retention
docs/                Kiến trúc, triển khai, release checklist
__tests__/           Contract/unit test phía mobile
```

Danh mục bàn giao thiết kế gồm số route và toàn bộ frame nghiệp vụ nằm tại [docs/FIGMA_SCREEN_INVENTORY.md](./docs/FIGMA_SCREEN_INVENTORY.md).

Đặc tả hiện hành nằm tại [specs/Moki_Rescue_ky_thuat.txt](./specs/Moki_Rescue_ky_thuat.txt) và [specs/Moki_Rescue_UI_Stitch.txt](./specs/Moki_Rescue_UI_Stitch.txt). Kết quả rà soát dữ liệu cứng/mẫu nằm tại [docs/HARDCODE_AND_MOCK_AUDIT.md](./docs/HARDCODE_AND_MOCK_AUDIT.md).

Mobile là client không tin cậy. Các thay đổi nghiệp vụ đi qua Spring Boot; Supabase RLS vẫn là lớp phòng thủ cuối. Xem [kiến trúc chi tiết](./docs/ARCHITECTURE.md).

## Cài đặt local

Yêu cầu Node `>=20.19`, npm và JDK 21.

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Điện cấu hình thật theo [hướng dẫn triển khai](./docs/DEPLOYMENT.md). Trên điện thoại thật, `EXPO_PUBLIC_API_URL` phải là HTTPS hoặc IP LAN truy cập được; `localhost` là chính điện thoại.

Backend:

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Database mới chạy theo đúng thứ tự trong [scripts/README.md](./scripts/README.md). Không có seed ca, vị trí, đội hay review giả; danh mục loại sự cố là cấu hình sản phẩm.

## Expo SDK 54

Dự án chủ đích giữ Expo SDK 54 để không phá luồng quét QR bằng Expo Go mà chủ dự án đang dùng. `AGENTS.md` chỉ hướng dẫn coding agent và không thể tự nâng dependency. Background location và remote push không được kiểm chứng đầy đủ trong Expo Go; production phải dùng development/preview build.

## Kiểm tra

```powershell
npm run check
cd backend
.\mvnw.cmd clean test
```

Repository chỉ được coi là release candidate. Các gate Supabase staging, OSRM xe máy, push, background GPS và hai thiết bị thật nằm trong [release checklist](./docs/RELEASE_READINESS.md).
