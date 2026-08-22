# Cài mới cơ sở dữ liệu MotoRescue

Bộ SQL này dành cho một Supabase project mới hoặc staging. Không chạy `00_reset.sql` trên môi trường có dữ liệu cần giữ.

## Thứ tự chạy

1. Trong **cùng một lần Run** của SQL Editor, đặt câu lệnh xác nhận trước nội dung `00_reset.sql`:

   ```sql
   SELECT set_config('app.confirm_motorescue_reset', 'RESET_MOTORESCUE', false);
   ```

2. Chạy `01_schema.sql` để tạo toàn bộ bảng, dữ liệu danh mục chuẩn, constraint, index, trigger, quyền và RLS. Script tự backfill các tài khoản còn tồn tại trong `auth.users` về vai trò `customer`.
3. Tạo mật khẩu ngẫu nhiên riêng cho role backend do schema vừa tạo, rồi lưu đúng giá trị vào secret store của backend (không commit câu lệnh đã điền mật khẩu):

   ```sql
   ALTER ROLE motorescue_api PASSWORD '<RANDOM_PASSWORD>';
   ```

4. Chạy `02_verify_rls.sql`. Script chỉ kiểm tra metadata bảo mật, không tạo fixture và không sửa dữ liệu nghiệp vụ.
5. Đăng nhập OTP bằng tài khoản vận hành đầu tiên, sửa đúng **một số điện thoại E.164** trong `03_bootstrap_operator.sql`, rồi chạy script đó. Script dừng nếu còn giá trị mẫu hoặc số điện thoại không khớp đúng một tài khoản.
6. Trên production, chạy `04_schedule_retention.sql` để xóa checkpoint GPS sau 24 giờ, làm mờ vị trí/nội dung nhạy cảm của ca đã đóng sau 30 ngày và xóa dấu quota trợ lý sau 2 ngày.

Không còn migration `05`: lần reset này đã hợp nhất số liên hệ công việc và mọi thay đổi vào `01_schema.sql`. Không chạy lại bất kỳ SQL cũ nào ngoài các tệp đang có trong thư mục này.

Không có seed đội cứu hộ, vị trí, yêu cầu hay đánh giá giả. Danh mục loại sự cố trong `01_schema.sql` là dữ liệu cấu hình chính thức của sản phẩm, không phải mock data.

## Nguyên tắc vận hành

- Ứng dụng mobile chỉ giữ `anon key`. Tuyệt đối không đóng gói `service_role` hoặc mật khẩu database vào app.
- Spring runtime đăng nhập bằng `motorescue_api`, không dùng `postgres`. Role này không có DDL/superuser và chỉ nhận grant cần cho API.
- Client chỉ đọc dữ liệu được RLS cho phép. Mọi thay đổi nghiệp vụ (tạo yêu cầu, nhận đơn, đổi trạng thái, báo giá, phân công) đi qua Spring Boot API.
- Tài khoản đăng ký công khai luôn là `customer`; không có đăng ký provider công khai. Mỗi cứu hộ viên tự đăng nhập OTP một lần, sau đó admin mới tra đúng số đăng nhập và cấp quyền vào một đội. Không tạo mật khẩu hộ và không dùng tài khoản chung.
- Đội đối tác được tạo sau thỏa thuận ngoại tuyến bằng một mã hồ sơ nội bộ duy nhất. Admin phải hoàn tất checklist database-driven, khai báo ít nhất một năng lực và cấp ít nhất một provider active trước khi chuyển đội sang `verified`; lần xác minh lưu admin/thời điểm và audit.
- Năng lực thuộc về đội, được admin quản lý riêng; thêm một cứu hộ viên không được thay đổi tập năng lực của đội.
- Số liên hệ của cứu hộ viên là số công việc do admin nhập và xác minh, không sao chép từ `auth.users`; backend chỉ trả số này khi ca được phân công và còn hoạt động.
- Không lưu CCCD, giấy phép lái xe, file hợp đồng hoặc ảnh hồ sơ xác minh trong database dùng chung. Chỉ lưu mã tham chiếu nội bộ, kết quả checklist và dấu audit tối thiểu.
- Vị trí chính xác chỉ được dùng khi yêu cầu đang hoạt động. Job lưu vệt GPS cũ phải được cấu hình xóa định kỳ theo chính sách lưu trữ của tổ chức vận hành.
- Không ghi nhận thanh toán trong ứng dụng. Giá được khách xác nhận trước; việc thu tiền diễn ra bằng tiền mặt hoặc kênh ngoài hệ thống.
- RLS là lớp giới hạn truy cập, không thay cho kiểm tra vai trò và state machine ở backend.
- `assistant_usage_events` chỉ lưu tài khoản + thời điểm để giới hạn quota; không lưu câu hỏi/câu trả lời ChatBox.
- `push_devices` dùng `installation_id` ngẫu nhiên của cài đặt app; không dùng số điện thoại hay hardware identifier làm khóa thiết bị.
- Catalog baseline có thể được admin sửa qua backend sau khi bootstrap; mã service giữ bất biến để bảo toàn khóa ngoại và lịch sử ca.
- Review lưu cả provider và đội tại thời điểm phục vụ. `team_quality_alerts` chỉ là tín hiệu; admin phải kiểm tra review, ghi lý do cảnh báo/kiểm duyệt và tự quyết định trạng thái đội. Database không tự đình chỉ theo điểm sao.
