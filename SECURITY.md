# Bảo mật Moki Rescue

## Mô hình tin cậy

- Mobile là client không tin cậy. Supabase publishable/anon key và Maps key có thể xuất hiện trong binary; an toàn đến từ RLS, API authorization, quota và key restriction.
- Database credential, Expo access token, Gemini key và mọi secret server chỉ nằm trong secret manager của backend.
- Đăng ký công khai luôn tạo vai trò `customer`. Chỉ admin đã bootstrap theo đúng một số điện thoại mới có thể cấp vai trò nội bộ.
- Admin tra cứu chính xác tài khoản bằng số đăng nhập qua backend; hàm SQL tối thiểu không mở cho client, không trả lại số điện thoại và audit chỉ ghi UUID tài khoản được tra.
- Provider không có form tự đăng ký hoặc tài khoản dùng chung. Mỗi người tự xác thực OTP một lần, sau đó admin mới gắn tài khoản đó vào đội đối tác đã ký hợp tác ngoại tuyến.
- Database chỉ giữ mã hồ sơ đối tác nội bộ, kết quả checklist, admin và thời điểm xác minh. Không lưu tài liệu pháp lý, CCCD, giấy phép hay số giấy tờ trong bảng nghiệp vụ.
- Đội chỉ chuyển sang `verified` khi đủ checklist đang áp dụng, ít nhất một capability và một provider active; đình chỉ làm toàn bộ provider của đội ngừng nhận ca mới.
- Tất cả business mutation đi qua Spring Boot; RLS chặn truy cập chéo và direct mutation từ client.

## Dữ liệu và vị trí

- Không thu CCCD, bằng lái, danh bạ, tài khoản ngân hàng hay lịch sử GPS ngoài ca.
- Số đăng nhập của người dùng do Supabase Auth quản lý, không sao chép vào `public.profiles`.
- `provider_members.contact_phone_e164` là số công việc riêng do admin xác minh, không tự lấy từ Auth. Backend chỉ trả số này cho các bên của ca khi ca đã được phân công và còn hoạt động; push notification và log không chứa số.
- Trước khi nhận ca, provider chỉ thấy khu vực tương đối. Sau khi nhận, vị trí chính xác chỉ hiển thị cho các bên của ca và nhân sự điều phối.
- Private Realtime channel dùng RLS trên `realtime.messages`; quyền phát vị trí chỉ thuộc provider được phân công.
- Checkpoint GPS hết hạn sau 24 giờ. Ca đã đóng được làm mờ tọa độ và xóa ghi chú nhạy cảm sau 30 ngày bằng Supabase Cron.

## Chống lạm dụng

- OTP rate limit/CAPTCHA được cấu hình tại Supabase Auth.
- Mỗi khách chỉ có một ca đang mở và tối đa ba lần tạo trong 10 phút.
- Nhận ca nguyên tử, state machine và optimistic version ngăn thao tác cạnh tranh/sai thứ tự.
- Review chỉ có sau ca `completed`, mỗi ca một review. Điểm đội chỉ tính review không bị ẩn và phải đủ cỡ mẫu cấu hình mới mở tín hiệu chất lượng.
- Điểm thấp không tự khóa tài khoản hoặc đội. Admin xem review/ca liên quan, ẩn spam với lý do, phát cảnh báo có audit rồi mới quyết định đình chỉ; hệ thống chỉ đưa ra khuyến nghị xem xét.
- Push body không chứa tọa độ chính xác; log không được ghi JWT, OTP, số điện đầy đủ hay database URL có credential.
- Câu ngoài phạm vi/chẩn đoán xe/khẩn cấp được xử lý trước Gemini; quota theo tài khoản không lưu nội dung chat. Prompt và reply không đi vào database hoặc audit log.
- Phản hồi Gemini được kiểm lại trước khi trả về; output ngoài phạm vi hoặc chứa dữ liệu nhạy cảm bị thay bằng phản hồi local. Gemini key không đi vào Expo config/bundle.
- Consent chỉ hợp lệ khi `terms_version` khớp phiên bản backend hiện hành; thay đổi điều khoản buộc xác nhận lại.
- Push token gắn với UUID cài đặt app và chỉ được xóa bằng đúng user + token + installation. Notification không chứa tọa độ hay số liên hệ.
- Receipt worker chỉ lưu ticket/status/error code, không lưu payload; `DeviceNotRegistered` chỉ vô hiệu device row đã nhận ticket và token mới đăng ký sẽ tạo binding khác.
- Lỗi OSRM không log URL vì URL chứa tọa độ chính xác.

## Secret và phát hành

- Không commit `.env`, `*.jks`, `*.p8`, `*.p12`, `*.key` hay private key. `.env.example` chỉ chứa placeholder và được phép đưa lên GitHub.
- Giới hạn Maps key theo package `com.danang.motorescue`, signing SHA-1 và iOS bundle ID tương ứng.
- Production dùng HTTPS, PostgreSQL TLS, CORS allowlist, Supabase asymmetric JWT/JWKS và branch protection.
- Backend dùng role `motorescue_api` không có quyền DDL/superuser; tài khoản `postgres` chỉ dành cho cài đặt/bảo trì schema.
- Không chạy `npm audit fix --force`; việc nâng Expo phải theo ma trận SDK và smoke native build.
- Nếu secret từng xuất hiện trong commit/log, phải thu hồi và rotate; xóa ở commit sau không xóa được lịch sử.

## Báo cáo lỗ hổng

Không tạo issue công khai có token, số điện, tọa độ hoặc dữ liệu ca. Gửi báo cáo qua kênh riêng của chủ repository, kèm phiên bản và cách tái hiện đã khử dữ liệu cá nhân.
