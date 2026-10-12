# Lịch nhận cứu hộ của cửa hàng

Đây là **lịch nhận ca cứu hộ**, không khẳng định giờ mở cửa bán hàng/sửa chữa tại chỗ.
Không bắt buộc cửa hàng hoạt động 24/7, không thêm vai trò quản lý đội.

## Quy tắc

- Admin nhập lịch đã thống nhất với đối tác tại **Đội → chọn cửa hàng → Lịch nhận cứu hộ**.
- Một khung giờ mỗi ngày bắt đầu ca; ngày không khai báo không bắt đầu ca mới.
  Múi giờ cố định `Asia/Ho_Chi_Minh`, không phụ thuộc múi giờ điện thoại/máy chủ.
- `07:00–21:00`: nhận từ 07:00, ngừng đúng 21:00. `22:00–06:00`: tới 06:00 hôm sau.
  `00:00–24:00`: cả ngày; có nút áp dụng cả tuần. Không cho lịch chồng lấn, kể cả
  ca Chủ nhật kéo sang thứ hai. Ca qua đêm vẫn tiếp tục vào ngày không bắt đầu ca mới.
- Trong giờ cũng **không tự bật sẵn sàng**: từng cứu hộ viên phải tự bật khi có thể
  xuất phát từ cửa hàng, đã được duyệt và không có ca đang xử lý.
- Mỗi phiên sẵn sàng có hạn tới cuối khung giờ đang nhận. Với lịch cả ngày, hạn là
  00:00 hôm sau. Muốn tiếp tục phải chủ động bật lại; không để TRUE cũ tự sống lại
  khi backend khởi động lại hoặc ngày mới bắt đầu.
- Hết giờ hoặc tạm ngừng: không nhận lời mời mới; backend từ chối thao tác nhận
  lời mời cũ ngay khi điều kiện không còn đúng. Dọn cờ sẵn sàng và điều phối lại
  chạy theo lượt quét (mặc định 15 giây, có thể trễ khi backend bận/dừng).
- Deadline lời mời là **min(thời hạn phản hồi cấu hình, thời điểm hết phiên sẵn sàng)**.
  Ví dụ còn 20 giây tới hết giờ thì lời mời không được kéo dài 45 giây.
- Lưu lịch hoặc đổi tạm ngừng sẽ tắt sẵn sàng của đội; lời mời thuộc phiên cũ mất
  hiệu lực kể cả cứu hộ viên bật lại trước lượt quét. Hủy tạm ngừng không tự bật ai.
- Ca đã nhận vẫn tiếp tục: di chuyển, sửa chữa, xác nhận hoàn thành không bị đóng
  theo lịch. Nếu thật sự không thể tiếp tục phải dùng luồng rút khỏi ca hiện có.
- Lọc theo giờ trước OSRM, kiểm tra lại sau OSRM và lúc nhận lời mời. Công thức
  xếp hạng không thay đổi. Nếu người đứng đầu không còn đủ điều kiện sau OSRM,
  thử người kế tiếp trong danh sách đã xếp hạng; hết người thì `no_provider`.
- Hai khách gửi đồng thời: sau khi khóa cứu hộ viên, backend dùng một truy vấn
  mới để kiểm tra lời mời còn hạn của yêu cầu khác. Người đã được mời không nhận
  thêm lời mời; thử người kế tiếp hoặc kết thúc tìm. Việc kiểm tra mới chạy trong
  cùng transaction giữ khóa, với isolation mặc định PostgreSQL `READ COMMITTED`.
- Không để khách đợi tới ngày mai: giữ luồng không tìm được người, thử lại/liên hệ
  hỗ trợ đang có. Đây không phải cam kết luôn có người trực đêm.

## API và lưu trữ

- Admin: `GET/PUT /api/operator/teams/{id}/working-hours`.
- Cứu hộ viên: `GET /api/provider/working-hours` chỉ đọc lịch đội của mình.
- PUT: `{ "paused": false, "expectedVersion": 0, "days": [{ "dayOfWeek": 1,
  "opensMinute": 420, "closesMinute": 1260 }] }`. Thứ hai = 1, Chủ nhật = 7.
  Lấy version hiện tại từ GET; lịch bị sửa ở nơi khác trả 409, cần tải lại.
- `team_working_hours`: các khung giờ; `rescue_teams.receiving_paused` và
  `working_hours_version`: tạm ngừng/phiên bản. `provider_members.availability_until`:
  hạn phiên sẵn sàng; `dispatch_offers.availability_started_at`: nhận diện phiên
  để lời mời cũ không sống lại. Bảng lịch không cho app truy cập trực tiếp qua PostgREST.
- `WorkingHoursService`: kiểm tra đầu vào, lưu nguyên tử, phân quyền và audit.
  Migration V14 chứa hàm lịch, ràng buộc phiên sẵn sàng và kiểm tra nhận lời mời.
  `DispatchService` lọc, phát, thu hồi và tìm tiếp; `ProviderService` trả trạng thái
  hiệu lực. App chỉ hiển thị và gửi thao tác; backend/database quyết định.

## Cập nhật database

- **Cài mới:** file `scripts/01_init_database.sql` đã gộp tới V14; không thêm file
  vá vào thứ tự cài mới. `02_seed_demo_teams.sql` vẫn tùy chọn.
