# Rà soát quản trị và đánh giá — 10/11/2026

Đối chiếu mã giao diện, API và truy vấn SQL hiện tại; không dựa vào PRD/SRS và không coi đây là kiểm thử trực tiếp mọi màn hình. Kết luận: admin đã có nhiều thao tác cập nhật/khóa/duyệt, không phải chỉ thêm mới. Tuy nhiên, chưa thể gọi tất cả module là CRUD đầy đủ.

| Nhóm | Thêm | Xem | Sửa / xử lý | Xóa / ngừng / thu hồi | Đánh giá |
| --- | --- | --- | --- | --- | --- |
| Cửa hàng/đội | Có tạo cửa hàng | Danh sách, chi tiết | Tên/hotline, vị trí/địa chỉ, xác minh, năng lực, giờ làm, trạng thái | Khóa/tạm ngừng; không xóa vật lý | Đã thêm form sửa tên và số liên hệ, có kiểm tra định dạng và audit |
| Cứu hộ viên | Gắn tài khoản đã đăng ký vào đội | Danh sách, hồ sơ theo đội | Tên/số liên hệ/phương tiện, duyệt/từ chối, bật lại/tạm ngừng | Admin tạm ngừng; đại diện cửa hàng có gỡ thành viên và thu hồi lời mời | Sửa hồ sơ công việc, không thay số đăng nhập Auth hay đổi đội bằng form này |
| Dịch vụ | Đã có tạo mới trên app | Có | Tên, mô tả, icon, yêu cầu báo giá/đích, thứ tự, bật/tắt | Tắt dịch vụ; không xóa vật lý | Tạo ở trạng thái tắt; gán năng lực cho cửa hàng rồi bật tiếp nhận |
| Quyền quản trị | Cấp quyền cho tài khoản hiện có | Tra cứu tài khoản qua số điện thoại | Đổi quyền | Thu hồi quyền; chặn hạ quyền admin cuối cùng | Không phải màn hình quản lý toàn bộ tài khoản khách; chưa có danh bạ admin đầy đủ |
| Thông báo toàn hệ thống/nhóm | Soạn và gửi | Danh sách, chi tiết | Sửa tiêu đề/nội dung, kiểm tra phiên bản, lưu audit | Thu hồi khỏi hộp thông báo của người nhận | Giữ hồ sơ admin; thông báo người nhận đã xóa không bị khôi phục khi sửa |
| Khiếu nại, yêu cầu hỗ trợ | Khách gửi; admin trả lời trong luồng hỗ trợ | Danh sách, chi tiết, hội thoại | Phản hồi, đổi trạng thái, giải quyết/bác bỏ | Không xóa hồ sơ xử lý | Không nên sửa nội dung tố cáo của khách hay xóa mất chứng cứ chỉ để đủ CRUD |
| Đánh giá của khách | Khách tạo, admin không viết thay | Danh sách, chi tiết | Admin ẩn/hiện với lý do; khách sửa đánh giá của mình | Khách xóa đánh giá của mình theo thời hạn; admin dùng ẩn | Phân quyền phù hợp; admin không sửa số sao/nội dung thay khách |
| Ca cứu hộ/cờ cảnh báo | Ca do khách tạo | Danh sách, chi tiết, lịch sử | Thử điều phối lại, xử lý cờ, kết luận ca theo quyền/trạng thái | Không xóa ca đã có lịch sử | Đây là nghiệp vụ chuyển trạng thái, không nên mở CRUD tùy ý |
| Thống kê và nhật ký | Sinh từ nghiệp vụ | Có | Không sửa số liệu trực tiếp | Không xóa nhật ký tùy ý | Chỉ đọc có chủ ý, không phải thiếu CRUD |

## Bổ sung sau rà soát

Đã bổ sung sửa hồ sơ cửa hàng/cứu hộ viên, tạo dịch vụ, sửa và thu hồi thông báo. Danh bạ toàn bộ tài khoản/quản trị viên vẫn chưa được bổ sung; trang phân quyền hiện tiếp tục tra cứu tài khoản theo số điện thoại.

Khách và cứu hộ viên có nút xóa từng mục hoặc toàn bộ trong Thông báo và Hoạt động → Đã kết thúc, kèm xác nhận. Xóa toàn bộ áp dụng cả những trang chưa tải. Xóa lịch sử chỉ ẩn đối với người thao tác, không ảnh hưởng bên còn lại, thống kê hay hồ sơ admin; không cho xóa ca đang chạy. Thông báo được đánh dấu đã xóa để các sự kiện gửi lại không tạo bản trùng.

V19 bổ sung dữ liệu phục vụ các thao tác này, đã gộp vào `01_init_database.sql`. Supabase hiện tại đã được áp dụng V19 riêng, không reset hay chạy lại init.

## Khách sửa/xóa đánh giá

