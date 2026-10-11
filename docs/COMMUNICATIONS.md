# Thông báo và trao đổi hỗ trợ

## Phạm vi bản triển khai

- Hộp thông báo riêng cho từng tài khoản, lọc chưa đọc, phân trang theo thời gian + UUID, đọc chi tiết và mở nội dung liên quan.
- Sự kiện ca cứu hộ mới phát sinh được lưu vào hộp thông báo ngay cả khi tài khoản không có thiết bị push. Không dựng lại thông báo cho sự kiện lịch sử.
- Phiếu hỗ trợ chung về app/tài khoản cho khách và cứu hộ viên. Khiếu nại của ca tự có một phiếu liên kết duy nhất; giữ nguyên bảng và giao diện khiếu nại cũ.
- Người gửi phiếu và admin trao đổi bằng văn bản. Không có chat giữa khách và cứu hộ viên, file đính kèm, trạng thái đang gõ hoặc xác nhận đã đọc từng tin nhắn.
- Ghi chú nội bộ chỉ admin được đọc; API không trả ghi chú này cho chủ phiếu và không gửi thông báo cho họ.
- Admin gửi thông báo một chiều đến tất cả tài khoản đang hoạt động hoặc nhóm customer/provider/admin. Không có chọn riêng một tài khoản ở phiên bản này.
- Thông báo hỗ trợ và thông báo chung mới chỉ xuất hiện trong app, **không gửi SMS, email hoặc remote push**. Luồng push cũ cho ca cứu hộ vẫn giữ nguyên. Số hộp được ghi nhận không phải số người đã đọc.

## Cài mới database theo bộ SQL rút gọn

Chưa có migration nào tự chạy lên Supabase chỉ vì sửa code. Backup và dừng backend trước khi cập nhật.

- Database mới/schema trống: `scripts/01_init_database.sql`, đã gồm B1–V13 và kiểm tra schema/RLS trước commit; tùy chọn `scripts/02_seed_demo_teams.sql` cho 12 cửa hàng mẫu.
- Tự cài lại project test có dữ liệu: backup và đọc `scripts/optional/00_reset.sql` trước; file reset xóa dữ liệu app nhưng giữ Auth users. Không tự chạy reset từ app/backend.
- Tạo/khôi phục sáu tài khoản demo bằng `scripts/create-test-accounts.cjs` theo `scripts/README.md`. Không cần bootstrap admin qua số điện thoại khi dùng cách này.
- File 01 đã gồm các sửa lỗi cài mới; công cụ không còn sinh SQL vá lẻ. Nếu cần giữ dữ liệu cũ phải có kế hoạch nâng cấp riêng; không chạy lại init/reset để chữa lỗi.
- Database dùng Flyway: migrate/validate đến V13, không trộn với SQL Editor.
- Backend chỉ báo ready khi schema hiện tại có đủ các thành phần được kiểm tra, gồm bảng/trigger V11, địa chỉ V12 và ràng buộc V13. Muốn kiểm tra lại không sửa dữ liệu: `node scripts/build-init-sql.cjs --verify` rồi tự chạy `.tmp/verify-database.sql` trong SQL Editor.

V11 thêm `user_notifications`, `support_tickets`, `support_messages`, `announcements`; bật RLS và từ chối truy cập trực tiếp từ `anon`/`authenticated`. Backend xác minh JWT, tài khoản hoạt động, đồng ý điều khoản, quyền admin/chủ phiếu. Không thay chính sách retention hoặc đăng ký lịch xóa dữ liệu mới trong thay đổi này; cần thống nhất retention trước vận hành thật.

## Trạng thái và chống gửi trùng

- `open`: chờ admin; `waiting_user`: chờ người gửi phiếu; `resolved`: đã xử lý; `dismissed`: bác bỏ có lý do.
- Admin gửi phản hồi công khai → chờ người dùng. Người dùng trả lời → chờ admin. Ghi chú nội bộ không đổi trạng thái công khai.
- Phiếu đã đóng chỉ đọc, không gửi tiếp hoặc mở lại. Vấn đề mới tạo phiếu mới; phiên bản sau có thể bổ sung quy tắc mở lại nếu cần.
- Đóng phiếu cần lý do 5–500 ký tự và version mong đợi. Phiếu gắn với khiếu nại dùng lại dịch vụ xử lý khiếu nại, đồng bộ kết quả và cảnh báo ca; giải quyết từ giao diện cũ cũng cập nhật cuộc trao đổi.
- Tin nhắn tối đa 4000 ký tự; tối đa 30 tin/phút/người. Tối đa 10 phiếu chưa đóng/người. API rate limiter chung vẫn áp dụng.
- Client gửi UUID cố định khi thử lại cùng nội dung; backend tránh ghi trùng khi retry trong cùng phiên soạn. Không bảo đảm retry xuyên lần đóng/mở lại app vì bản nháp chưa lưu bền vững.
- Gửi thông báo admin và ghi các hộp nhận nằm trong cùng transaction. Nhóm nhận là ảnh chụp tài khoản đang hoạt động lúc gửi; người tạo tài khoản sau đó không nhận ngược thông báo cũ. Không sửa/rút thông báo đã gửi trong bản này.
- Lịch sử phân trang theo thời gian + UUID. Phiếu ưu tiên lọc trạng thái, sắp theo ngày tạo; không phải thuật toán tự phân công hỗ trợ.

