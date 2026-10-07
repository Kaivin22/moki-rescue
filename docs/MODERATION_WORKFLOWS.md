# Đánh giá và báo cáo người dùng — 07/10/2026

## Điều hướng kiểm thử

- Khách: Hoạt động → ca hoàn tất → Đánh giá ca cứu hộ. Gửi, sửa hoặc xóa bằng API hiện có. Đánh giá không phải điều kiện hoàn tất ca; nút Bỏ qua quay lại ca, không ghi dữ liệu.
- Khách: Chi tiết ca đã có cứu hộ viên → Khiếu nại hoặc báo sự cố → Gửi khiếu nại → chọn nhóm, mô tả ít nhất 10 ký tự → gửi → danh sách → chi tiết/kết quả.
- Admin: Hồ sơ → Quản lý (hoặc Điều phối → Quản lý) → Khiếu nại / Đánh giá / Cảnh báo chất lượng → bộ lọc → chọn một nội dung → ghi lý do ít nhất 5 ký tự → quyết định xử lý.
- Admin: Đội → Chất lượng → chọn một đánh giá/cảnh báo cũng dẫn đến cùng trang chi tiết, không có biểu mẫu kiểm duyệt chung cho cả danh sách.
- Cả danh sách và chi tiết có trạng thái tải/lỗi/rỗng, nút tải lại; danh sách dùng phân trang phía máy chủ, không tải mọi ca về để tự tổng hợp.

## API đọc mới (chỉ admin)

`GET /api/operator/moderation/{kind}?status=all&limit=30&before=...&beforeId=...`

`GET /api/operator/moderation/{kind}/{id}`

| kind | Bộ lọc status |
|---|---|
| reviews | all, visible, hidden |
| incidents | all, open, resolved, dismissed |
| quality-alerts | all, open, warned, resolved |

Danh sách trả `{items, nextBefore, nextBeforeId}`. Hai trường cursor cùng null khi hết dữ liệu; khi có trang sau phải gửi cả hai. Thứ tự `created_at DESC, id DESC`, giới hạn 1–100. Loại danh sách/bộ lọc/cursor không hợp lệ trả 400; thiếu bản ghi trả 404; vai trò khác admin bị chặn. Không trả số điện thoại, vị trí hoặc token trong danh sách.

API ghi tái sử dụng `PUT /api/requests/{id}/review`, `DELETE /api/requests/{id}/review`, `POST /api/requests/{id}/incidents`, các API admin resolve incident, review visibility, quality warn/resolve hiện có. Các điều kiện sở hữu ca, thời hạn đánh giá, trạng thái, validation, audit vẫn nằm ở backend. Không sửa số sao/lời nhận xét thay khách; ẩn đánh giá phải có lý do, không chỉ vì điểm thấp. Cảnh báo chất lượng không tự khóa đội.

## Triển khai và giới hạn xác minh

- Không đổi schema: dùng `reviews`, `incident_reports`, `team_quality_alerts` đã có. Không cần chạy lại SQL/reset Supabase cho thay đổi này.
- Cần build/khởi động lại backend để các API đọc mới tồn tại, rồi tải lại app. Nếu backend cũ còn chạy, các trang mới có thể báo không tải được dữ liệu.
- Unit test truy vấn kiểm tra quyền, bộ lọc, cursor và giới hạn; integration test riêng cần PostgreSQL/PostGIS kiểm thử theo `backend/TESTING.md`, không dùng database thật.
- Việc biên dịch và unit test không thay thế kiểm thử trên iPhone với tài khoản khách/admin và dữ liệu ca hoàn tất. Cần thử thêm: gửi báo cáo, admin xử lý, khách xem kết quả; đánh giá/ẩn/hiện lại; ca ngoài quyền truy cập; lỗi mạng; danh sách hơn 30 bản ghi.

Danh mục route hiện tại: `docs/FIGMA_SCREEN_INVENTORY.md` — 48 màn điều hướng, không tính ảnh/popup/biến thể vai trò.