- Giao diện `ReviewPanel.tsx` có chọn lại số sao, sửa nội dung, lưu và nút xóa kèm xác nhận.
- `PUT /api/requests/{requestId}/review` thêm hoặc cập nhật đánh giá; `DELETE` cùng đường dẫn xóa đánh giá.
- Backend `RescueReviewService` kiểm tra khách sở hữu ca/đánh giá. Việc thêm/sửa yêu cầu ca đã hoàn tất; mỗi ca có một đánh giá.
- Thời hạn mặc định là **30 ngày kể từ lúc hoàn tất ca**, cấu hình `REVIEW_WINDOW` trong backend; không tính lại 30 ngày từ lần sửa cuối. Cấu hình được giới hạn trong 1–90 ngày.
- Admin chỉ ẩn/hiện, không sửa lời đánh giá hoặc số sao. Xóa của khách là xóa bản ghi đánh giá và ghi nhật ký hành động.
- Người dùng sẽ tự kiểm thử bình luận; lượt này không chạy lại thao tác bình luận trên APK.

## Sửa liên hệ và đăng nhập trong lượt này

- API chi tiết ca bổ sung `customerContactPhone`. Chỉ admin hoặc đúng cứu hộ viên được giao ca đang hoạt động mới có quyền lấy số này. Ca hoàn tất/hủy, người ngoài ca và khách không được nhận trường số khách.
- Số khách lấy từ tài khoản Auth qua hàm SQL giới hạn quyền, không cấp quyền đọc chung bảng `auth.users` cho app/backend. Nếu tài khoản chưa có số hợp lệ thì không hiển thị số giả hay lấy số cửa hàng thay thế.
- Giao diện cứu hộ hiện nút gọi khách; khách hiện nút gọi cứu hộ; admin có thể thấy cả hai trong ca hoạt động. Marker cửa hàng chỉ hiện tên cửa hàng, tránh hiện số của chính người đang xem.
- V18 được bổ sung vào migration và bundle cài mới `scripts/01_init_database.sql`; không cần reset Supabase đang có dữ liệu.
- Màn hình đăng nhập chính chứa form email/mật khẩu trống, không điền sẵn email, không chọn vai trò. Giữ đường đăng nhập SMS và chính sách môi trường cũ; không đổi xác thực production thành tài khoản demo.

## Nguồn kiểm tra

`OperatorController`, `OperatorService`, `CommunicationController`, `PartnerEnrollmentController`, `RescueReviewService`, `application.yml`; giao diện `TeamManagementScreen`, `ProviderDirectoryScreen`, `PartnerScreens`, `AnnouncementScreens`, `ReviewPanel` và API phía app tương ứng.

## Xác nhận thay đổi

- Lần bổ sung V19: TypeScript, ESLint các file sửa, 352 test frontend và 134 unit test backend đạt; JAR đã build. Integration suite PostGIS riêng chưa chạy vì máy không có fixture test được cấu hình.
- Đã gọi trực tiếp service Java với kết nối Supabase hiện dùng trong một transaction rollback: xóa từng mục/toàn bộ, phân trang, cô lập lịch sử theo tài khoản, giữ lịch sử admin, sửa/thu hồi thông báo, chặn phiên bản cũ, sửa cửa hàng/thành viên và tạo dịch vụ tắt. Sau test đã xác nhận rollback, không lưu dữ liệu thử.
- Kết nối backend cục bộ hiện dùng role `postgres`; phép thử service trên dùng đúng tài khoản đó. Các kiểm tra schema/grant của `motorescue_api` đạt, nhưng không gọi đây là kiểm thử tích hợp bằng phiên đăng nhập `motorescue_api` hoặc kiểm thử HTTP/JWT/UI trên máy ảo.

- V18 đã áp dụng thành công lên Supabase đang dùng. Schema/grant checks đạt; hàm liên hệ trả null cho các ca hoàn tất/hủy hiện có. Không thay đổi dữ liệu nghiệp vụ và không chạy reset/init lại.
- Backend: `RescueContactTest` đạt, kiểm tra 48 tổ hợp vai trò/trạng thái/người được giao để giới hạn việc lấy số khách. Đã build lại JAR; không khởi động server.
- Frontend: TypeScript và ESLint các file sửa đạt; 83 test trong bốn suite liên quan đạt. Không kiểm thử lại nội dung bình luận theo yêu cầu.
- APK mới build thành công, chữ ký v2 hợp lệ, lưu tại `dist/apk/moki-rescue-demo-x86_64.apk`; chưa cài đè hoặc kiểm thử bản mới trên máy ảo.
- Đã đóng backend, OSRM, máy ảo và ADB của phiên demo. Kiểm tra cuối không còn cổng 8080/8081/5000/5554/8765 lắng nghe; Ubuntu WSL và Docker đều dừng. Tiến trình hỗ trợ Java/Gradle do VS Code tự mở không phải backend demo.
