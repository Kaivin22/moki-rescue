# Release readiness - 05/09/2026

## Kết luận

Repository đã được chuyển hoàn toàn từ app lập lịch du lịch sang Moki Rescue. Mã nguồn hiện là **release candidate**, không được gọi là production-ready cho tới khi các gate hạ tầng và thiết bị bên dưới qua.

## Đã xác minh trong workspace

- TypeScript strict: đạt.
- ESLint và Prettier check: đạt, không còn warning.
- Frontend local: 12 suite, 80 test đạt; CI vẫn là nguồn quyết định của commit phát hành.
- Backend local: 69 test đạt, 0 fail và 0 skip. Trong đó 26 integration test chạy Flyway trên PostgreSQL 16/PostGIS thật bằng Testcontainers, gồm API/Spring context, runtime role, account/quota/push, migration, ca/idempotency, state/version, matching, recovery và RLS. JWT decoder/OSRM/Expo được giả lập; chưa kiểm chứng dịch vụ thật.
- Docker image build và smoke đạt: API non-root/read-only, B1/V2/V3/V4 và readiness với PostGIS tạm trên mạng internal. Database/container thử nghiệm đã được dọn; không chạy SQL lên Supabase.
- Test API phát hiện và đã sửa lỗi destination null gây HTTP 500; smoke khởi động phát hiện và đã sửa vòng phụ thuộc của lịch quét push receipt. Test Spring context hiện khởi tạo cả scheduled jobs thật.
- Test 101 ca xác nhận offer hết hạn không bị bỏ sót sau 100 ca còn hạn; quét lại không gửi thông báo trùng.
- Expo SDK 54 được giữ nguyên; package native mới được cài theo ma trận SDK 54.
- `npm audit` lần ghi nhận 30/08/2026: 0 critical, 9 high, 10 moderate; chưa audit lại trong đợt này. Các bản sửa npm đề xuất ép Expo 57 nên chưa áp dụng `--force`; CI chặn critical và theo dõi phần còn lại.
- Public config không chứa secret backend và export Android/iOS/web: đạt ngày 22/08/2026. Hai bản vá đã được chủ dự án phê duyệt và áp dụng: `expo ~54.0.37`, `expo-constants ~18.0.14`; dự án vẫn ở SDK 54.
- Không còn route, package Java, schema, API hay tài liệu nghiệp vụ du lịch.
- App icon opaque và Android notification icon alpha/monochrome đã được kiểm tra kích thước/alpha.
- Push token rollover, ticket/receipt polling, retry có giới hạn, `DeviceNotRegistered` và retention metadata đã có code/test; vẫn phải smoke với credential và thiết bị thật.
- Cursor lịch sử/audit dùng cặp thời gian + ID, rate limit dùng PostgreSQL dùng chung và readiness kiểm kết nối database.
- Recovery điều phối và push outbox lưu cùng transaction, có lease/retry; push vẫn có thể gửi lặp khi crash đúng lúc. Availability GPS có task nền và cảnh báo foreground-only; kết quả Jest không thay thế kiểm thử native.

## External gate bắt buộc