- **Database đang có dữ liệu:** không chạy lại init/reset. Nếu Flyway quản lý,
  migrate bằng cấu hình migration đã được cấp quyền tới V14. Nếu cài qua SQL
  Editor, cần xác minh đang ở V13, sao lưu và áp dụng migration V14 một lần bằng
  tài khoản quản trị. V14 cũng cấp quyền bảng lịch mới cho script tài khoản mẫu;
  không cần SQL vá riêng. Không tự tạo Flyway baseline để bỏ qua kiểm tra.
- Với trường hợp SQL Editor nêu trên: dừng backend, sao lưu, xác minh V13 và
  không có `flyway_schema_history`; chạy nội dung
  `backend/src/main/resources/db/migration/V14__shop_working_hours.sql` **một lần
  trong một transaction** (`BEGIN;` ở trước, `COMMIT;` ở sau). Không chạy init
  hoặc reset để vá database đang có dữ liệu. Nếu lỗi, `ROLLBACK;` và kiểm tra
  nguyên nhân; không bỏ qua câu lệnh lỗi rồi chạy tiếp. Chưa kiểm tra V13/backup
  thì chưa thực hiện nâng cấp. Đây là nâng cấp database cũ, không thêm bước vào
  luồng cài mới bằng file 01.
- Cửa hàng hiện hữu không được tự gán lịch 24/7. Sau nâng cấp, admin nhập lịch;
  các ca đã nhận không bị hủy. Lời mời chưa nhận được chuyển về tìm người.
- Backend mới kiểm tra cả bảng/cột, hàm, trigger và quyền runtime của V14 tại
  `/api/health/ready`. Thiếu một trong các thành phần này trả HTTP 503
  `not_ready`; `/api/health` vẫn có thể trả 200 vì chỉ kiểm tra tiến trình sống.
  Cần **khởi động lại backend đã build từ code mới**; tiến trình/jar cũ không
  tự có quy tắc kiểm tra mới. Readiness không tự sửa hoặc chạy migration.
- File 02: 12 cửa hàng mô phỏng có lịch 07:00–21:00, vẫn pending, không có tài khoản.
  Script tài khoản TEST: ba cửa hàng/bốn cứu hộ viên có lịch mô phỏng 24/7 và
  sẵn sàng mặc định tắt. Chạy lại không ghi đè lịch đã được admin lưu (version > 0).

## Kiểm tra thủ công sau khi cập nhật database và khởi động backend/app

1. Admin chọn một cửa hàng TEST → Lịch nhận cứu hộ, đặt lịch có chứa giờ hiện tại,
   lưu. Đăng nhập cứu hộ viên, xem lịch và chủ động bật sẵn sàng.
2. Đăng nhập khách, gửi yêu cầu phù hợp trong vùng phục vụ. Chỉ cứu hộ viên được
   chọn thấy lời mời đang chờ, deadline không vượt giờ đóng.
3. Khi lời mời còn chờ, admin bật **Tạm ngừng** và lưu. Người nhận cũ không nhận
   được nữa; lượt quét tìm người khác đang sẵn sàng hoặc trả không có người.
4. Hủy tạm ngừng: cứu hộ viên vẫn chưa sẵn sàng, phải tự bật lại. Lời mời phiên cũ
   không được chấp nhận lại. Thử đồng thời hai phiên admin: phiên dùng version cũ
   phải báo lịch đã thay đổi, không âm thầm ghi đè.
5. Cho cứu hộ viên nhận ca trước, rồi tạm ngừng cửa hàng. Ca vẫn mở và có thể bấm
   bắt đầu đi, xử lý tới hoàn thành; không được nhận thêm ca.
6. Đặt hết giờ sau 1–2 phút, bật sẵn sàng, chờ qua mốc đó: giao diện cập nhật theo
   polling; backend chặn nhận ngay theo giờ database. Sau lượt quét, cờ tắt.
7. Thử ca 22:00–06:00 và Chủ nhật qua thứ hai đúng thời điểm tương ứng hoặc bằng
   test tích hợp với thời gian truyền vào hàm. Không đổi giờ máy/database thật
   chỉ để giả lập; unit test không thay thế kiểm thử SQL và app thật.
8. Hai khách (hai tài khoản riêng) gửi đồng thời, một cứu hộ viên sẵn sàng:
   chỉ một lời mời còn hạn cho người đó; yêu cầu còn lại chuyển sang người khác
   hoặc `no_provider`. Với hai cứu hộ viên phù hợp, kiểm tra mỗi người tối đa
   một lời mời; không phải phát cùng một yêu cầu cho tất cả mọi người.

Test tự động liên quan: `WorkingHoursServiceTest`, `providerPolicies.test.ts`
(giờ làm việc và trạng thái sẵn sàng), `RescueDatabaseIntegrationTest`,
`ApiDatabaseIntegrationTest`, cùng kiểm tra clean-install/schema V14.
Test tích hợp cần PostgreSQL/PostGIS cô lập theo `backend/TESTING.md`, không dùng
Supabase thật hoặc Docker. Việc có file test không có nghĩa test đã chạy thành công.
