# Release readiness - checklist cập nhật 09/10/2026

## Kết luận

Repository đã chuyển sang hệ thống cứu hộ. Chưa đủ bằng chứng để gọi mã nguồn hiện tại production-ready; cần đạt các gate hạ tầng và thiết bị bên dưới. Biên bản rà soát local ngày 09/10 nằm tại [PROJECT_AUDIT_2026-10-09.md](PROJECT_AUDIT_2026-10-09.md); đây là lịch sử, không suy ra trạng thái hiện tại từ số test của lần cũ.

## Biên bản lịch sử 09/09/2026 — không phải trạng thái hiện tại

Giữ nguyên các ghi nhận dưới đây để truy vết. Các số test, SDK, npm audit và GPS chờ ca thuộc phiên bản cũ; không dùng chúng làm kết quả kiểm chứng cho source hiện tại. Hiện source dùng tọa độ cửa hàng (V10) và thêm thông báo/hỗ trợ (V11).

- TypeScript strict: đạt.
- ESLint và Prettier check: đạt, không còn warning.
- Frontend local: 13 suite, 101 test đạt; CI vẫn là nguồn quyết định của commit phát hành.
- Backend sau khi chuyển sang chạy trực tiếp: biên dịch toàn bộ mã main/test và 45 unit test đạt. 31 integration test đã chuyển sang PostgreSQL/PostGIS native; chưa chạy lại vì chưa có cluster kiểm thử riêng trên máy. Không coi kết quả kiểm thử hạ tầng cũ là bằng chứng cho fixture mới.
- Đã bỏ đóng gói image, Compose, smoke image và phụ thuộc Testcontainers. CI cài PostgreSQL/PostGIS trực tiếp; chưa chạy workflow này trên GitHub, chưa triển khai hoặc chạy SQL lên Supabase.
- Test API phát hiện và đã sửa lỗi destination null gây HTTP 500; smoke khởi động phát hiện và đã sửa vòng phụ thuộc của lịch quét push receipt. Test Spring context hiện khởi tạo cả scheduled jobs thật.
- Test 101 ca xác nhận offer hết hạn không bị bỏ sót sau 100 ca còn hạn; quét lại không gửi thông báo trùng.
- Expo SDK 54 được giữ nguyên; package native mới được cài theo ma trận SDK 54.
- `npm audit` ngày 08/09/2026: 0 critical, 9 high, 16 moderate. Các bản sửa npm đề xuất ép Expo 57 nên chưa áp dụng `--force`; CI chặn critical và theo dõi phần còn lại.
- Export Android/iOS/web với cấu hình giả an toàn và kiểm tra package theo SDK 54 đạt ngày 09/09/2026. Dự án giữ `expo ~54.0.37`, `expo-constants ~18.0.14`, dùng WebView 13.15.0; chưa kiểm chứng bản native trên thiết bị.
- Không còn route, package Java, schema, API hay tài liệu nghiệp vụ du lịch.
- App icon opaque và Android notification icon alpha/monochrome đã được kiểm tra kích thước/alpha.
- Push token rollover, ticket/receipt polling, retry có giới hạn, `DeviceNotRegistered` và retention metadata đã có code/test; vẫn phải smoke với credential và thiết bị thật.
- Cursor lịch sử/audit dùng cặp thời gian + ID, rate limit dùng PostgreSQL dùng chung và readiness kiểm kết nối database.
- Recovery điều phối và push outbox lưu cùng transaction, có lease/retry; push vẫn có thể gửi lặp khi crash đúng lúc. Availability GPS có task nền và cảnh báo foreground-only; kết quả Jest không thay thế kiểm thử native.

## External gate bắt buộc