1. Trên Supabase staging mới đã được chủ dự án phê duyệt, chạy Flyway `info` → `migrate` → `validate`, xác nhận `B1`, `V2`, `V3`, `V4` success trong `flyway_schema_history`, rồi chạy `02_verify_rls.sql`; database trống không được dùng lệnh `baseline`. Database đã có B1/V2 chỉ áp dụng V3/V4 trước rollout backend mới.
2. Bật phone OTP với SMS provider thật, rate limit và bot protection; test số Việt Nam hợp lệ/không hợp lệ/quá nhiều OTP.
3. Bootstrap đúng một admin theo số E.164. Với mỗi provider, tự đăng nhập OTP một lần rồi dùng giao diện admin để tra tài khoản; tạo đội bằng mã hồ sơ nội bộ, cấp provider, khai báo capability, hoàn tất checklist và chỉ sau đó kích hoạt. Thử bỏ từng điều kiện phải bị chặn; kiểm `verified_by`, `verified_at` và audit.
4. Dùng OSRM xe máy thật: chứng minh mọi candidate hợp lệ được route theo lô, ETA/Polyline bám tuyến đường và `NoRoute` không sinh đường thẳng.
5. Lặp lại trên Supabase staging kịch bản cạnh tranh hai provider nhận cùng ca; chỉ một transaction thành công và trạng thái request/offer/provider phải nhất quán như integration test local.
6. Dùng preview build Android/iOS: background location, push, private realtime, notification deep link, kill/resume app, token rollover, xóa token khi logout và xác minh receipt `DeviceNotRegistered` vô hiệu đúng installation.
7. Sau khi nhận ca, customer thấy tên và số công việc đúng của provider, gọi được bằng trình gọi hệ thống; tài khoản ngoài ca và ca đã đóng không nhận được số.
8. Kiểm RLS với customer A, customer B, provider không liên quan, assigned provider, dispatcher và admin. Không bên lạ nào xem được exact GPS.
9. Xác minh Cron job chạy, xem `cron.job_run_details`, checkpoint/receipt cũ bị xóa và ca đóng bị làm mờ sau ngưỡng.
10. Chỉnh polygon `service_zones` và kiểm cả điểm đón/điểm giao ở sát biên; tâm viewport mobile không được dùng làm luật nhận ca.
11. Test status bar/tai thỏ/Dynamic Island/camera cutout, bàn phím, font scale, Reduce Motion và map controls trên thiết bị thật.
12. Cấu hình monitoring, log redaction, backup/restore drill, Maps restriction, CORS, secret manager và rollback backend/mobile.
13. Kiểm ChatBox với câu trong app/ngoài lề/chẩn đoán/khẩn cấp, quota theo hai tài khoản; xác nhận Gemini key không có trong Expo public config/bundle và database/log không có nội dung chat.

## Kịch bản demo bảo vệ

Checklist có thể ghi bằng chứng kiểm thử, giới hạn còn lại và điều kiện phê duyệt:
[`STAGING_VALIDATION.md`](STAGING_VALIDATION.md). Chưa đánh dấu các external gate đạt.

- Một customer, hai provider cùng capability, một provider không có capability và một dispatcher.
- Trước ca cứu hộ, chứng minh tài khoản mới luôn là customer; đội pending không thể nhận ca; admin chỉ kích hoạt được sau khi đủ checklist/capability/provider mà không upload giấy tờ.
- Customer tạo ca từ GPS thật; provider sai capability không nhận offer.
- Hai provider cùng bấm nhận; chỉ một thành công.
- Customer xem private live location và route thật; tài khoản không liên quan bị từ chối.
- Provider yêu cầu xác nhận đã đến, gửi báo giá, chờ khách duyệt, yêu cầu xác nhận hoàn tất.
- Thử customer hủy khi provider đang đến, provider trả ca và admin đình chỉ provider giữa ca; chứng minh ca/cờ điều phối chuyển đúng và GPS cuối được xóa khi provider rời ca.
- Customer review; thử review một ca chưa xong phải bị chặn.
- Customer gửi khiếu nại tách khỏi review; dispatcher xử lý và admin xem được audit tương ứng.
- Tạo đủ review staging để kiểm ngưỡng uy tín: chưa đủ mẫu không cảnh báo; điểm thấp mở tín hiệu; admin ẩn spam, gửi cảnh báo có lý do; ba cảnh báo chỉ đề nghị xem xét và không tự đình chỉ đội.
- Tạo ca không có provider và chứng minh `no_provider` + hotline thay vì spinner vô hạn.

Không gắn nhãn dữ liệu demo là đối tác/ca thật. Demo phải dùng staging project riêng.
