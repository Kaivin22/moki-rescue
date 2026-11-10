# Đăng ký cửa hàng và thành viên

Người dùng đăng ký tài khoản khách như trước. Tại **Tài khoản → Hợp tác cửa hàng**,
họ gửi tên cửa hàng, địa chỉ, ghim bản đồ, số liên hệ đại diện và dịch vụ cung cấp.
Hồ sơ đang chờ không xuất hiện trên bản đồ đối tác và không cấp quyền nhận ca.

Admin vào **Quản lý → Duyệt đăng ký cửa hàng**. Admin đối chiếu cửa hàng thực tế,
kiểm tra trùng hồ sơ, quyền đại diện qua đầu mối độc lập, năng lực và danh sách nhân sự.
Phải đánh dấu từng mục checklist và nhập kết quả xác minh trước khi duyệt. Người
gửi đầu tiên không mặc nhiên sở hữu cửa hàng. Có thể từ chối kèm lý do; người dùng
được gửi hồ sơ mới sau khi bị từ chối.

Duyệt tạo một cửa hàng verified và một liên kết người đại diện. **Không đổi người
đại diện thành cứu hộ viên**. Mỗi tài khoản đại diện tối đa một cửa hàng. Với cửa hàng
được tạo theo luồng này, người đại diện đã duyệt thay cho điều kiện phải có sẵn một
cứu hộ viên để xác minh cửa hàng, tránh vòng lặp phải có thợ trước khi được mời thợ.
Admin tiếp tục cấu hình giờ hoạt động tại màn hình quản lý cửa hàng. Chưa có giờ làm
thì không nhận ca; hệ thống không tự giả định hoạt động 24/7.

Người đại diện mở cửa hàng tại mục Hợp tác, nhập đúng số điện thoại đã đăng ký của
nhân sự, xác nhận quan hệ làm việc/năng lực/quyền dùng số liên hệ rồi gửi lời mời.
Không cung cấp danh bạ khách hàng hay tìm kiếm gần đúng. Chỉ mời tài khoản khách
đang hoạt động, chưa là thành viên hay đại diện cửa hàng khác; tối đa 20 lời mời/ngày
mỗi cửa hàng. Người đại diện không tự mời chính mình để cấp quyền nhận ca. Nếu họ
cũng làm thợ thì admin kiểm tra và dùng luồng cấp quyền cứu hộ viên hiện có.

Lời mời có hiệu lực 7 ngày, có thể thu hồi. Người nhận mở **Thông báo → lời mời →
Mở nội dung liên quan**, chấp nhận hoặc từ chối. Chấp nhận mới tạo/cập nhật thành viên
active và chuyển quyền toàn cục sang provider, mặc định offline. Không cần admin
duyệt nhân sự lần hai. Backend kiểm tra lại quyền, tình trạng cửa hàng, tài khoản,
thời hạn và quan hệ thành viên tại thời điểm trả lời. Chấp nhận một cửa hàng thu hồi
các lời mời đang chờ khác. Việc chấp nhận là đồng ý tham gia; năng lực nghề nghiệp
vẫn do người đại diện xác nhận. Các thông báo này là hộp thư trong app, không phải
cam kết đã tích hợp push nền cho lời mời trên Expo Go.

Gỡ thành viên chỉ áp dụng trong cửa hàng của người đại diện, giữ tài khoản và lịch
sử ca, chuyển trạng thái thành viên sang left và quyền tài khoản về customer. Không
gỡ nếu có ca chưa kết thúc hoặc lời mời nhận ca còn hiệu lực. Không gỡ chính người
đại diện; không xóa trạng thái đình chỉ do admin bằng cách gỡ rồi mời lại. Người đại
diện cũng không được tự xóa tài khoản khi chưa bàn giao. Chuyển quyền đại diện/chấm
dứt hợp tác cần liên hệ admin; chưa có màn hình tự chuyển quyền trong phạm vi này.

Cửa hàng bị đình chỉ vẫn xem được danh sách của mình nhưng không được thay đổi
nhân sự hay chấp nhận lời mời vào cửa hàng. Admin giữ quyền khóa cửa hàng/thành viên
và điều chỉnh địa chỉ, dịch vụ, giờ hoạt động. Các thao tác ghi audit và thông báo.

## Database

- Cài mới: `scripts/01_init_database.sql` đã gộp đến V15; sau đó tùy chọn seed như README.
- Database hiện có ở V14: **không reset hoặc chạy lại init**. Sao lưu trước, dừng backend,
  áp dụng đúng một migration `backend/src/main/resources/db/migration/V15__partner_enrollment.sql`
  trong transaction tại SQL Editor bằng chủ schema (BEGIN, toàn bộ migration, COMMIT),
  rồi khởi động backend mới. Nếu dùng Flyway thì để Flyway áp dụng V15; không chạy tay
  rồi để Flyway chạy lại.
- V15 thêm `shop_applications`, `team_representatives`, `team_invitations` và mở rộng
  loại liên kết thông báo. Ba bảng chỉ backend truy cập, bật RLS và không cấp quyền
  trực tiếp cho anon/authenticated. Không tạo role toàn cục mới.
- Không tự gán người đại diện cho ba cửa hàng demo cũ: không suy ra chủ cửa hàng từ
  tài khoản thợ đầu tiên. Các tài khoản demo email không có số đăng nhập sẽ không tìm
  được bằng lời mời qua số điện thoại; không dùng số liên hệ công việc để giả làm
  số điện thoại đăng nhập. Test lời mời cần hai tài khoản có số đăng nhập riêng.

## API

Tất cả đường dẫn dưới `/api/partners` cần JWT và chấp nhận điều khoản hiện hành.

| Đường dẫn | Quyền / hành vi |
| --- | --- |
| GET/POST `/applications` | Đọc hồ sơ của mình / gửi hồ sơ; admin đọc danh sách |
| GET `/checks` | Admin lấy checklist bắt buộc |
| POST `/applications/{id}/review` | Admin duyệt/từ chối, kèm kết quả đối chiếu |
| GET `/shops` | Danh sách cửa hàng mình đại diện |
| GET `/shops/{id}/members` | Người đại diện xem thành viên cửa hàng mình |
| GET/POST `/shops/{id}/invitations` | Người đại diện xem/gửi lời mời |
| POST `/shops/{id}/members/{userId}/remove` | Gỡ thành viên nếu không có công việc mở |
| GET `/invitations` | Người nhận xem lời mời của mình |
| POST `/invitations/{id}/answer` | Chính người nhận chấp nhận/từ chối |
| POST `/shops/{teamId}/invitations/{id}/revoke` | Người đại diện thu hồi lời mời |

`ApiDatabaseIntegrationTest` bao phủ đăng ký, duyệt admin, danh sách riêng tư, lời mời,
đồng ý, cấp quyền, gỡ, hết hạn và đình chỉ. Cần PostgreSQL/PostGIS test cô lập để chạy;
compile hoặc unit test không thay thế kiểm thử database này.