## API

Tất cả đường dẫn bên dưới có tiền tố `/api`, cần Bearer JWT. Không truyền `ownerId`, `authorId`, `role` từ client để cấp quyền.

| Phương thức và đường dẫn | Quyền / nội dung |
|---|---|
| `GET /notifications?unread=false` | Hộp thông báo của chính tài khoản |
| `GET /notifications/unread-count` | Số chưa đọc của chính tài khoản |
| `GET /notifications/{id}` | Nội dung của chính tài khoản |
| `POST /notifications/{id}/read` | Đánh dấu đã đọc, gọi lại không đổi thời điểm đọc đầu tiên |
| `GET /support/tickets?status=all` | Người dùng chỉ phiếu của mình; admin toàn bộ |
| `POST /support/tickets` | Khách/cứu hộ viên; body `{id, subject, description}` |
| `GET /support/tickets/{id}` | Chủ phiếu hoặc admin |
| `GET /support/incidents/{id}` | Tìm phiếu liên kết khiếu nại; vẫn kiểm tra chủ phiếu/admin |
| `GET /support/tickets/{id}/messages` | Tin nhắn; lọc bỏ nội bộ đối với người dùng |
| `POST /support/tickets/{id}/messages` | Body `{id, body, internal}`; `internal=true` chỉ admin |
| `POST /support/tickets/{id}/status` | Chỉ admin; body `{version, status, note}` |
| `GET /operator/announcements` | Admin xem lịch sử gửi |
| `GET /operator/announcements/preview?audience=provider` | Admin đếm nhóm dự kiến |
| `GET /operator/announcements/{id}` | Admin xem bản đã gửi và số hộp nhận |
| `POST /operator/announcements` | Admin; body `{id, audience, title, body}` |

Các danh sách phân trang nhận `before`, `beforeId` (cần đủ cả hai), `limit` (1–100, mặc định 30). Kết quả `{items, nextBefore, nextBeforeId}`. Nội dung không thuộc quyền xem trả 404, thao tác sai vai trò 403, phiên hết hạn 401, phiên bản cũ/phiếu đã đóng 409, vượt giới hạn 429.

## Cách kiểm thử thủ công sau khi cập nhật SQL

1. Đăng nhập khách → **Trợ giúp → Phiếu hỗ trợ và phản hồi → Tạo phiếu hỗ trợ**. Gửi tiêu đề và mô tả vấn đề app.
2. Đăng nhập admin → **Quản lý → Phiếu hỗ trợ và trao đổi**. Mở phiếu, gửi phản hồi.
3. Trở lại khách → **Thông báo** ở trang chủ hoặc Tài khoản. Mở thông báo → mở phiếu, trả lời lại. Khi đang mở trang, dữ liệu tự tải mỗi 10 giây; có nút Tải lại. Không mô tả đây là WebSocket/chat tức thì.
4. Admin bật “Ghi chú nội bộ”, lưu một ghi chú. Khách và cứu hộ viên khác phải không thấy ghi chú; tài khoản khác truy cập mã phiếu phải bị từ chối.
5. Admin nhập lý do rồi đóng phiếu. Khách thấy kết quả, không còn ô gửi phản hồi. Với phiếu khiếu nại ca, kiểm tra trạng thái tại màn khiếu nại cũ cũng đã đổi.
6. Admin → **Quản lý thông báo → Soạn thông báo**, chọn **Cứu hộ viên**, nhập nội dung, xem trước nhóm/số nhận rồi xác nhận. Cứu hộ viên thấy thông báo; khách không thấy. Lặp lại với **Tất cả** để kiểm tra cả ba vai trò.
7. Mở một thông báo: số chưa đọc giảm; vào lại không giảm thêm. Bộ lọc Chưa đọc không còn hiển thị thông báo đó.
8. Thử tắt mạng: phải hiển thị lỗi, không giả báo gửi thành công; khi thử lại cùng nội dung không tạo bản ghi trùng trong cùng phiên soạn.

Hộp thông báo và cuộc trao đổi cập nhật khi app ở foreground và trang đang mở. Chưa có gửi ngoại tuyến hoặc cơ chế đánh thức app đã đóng cho thông báo hỗ trợ/chung.

## Kiểm chứng tự động

- Jest: API client và hợp đồng migration/điều hướng; không thay thế test hiển thị trên thiết bị.
- `CommunicationServiceTest`: phân quyền, quyền sở hữu trong truy vấn, ghi chú nội bộ, chống trùng, giới hạn và version (unit, không chạy SQL thật).
- `CommunicationIntegrationTest`: luồng đầy đủ bằng native PostgreSQL/PostGIS cô lập; dùng role runtime thật, không dùng Supabase/Docker.
- `RescueDatabaseIntegrationTest`: đồng bộ khiếu nại–phiếu từ hai giao diện và hộp thông báo không cần thiết bị push.
- Test tích hợp cần môi trường theo `backend/TESTING.md`. Không kết luận migration đã chạy hoặc điện thoại đã nhận thông báo chỉ từ kết quả biên dịch/unit test.
