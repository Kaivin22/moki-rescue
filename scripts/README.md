# Cài mới Supabase

Bộ SQL này dùng để tạo database từ đầu. Schema không tự chèn dữ liệu; catalog địa điểm thật là bước tùy chọn riêng.

Chạy trong Supabase SQL Editor bằng tài khoản chủ dự án, đúng thứ tự:

1. `00_reset.sql` — xóa schema ứng dụng và object trong các bucket `place-images`, `place-revisions`, `avatars`.
2. `01_schema.sql` — tạo extension, bảng, constraint, index, trigger, RPC, bucket, quyền và RLS hoàn chỉnh.
3. Trên **staging**, chạy `02_verify_rls.sql` để kiểm tra anon/user A/user B/admin, RPC atomic, vote hợp lệ/không hợp lệ và vòng đời share token. Fixture tự chọn ngày tương lai, toàn bộ test `ROLLBACK` và không phải migration production.
4. Tùy chọn chạy `03_seed_real_places.sql` để nạp 15 địa điểm Đà Nẵng thật có nguồn và tọa độ. Script không bịa rating, không hotlink ảnh và không ghi đè dữ liệu Admin đã chỉnh.

Sau khi cài schema, hãy tạo người dùng qua Supabase Auth rồi cấp quyền quản trị đầu tiên theo đúng email trong SQL Editor:

```sql
UPDATE public.profiles AS p
SET role = 'admin', is_banned = FALSE
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(u.email) = lower('email-admin-cua-ban@example.com')
RETURNING p.id, u.email, p.role, p.is_banned;
```

Câu lệnh phải trả về đúng một dòng. Không chạy biến thể thiếu `WHERE` vì sẽ nâng quyền toàn bộ profile.

## Lưu ý an toàn

- Trước `00_reset.sql`, phải chạy `SET app.allow_destructive_reset = 'yes';` trong cùng phiên SQL. File sẽ dừng nếu thiếu cờ này.
- `00_reset.sql` xóa toàn bộ dữ liệu ứng dụng và các bucket thuộc dự án; không chạy trên môi trường có dữ liệu cần giữ.
- Không đưa service-role key vào ứng dụng mobile.
- Giao dịch VIP chỉ được backend/service role ghi sau khi xác minh với App Store hoặc Google Play; client không được tự tạo giao dịch hay tự cấp VIP.
- `vip_plans` lưu catalog và Product ID; giá hiển thị thực tế phải lấy từ store, không hardcode trong ứng dụng.
- Hủy tự động gia hạn phải thực hiện/đồng bộ với store. Chỉ sửa `vip_status` trong database không có tác dụng dừng thu tiền.
- Địa điểm thật được nhập qua giao diện editor và duyệt bởi admin; không thêm dữ liệu giả vào SQL.
- `03_seed_real_places.sql` là catalog khởi tạo tùy chọn, không phải migration bắt buộc. Giờ hoạt động cần được Admin tái xác minh định kỳ; dữ liệu OpenStreetMap phải giữ ghi công nguồn theo ODbL.
- Nếu `00_reset.sql` báo bucket còn object, kiểm tra lại quyền của tài khoản đang chạy SQL Editor.
