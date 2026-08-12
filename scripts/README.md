# Cài mới Supabase

Bộ SQL này dành cho việc tạo lại database từ đầu và không chứa địa điểm, đánh giá hoặc số liệu mẫu.

Chạy trong Supabase SQL Editor bằng tài khoản chủ dự án, đúng thứ tự:

1. `00_reset.sql` — xóa schema ứng dụng và object trong các bucket `place-images`, `place-revisions`, `avatars`.
2. `01_schema.sql` — tạo extension, bảng, constraint, index, trigger, RPC, bucket, quyền và RLS hoàn chỉnh.
3. Trên **staging**, chạy `02_verify_rls.sql` để kiểm tra anon/user A/user B/admin, RPC atomic và vòng đời share token. Script test tự `ROLLBACK` và không phải migration production.

Không còn file seed hoặc migration nối tiếp. Sau khi hai script chạy thành công, hãy tạo người dùng qua Supabase Auth rồi cấp quyền quản trị đầu tiên trong SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'UUID_CUA_USER';
```

## Lưu ý an toàn

- Trước `00_reset.sql`, phải chạy `SET app.allow_destructive_reset = 'yes';` trong cùng phiên SQL. File sẽ dừng nếu thiếu cờ này.
- `00_reset.sql` xóa toàn bộ dữ liệu ứng dụng và các bucket thuộc dự án; không chạy trên môi trường có dữ liệu cần giữ.
- Không đưa service-role key vào ứng dụng mobile.
- Giao dịch VIP chỉ được backend/service role ghi sau khi xác minh với App Store hoặc Google Play; client không được tự tạo giao dịch hay tự cấp VIP.
- `vip_plans` lưu catalog và Product ID; giá hiển thị thực tế phải lấy từ store, không hardcode trong ứng dụng.
- Hủy tự động gia hạn phải thực hiện/đồng bộ với store. Chỉ sửa `vip_status` trong database không có tác dụng dừng thu tiền.
- Địa điểm thật được nhập qua giao diện editor và duyệt bởi admin; không thêm dữ liệu giả vào SQL.
- Nếu `00_reset.sql` báo bucket còn object, kiểm tra lại quyền của tài khoản đang chạy SQL Editor.
