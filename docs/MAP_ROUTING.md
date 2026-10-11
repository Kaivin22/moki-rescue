# Tích hợp bản đồ và định tuyến

## Phạm vi repository

App và backend vẫn có tích hợp OpenStreetMap (OSM), Open Source Routing Machine (OSRM), Estimated Time of Arrival (ETA, thời gian đến dự kiến) và liên kết dẫn đường Google Maps. Thư mục `routing/` dùng cho demo trình duyệt, script thử nghiệm và dữ liệu đường đã được loại khỏi dự án theo yêu cầu chủ dự án; không cần thư mục này để chạy unit test hoặc export app.

Điều này **không** làm backend tự có dữ liệu đường. Để tính ETA và trả tuyến thật, phải có một dịch vụ OSRM hoạt động với dataset đã xử lý phù hợp vùng phục vụ. Nếu OSRM đang trỏ vào dataset cũ trong `routing/`, cần khôi phục/di chuyển dataset ra ngoài repository và cấu hình lại tiến trình OSRM trước khi khởi động lại. `npm start` không cài, tải dữ liệu hoặc khởi động OSRM.

## Luồng trong code

1. App dùng [OpenStreetMap.tsx](../src/features/maps/OpenStreetMap.tsx) và [mapDocument.ts](../src/features/maps/mapDocument.ts) để hiển thị ảnh nền tile, ghim và tuyến. Android/iOS hiển thị qua WebView, web qua iframe; ảnh nền tải qua mạng, không đọc `routing/data/`.
2. Backend gọi OSRM qua [RoadRoutingService.java](../backend/src/main/java/com/danang/motorescue/service/RoadRoutingService.java): Table lấy thời gian/quãng đường từ nhiều cứu hộ viên tới một điểm đón; Route lấy thời gian, quãng đường và hình học tuyến.
3. Tọa độ gửi OSRM theo thứ tự `kinh độ,vĩ độ`. Response có thời gian theo giây, quãng đường theo mét và geometry GeoJSON; backend đổi điểm `[kinh độ,vĩ độ]` thành đối tượng `latitude/longitude` cho app. Đây là ước tính theo dữ liệu/profile định tuyến, không phải thời gian thực đo ngoài đường.
4. Từ V10, điều phối và OSRM dùng `rescue_teams.base_latitude/base_longitude` của cửa hàng. App vẽ geometry nhận từ backend trên ảnh nền OSM. Khi nhận ca, lưu tọa độ cửa hàng vào snapshot của yêu cầu; không theo dõi GPS chờ ca hay GPS di chuyển. Snapshot ca cũ không bị viết lại thành vị trí cửa hàng. Khi thiếu tuyến hợp lệ, không dùng đoạn thẳng để giả lập tuyến đường.
5. [navigation.ts](../src/features/rescue/services/navigation.ts) tạo liên kết Google Maps với đích là điểm đón hoặc điểm giao xe khi đang vận chuyển. Không truyền `origin`, để Google Maps lấy vị trí hiện tại của thiết bị. Google Maps tự tính tuyến/thời gian riêng; app không truyền geometry OSRM sang Google Maps.

## Cấu hình

```dotenv
EXPO_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
EXPO_PUBLIC_MAP_TILE_ATTRIBUTION=
OSRM_MOTORBIKE_BASE_URL=http://127.0.0.1:5000
OSRM_PROFILE=driving
```

- Hai biến tile thuộc app, được đọc khi khởi động bundler/build. Giữ attribution OSM và cấu hình attribution phù hợp nếu đổi nhà cung cấp tile.
- Hai biến OSRM chỉ thuộc backend. Base URL không kèm `/route/v1` hoặc `/table/v1`; `127.0.0.1` ở đây là máy chạy backend, không phải điện thoại.
- Chuỗi `driving` trong URL không lựa chọn lại loại xe của dataset: profile xử lý dữ liệu OSRM phải phù hợp phương tiện. Không dùng dataset ô tô rồi khẳng định ETA xe máy đã được kiểm chứng.
- OSRM có thể chạy độc lập trên WSL/Linux hoặc máy chủ khác. Repository không kèm bộ cài, dataset hay công cụ quản lý tiến trình đó.

## Vùng phục vụ và giới hạn kiểm chứng

Migration V9 quy định vùng demo: vĩ độ `15.95–16.18`, kinh độ `108.05–108.34`, đồng thời kiểm tra vùng dịch vụ đang hoạt động trong database. Đây không phải ranh giới hành chính toàn Đà Nẵng; ở trong khung cũng không bảo đảm có đoạn đường định tuyến hợp lệ. Backend vẫn kiểm tra vùng khi tạo yêu cầu, cập nhật khả năng nhận ca, matching và nhận ca.

