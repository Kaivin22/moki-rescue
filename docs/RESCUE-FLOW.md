# Luồng cứu hộ rút gọn

- Khách chọn dịch vụ, mô tả tình trạng xe và gọi cứu hộ. Đề nghị của thợ hiển thị dịch vụ, mô tả khách nhập, khu vực và ETA trước khi nhận/từ chối.
- Sau khi nhận, thợ nhập giá cơ bản (đồng, cho phép 0 nhưng không được bỏ trống) rồi bấm Di chuyển. Giá và trạng thái được lưu cùng transaction; khách thấy giá ban đầu và có thể hủy hoặc chờ, không cần bấm duyệt thêm.
- Giá cơ bản là ước tính ban đầu, không phải khoản thanh toán hoặc hóa đơn. Báo giá sau kiểm tra là **tổng tiền thay thế**, không tự cộng giá cơ bản; phát sinh cần khách đồng ý.
- Thợ bấm Đã gặp khách → vào xử lý xe; không yêu cầu khách xác nhận có mặt và không có nút bắt đầu sửa riêng cho dịch vụ không cần báo giá mới. Khách báo chưa gặp trong lúc này → quay lại đang di chuyển.
- Khách duyệt báo giá sau kiểm tra → chuyển thẳng sang sửa chữa/vận chuyển. Giữ xác nhận điểm giao cho vận chuyển. Ca cũ đang ở arrived/quote_approved vẫn có nút tiếp tục tương thích.
- Thợ bấm Hoàn tất ca → đóng ca. Khách có thể đánh giá hoặc báo vấn đề sau ca; không có bước khách xác nhận hoàn tất. Lịch sử lưu người thực hiện, không ghi nhận giả rằng khách đã xác nhận. Dịch vụ cần báo giá không được bỏ qua việc khách duyệt giá để hoàn tất.
- Khi khách tự hủy một ca đã gán thợ, chính thợ đó bị loại khỏi các yêu cầu mới/tìm lại của **khách ấy trong 15 phút kể từ lúc hủy**. Các khách khác không bị ảnh hưởng. Sau 15 phút thợ đủ điều kiện lại; vẫn phải bật sẵn sàng và thỏa các điều kiện khác. Không có người khác thì báo không tìm được, không phá thời gian loại trừ.
- Mỗi admin chỉ có một mục thông báo cho mỗi ca, kể cả sau khi đã đọc. Thông báo hỗ trợ/khiếu nại gắn cùng ca được gộp; nội dung trao đổi vẫn nằm trong phiếu hỗ trợ. Lịch sử trạng thái vẫn được giữ. Thông báo đẩy cho admin cũng dùng khóa cố định theo ca để không lặp theo phiên bản trạng thái.
- Mục Hồ sơ → Đánh giá từ khách hàng: khách xem đánh giá của mình và của thợ từng được giao, thợ xem đánh giá về mình, admin xem toàn bộ. Đánh giá bị ẩn chỉ admin xem được; không công khai tên, số điện thoại hoặc địa chỉ khách đánh giá.

## Database

Supabase demo đã áp dụng V16 (03/11/2026) và V17 (04/11/2026). V17 bỏ tiền tố [TEST] trong tên hiển thị, gộp thông báo admin cũ và cập nhật chuyển trạng thái; không xóa tài khoản, ca, đánh giá hoặc phiếu hỗ trợ. Không chạy lại migration hoặc init trên database demo này. File `scripts/01_init_database.sql` đã gộp đến V17 dành cho cài mới; thứ tự vẫn init rồi seed tùy chọn, không tăng số file cần chạy.