1. Trên Supabase staging được phép kiểm thử, cài schema trống bằng `scripts/01_init_database.sql` (B1–V11 + kiểm tra schema/RLS), hoặc dùng riêng Flyway `info` → `migrate` → `validate` đến V11. Không trộn hai cách, không baseline database trống. Database cũ cần giữ dữ liệu phải backup/nâng cấp theo runbook. Muốn kiểm tra lại chỉ đọc, sinh SQL bằng `node scripts/build-init-sql.cjs --verify`; hướng dẫn tại `scripts/README.md`.
2. Bật phone OTP với SMS provider thật, rate limit và bot protection; test số Việt Nam hợp lệ/không hợp lệ/quá nhiều OTP.
3. Bootstrap đúng một admin theo số E.164. Với mỗi provider, tự đăng nhập OTP một lần rồi dùng giao diện admin để tra tài khoản; tạo đội bằng mã hồ sơ nội bộ, cấp provider, khai báo capability, hoàn tất checklist và chỉ sau đó kích hoạt. Thử bỏ từng điều kiện phải bị chặn; kiểm `verified_by`, `verified_at` và audit.
4. Dùng OSRM xe máy thật: chứng minh mọi candidate hợp lệ được route theo lô, ETA/Polyline bám tuyến đường và `NoRoute` không sinh đường thẳng.
5. Lặp lại trên Supabase staging kịch bản cạnh tranh hai provider nhận cùng ca; chỉ một transaction thành công và trạng thái request/offer/provider phải nhất quán như integration test local.
6. Dùng preview build Android/iOS: sẵn sàng từ cửa hàng không cần GPS, OpenStreetMap, Google Maps ngoài app, push, notification deep link, kill/resume app, token rollover, xóa token khi logout và xác minh receipt `DeviceNotRegistered` vô hiệu đúng installation. Không kết luận Expo Go hỗ trợ push chỉ vì unit test đạt.
7. Sau khi nhận ca, customer thấy tên và số công việc đúng của provider, gọi được bằng trình gọi hệ thống; tài khoản ngoài ca và ca đã đóng không nhận được số.
8. Kiểm RLS với customer A, customer B, cứu hộ viên không liên quan, cứu hộ viên được phân công và admin. Không bên lạ nào xem được GPS chính xác.
9. Xác minh Cron job chạy, xem `cron.job_run_details`, checkpoint/receipt cũ bị xóa và ca đóng bị làm mờ sau ngưỡng.
10. Chỉnh polygon `service_zones` và kiểm cả điểm đón/điểm giao ở sát biên; tâm viewport mobile không được dùng làm luật nhận ca.
11. Test status bar/tai thỏ/Dynamic Island/camera cutout, bàn phím, font scale, Reduce Motion và map controls trên thiết bị thật.
12. Cấu hình monitoring, log redaction, backup/restore drill, chính sách tile OSM, CORS, secret manager và rollback backend/mobile.
13. Kiểm ChatBox với câu trong app/ngoài lề/chẩn đoán/khẩn cấp, quota theo hai tài khoản; xác nhận Gemini key không có trong Expo public config/bundle và database/log không có nội dung chat.
14. Kiểm hộp thông báo, trao đổi khách–admin, ghi chú nội bộ, đóng phiếu, thông báo theo nhóm vai trò và chống gửi trùng theo [COMMUNICATIONS.md](COMMUNICATIONS.md). Thông báo hỗ trợ/chung hiện không có remote push hoặc gửi offline.

## Kịch bản demo bảo vệ

Checklist có thể ghi bằng chứng kiểm thử, giới hạn còn lại và điều kiện phê duyệt:
[`STAGING_VALIDATION.md`](STAGING_VALIDATION.md). Chưa đánh dấu các external gate đạt.

- Một khách hàng, hai cứu hộ viên cùng năng lực, một cứu hộ viên không có năng lực phù hợp và một admin.
- Trước ca cứu hộ, chứng minh tài khoản mới luôn là customer; đội pending không thể nhận ca; admin chỉ kích hoạt được sau khi đủ checklist/capability/provider mà không upload giấy tờ.
- Customer tạo ca từ GPS thật; provider sai capability không nhận offer.
- Hai provider cùng bấm nhận; chỉ một thành công.
- Customer xem vị trí cửa hàng được lưu khi nhận ca và tuyến OSRM; không có di chuyển live, tài khoản không liên quan bị từ chối.
- Provider yêu cầu xác nhận đã đến, gửi báo giá, chờ khách duyệt, yêu cầu xác nhận hoàn tất.
- Thử customer hủy khi provider đang đến, provider trả ca và admin đình chỉ provider giữa ca; chứng minh ca/cờ điều phối chuyển đúng và snapshot phân công được xóa khi provider rời ca.
- Customer review; thử review một ca chưa xong phải bị chặn.
- Khách hàng gửi khiếu nại tách khỏi đánh giá; admin xử lý và xem được audit tương ứng.
- Tạo đủ review staging để kiểm ngưỡng uy tín: chưa đủ mẫu không cảnh báo; điểm thấp mở tín hiệu; admin ẩn spam, gửi cảnh báo có lý do; ba cảnh báo chỉ đề nghị xem xét và không tự đình chỉ đội.
- Tạo ca không có provider và chứng minh `no_provider` + hotline thay vì spinner vô hạn.

Không gắn nhãn dữ liệu demo là đối tác/ca thật. Demo phải dùng staging project riêng.