Chú thích đường dẫn dataset cũ trong migration/SQL được giữ để lưu nguồn gốc vùng demo; SQL không đọc file tại đường dẫn đó. Không sửa checksum migration đã triển khai chỉ để đổi chú thích.

CI chạy unit/integration test bằng dữ liệu kiểm thử và export bundle; **không chứng minh endpoint OSRM local đang chạy, tile tải trên điện thoại hoặc Google Maps mở đúng vị trí thực tế**. Trước demo thực tế cần kiểm tra riêng Table/Route trên endpoint đã cấu hình, ảnh nền và geometry trên thiết bị, vị trí đón/giao trong Google Maps, lỗi mất mạng và ngoài vùng. `/api/health/ready` kiểm tra database, không thay thế các kiểm tra này.

## Kiểm tra bản đồ trắng và bảng thông tin trên điện thoại

- Có ghim/nút phóng to nhưng không có đường phố là lỗi ở nhánh ảnh nền, không tự chứng minh OSRM lỗi hoặc thiếu dữ liệu đường. Ảnh nền lấy từ nguồn HTTPS cấu hình phía app, không cần tải bộ OSM xuống điện thoại.
- `mapDocument.ts` vẫn tải tile trực tiếp như bình thường. Trên iOS/Android, nếu ảnh lỗi hoặc chưa tải sau 10 giây, `MapSurface.tsx` dùng `nativeTileLoader.ts` thử lại đúng tile đó qua mạng native rồi gửi ảnh về WebView. Không chuyển nhà cung cấp, không tải cả thành phố, không giả lập nền bản đồ. Mỗi tile chỉ thử native một lần; tối đa 4 yêu cầu đồng thời, có timeout và hủy khi tile bị loại/màn hình unmount. Header định danh app được gửi; không ép bỏ HTTP cache. Nếu mạng điện thoại cũng không đến được máy chủ, nhánh này vẫn thất bại và app báo lỗi, không bảo đảm hoạt động offline.
- Lỗi HTTP (ví dụ `HTTP 403`, `HTTP 429`), `network`, `timeout`, `format` được hiển thị để phân biệt nguồn ảnh từ chối truy cập, kết nối thất bại, hết thời gian hoặc nội dung không phải ảnh hỗ trợ. Không xóa thông báo lỗi của tile còn hỏng chỉ vì một tile khác tải được.
- Ở bước **Vị trí** của **Gọi cứu hộ**, kéo vùng tiêu đề **Xác nhận điểm cứu hộ** xuống để thu gọn, kéo lên để mở lại; cũng có thể chạm vùng này. Cuộn nội dung biểu mẫu và kéo bản đồ là hai thao tác độc lập. Thu gọn không xóa ghim, điểm giao hay nội dung đã nhập; nút tìm đội vẫn còn. Khi nhập liệu, bảng có thể dùng thêm diện tích để tránh bàn phím che phần nhập.

Thử trực tiếp sau khi reload app trong Expo Go:

1. Vào **Gọi cứu hộ → Vị trí**, lấy GPS; xác nhận nhìn thấy tên đường/đường phố, không chỉ ghim.
2. Thu/mở bảng bằng cả kéo và chạm; thử kéo bản đồ, kéo ghim, nhập điểm nhận biết và mở/đóng bàn phím. Kiểm tra dữ liệu đã nhập vẫn còn.
3. Nếu vẫn trắng, ghi lại mã lỗi và bấm **Kiểm tra nguồn ảnh trên trình duyệt** ngay trên cùng điện thoại. So sánh với Wi-Fi/dữ liệu di động khác; Safari tải được chưa chứng minh WebView tải được, và máy tính tải được chưa chứng minh điện thoại tải được.
4. Kiểm tra bản đồ ca cứu hộ ở cả tài khoản khách và cứu hộ vì chúng dùng chung thành phần bản đồ. Kiểm tra tuyến OSRM riêng khi backend/OSRM đang chạy.

Kiểm chứng ngày 10/10/2026: một tile ở tọa độ ảnh báo lỗi (`15/26236/14910.png`) tải từ máy tính trả HTTP 200, PNG 13.824 byte, đã kiểm tra nội dung ảnh đường phố. Unit test mô phỏng vòng đời tile, lỗi mạng/HTTP, hủy tải và chốt trạng thái kéo; không thay thế thao tác trên iPhone thật. Chưa xác nhận nguyên nhân mạng/WebView cụ thể trên iPhone từ kết quả này.
