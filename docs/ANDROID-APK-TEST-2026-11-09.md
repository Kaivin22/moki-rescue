# Kiểm thử APK ngày 09/11/2026

## Phạm vi và môi trường

Chỉ một máy ảo `Rescue_Demo`, Android 16, x86_64, thiết bị `emulator-5554`. APK chạy độc lập với Metro, gọi backend native tại `10.0.2.2:8080`. OSRM chạy trong Ubuntu WSL với dữ liệu có sẵn tại `E:\Đồ án\routing\data\wsl-demo-20260909`; không tạo thêm máy ảo hoặc cài thêm bộ dữ liệu bản đồ trong lượt thử này.

Ca mô phỏng: `ce45e221-3a69-4d9d-a195-7f099160e117`, dịch vụ vá/thay lốp xe máy xăng. GPS máy ảo được đặt gần `16.0611, 108.2201`, Hải Châu, Đà Nẵng. Đây là tọa độ mô phỏng, không phải chuyến đi thực địa.

## Kết quả đã quan sát

1. Đăng nhập khách trên APK bằng tài khoản Supabase demo thật; chọn an toàn, dịch vụ, cấp quyền vị trí, điền điểm nhận biết và tình trạng xe rồi gửi yêu cầu.
2. Bản đồ nền OSM hiển thị được đường phố Đà Nẵng. Sau khi có người nhận ca, bản đồ hiển thị hai điểm và tuyến đường; khách thấy số liên hệ cứu hộ, khoảng 10 phút và 8,2 km.
3. Bốn cứu hộ viên thuộc ba cửa hàng đã được bật sẵn sàng bằng API. Theo dõi đề nghị bằng API của từng tài khoản mỗi khoảng 1,5 giây, không thấy hai đề nghị đang chờ đồng thời. Đây là quan sát của lượt thử, không phải chứng minh đầy đủ mọi tình huống tranh chấp đồng thời.

| Lượt | Người nhận đề nghị | OSRM: giây / mét | Thao tác kiểm thử |
| --- | --- | --- | --- |
| 1 | Cứu hộ 2, Hải Châu | 63 / 748 | Từ chối qua API |
| 2 | Cứu hộ 1, Hải Châu | 63 / 748 | Không phản hồi, để đề nghị hết hạn |
| 3 | Cứu hộ 3, Mỹ An | 328 / 4.819 | Từ chối qua API |
| 4 | Cứu hộ 4, Hòa Xuân | 554 / 8.196 | Chấp nhận qua API |

Đề nghị lượt 2 có thời hạn khoảng 45 giây tính từ lúc phát; bộ theo dõi nhìn thấy đề nghị sau lúc phát vài giây. Sau khi hết hạn, hệ thống chuyển sang lượt 3. Tổng thời gian từ tạo yêu cầu đến được nhận khoảng 52 giây theo lịch sử backend; đây là kết quả riêng kịch bản cố ý từ chối/hết hạn này, không phải cam kết thời gian nhận mọi ca. Hai người đầu cùng tọa độ cửa hàng nên cùng thời gian đường bộ; lượt thử này không chứng minh đầy đủ từng thành phần điểm hoặc cơ chế chống bỏ đói dài hạn.

4. Đăng xuất khách và đăng nhập cứu hộ 4 trên cùng APK. Nhập giá 50.000 đồng, bấm bắt đầu di chuyển, đã gặp khách, hoàn tất ca. Backend ghi chuỗi `assigned → en_route → diagnosing → completed`. Không cần khách xác nhận từng bước.
5. Đăng nhập lại khách trên APK: ca nằm trong lịch sử đã kết thúc, giá 50.000 đồng được giữ lại, có màn hình đánh giá tùy chọn. Lưu được mức 4/5 và đọc lại từ backend.
6. Khi kiểm tra cuối, cả bốn tài khoản không còn ca mở hoặc đề nghị treo. Người đã nhận ca được bật sẵn sàng lại; tất cả bốn tài khoản trả `available=true`. Ca làm việc hiện tại kết thúc lúc 00:00 ngày 10/11 giờ Việt Nam; sau đó cần bật lại theo khung giờ cửa hàng, không phải sẵn sàng vĩnh viễn.

## Thiếu sót và phần chưa kết luận

- **Liên hệ bên cứu hộ chưa đúng:** màn hình chi tiết của cứu hộ viên hiển thị số chính cứu hộ viên thay vì số khách. `RescueOverview.tsx` đang dùng `providerContactPhone` cho mọi vai trò; dữ liệu chi tiết hiện chưa có trường số khách tương ứng. Lượt này chỉ ghi nhận lỗi, chưa sửa hợp đồng API và giao diện đó.
- Nhập nội dung đánh giá qua ADB chưa ổn định: backend chỉ lưu đoạn đầu (`Kiem`) trong lần thử cuối, dù mức 4/5 lưu đúng. Chưa xác định lỗi thuộc thao tác nhập tự động, bàn phím hay trường nhập của app; không đánh dấu phần bình luận dài là đạt.
- Danh sách lịch sử vẫn có chuỗi `[TEST]` trong một số ca demo cũ; chưa sửa dữ liệu cũ trong lượt này.
- Truy vấn trang thông báo mới nhất của admin không tìm thấy thông báo gắn ca này. Chưa kiểm tra toàn bộ phân trang và chính sách phát thông báo; không kết luận đã có đúng một thông báo admin cho ca này.
- Chưa xác minh thông báo đẩy nổi khi APK đóng/chạy nền, điều hướng Google Maps ngoài app, hủy ca và loại người vừa bị hủy trong 15 phút, hoặc tình huống cả bốn người đều không nhận.
- Không di chuyển ngoài thực địa, không đo độ chính xác ETA so với giao thông thực tế, không kiểm thử điện thoại ARM/iOS. Chưa thể gọi đây là kiểm thử toàn bộ hệ thống.

## Bằng chứng cục bộ

Các file `.tmp` và APK thuộc dữ liệu local, không đưa thông tin đăng nhập hay phiên truy cập vào Git:

- `.tmp/apk-dispatch-evidence.json`: bốn lượt chuyển đề nghị và thời hạn.
- `.tmp/apk-flow-final.json`: ca hoàn tất, giá, đánh giá và trạng thái bốn người.
- `.tmp/apk-before-submit.png`: bản đồ OSM và thông tin trước khi gửi.
- `.tmp/apk-customer-assigned.png`: tuyến đường, người nhận, thời gian đến.
- `.tmp/apk-provider-completed.png`: ca hoàn tất trên APK cứu hộ.
- `.tmp/apk-history-ended.png`: lịch sử khách.
- `.tmp/apk-review-saved.png`: màn hình xác nhận lưu đánh giá.
- `dist/apk/build-info.json`: kích thước và SHA-256 của APK hiện tại.

Đã sửa điều kiện hiển thị đăng nhập kiểm thử để dùng được trong APK staging, vẫn chặn production. Bộ kiểm thử liên quan đã đạt 17 test; APK đã được build và cài lại sau sửa này. Không nâng SDK hoặc thư viện trong lượt kiểm thử.
