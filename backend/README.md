# MotoRescue API

Spring Boot là ranh giới tin cậy duy nhất cho mutation nghiệp vụ. Mobile không được ghi trực tiếp ca, báo giá, đề nghị điều phối hay audit log.

## Trách nhiệm

- Xác minh Supabase JWT qua JWKS và đọc vai trò/trạng thái từ `profiles`.
- Tạo ca idempotent, kiểm tra vùng phục vụ, chống ca song song và rate limit theo database.
- Lọc ứng viên hợp lệ bằng PostGIS, route toàn bộ danh sách theo các lô OSRM Table và xếp hạng ETA đường xe máy.
- Phát đề nghị có TTL, tự hết hạn bằng scheduled job và nhận ca nguyên tử tại PostgreSQL.
- Kiểm tra state machine, optimistic version, xác nhận hai phía và báo giá.
- Nhận checkpoint GPS có giới hạn, phát push và ghi audit cho thao tác nhạy cảm.
- Quản lý mạng đối tác khép kín: mã hồ sơ nội bộ, checklist ngoại tuyến, năng lực, provider và dispatcher. Chỉ kích hoạt đội khi đủ điều kiện; không lưu bản hợp đồng/giấy tờ.
- Cung cấp trợ lý Gemini giới hạn trong cách dùng MotoRescue, lọc input trước model, kiểm output sau model và không lưu nội dung chat.

## API chính

- `/api/me/*`: hồ sơ, push token, yêu cầu xóa tài khoản.
- `/api/catalog/service-types`: danh mục sự cố đang hoạt động theo locale.
- `/api/operator/service-types/*`: admin sửa field catalog được allowlist và ghi audit.
- `/api/requests/*`: tạo/xem/hủy, state action, route, quote và review.
- `/api/provider/*`: sẵn sàng, vị trí, đề nghị và nhận ca.
- `/api/operator/*`: hàng đợi, retry dispatch, tạo/checklist/kích hoạt đội đối tác, phân vai trò, review gần đây và xử lý cảnh báo chất lượng.
- `/api/assistant/message`: trợ lý trong app cho tài khoản active, quota theo phút/ngày.

## Chạy

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

`OSRM_MOTORBIKE_BASE_URL` phải trỏ tới dataset đã preprocess bằng profile xe máy được kiểm chứng. Chuỗi `driving` trong URL không tự biến dataset ô tô thành xe máy. Khi router không trả tuyến hợp lệ, API trả trạng thái không khả dụng thay vì bịa Polyline thẳng.

Runtime database phải dùng `SPRING_DATASOURCE_USERNAME=motorescue_api`, không dùng `postgres`. `GEMINI_API_KEY` là secret backend bắt buộc nếu bật trợ lý và không bao giờ dùng prefix `EXPO_PUBLIC_`.
