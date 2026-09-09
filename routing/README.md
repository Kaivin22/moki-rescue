# OpenStreetMap + OSRM + Google Maps

## Thiết kế

- App dùng Leaflet 1.9.4 + OpenStreetMap để chọn ghim và hiển thị tuyến. Android/iOS dùng WebView 13.15.0 theo Expo SDK 54; web dùng iframe cô lập.
- Backend gọi OSRM Table để so sánh ETA và OSRM Route để lấy geometry. Không dùng đường thẳng thay tuyến khi OSRM lỗi.
- V8 lưu GPS chờ ca gần nhất khi nhận ca. Khách thấy tuyến tham khảo **vị trí cứu hộ viên lúc nhận ca → điểm cứu hộ**, không thấy cứu hộ viên di chuyển. Trạng thái ca vẫn cập nhật.
- Nút Google Maps mở ứng dụng/trang dẫn đường bên ngoài. Google Maps lấy GPS thiết bị làm điểm xuất phát; sau khi bắt đầu vận chuyển, đích chuyển sang điểm giao xe. Tuyến bên ngoài có thể khác OSRM.

## Cấu hình

```dotenv
EXPO_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
EXPO_PUBLIC_MAP_TILE_ATTRIBUTION=
OSRM_MOTORBIKE_BASE_URL=http://127.0.0.1:5000
OSRM_PROFILE=driving
```

Biến tile được đọc khi build app; biến OSRM chỉ thuộc backend. Không dùng Google Maps SDK/Directions API và không cần Google Maps key cho liên kết dẫn đường. `driving` trong URL **không quyết định loại xe**: dữ liệu phải được preprocess bằng đúng Lua profile.

Tile OSM công cộng không có SLA. Giữ attribution nhìn thấy, không tải trước/bulk/offline, dùng cache HTTP bình thường. Native gửi User-Agent ứng dụng; web giữ referrer. Khi phát hành rộng cần chọn tile provider phù hợp, cập nhật URL và attribution. Leaflet tải từ unpkg với version/SRI cố định; lỗi mạng/CDN/tile hiện nút thử lại.

## OSRM chạy độc lập

Dùng OSRM v5.27.1 cài trực tiếp trên Linux/WSL hoặc endpoint máy chủ được quản lý riêng. Không tự cài Linux/WSL hay triển khai máy chủ từ các script này. Xem [hướng dẫn build chính thức](https://github.com/Project-OSRM/osrm-backend/tree/v5.27.1#building-from-source).

`profiles/motorcycle.lua` là profile **thử nghiệm** cho cứu hộ viên đi xe máy đơn: dùng handler chính thức, access tag xe máy, đường một chiều và turn restrictions; loại motorway/motorroad, đường đi bộ và đường riêng. Chưa hiệu chỉnh bằng khảo sát thực tế, chưa xử lý mọi điều kiện theo giờ, không dành cho xe tải cứu hộ. Không coi ETA là cam kết hoặc profile đã được kiểm chứng ngoài đường.

Khi đã có OSRM binary và PowerShell 7 trên Linux/WSL, chạy từ repo root:

```powershell
./routing/Prepare-Data.ps1 -InputFile /path/to/danang.osm.pbf `
  -OsrmProfilesDirectory /path/to/osrm-backend/profiles `
  -OsrmBinDirectory /path/to/osrm-backend/build
```

Hoặc thay `-InputFile ...` bằng `-DownloadDaNang` để tải một lần đường ở bbox `15.95,108.05,16.18,108.34` qua Overpass. Chỉ là vùng demo, **không bao phủ mọi service zone**. Script tạo thư mục đầu ra mới, không ghi đè, kiểm lỗi tải và in SHA256. `routing/data/` được gitignore.

Sau khi xử lý thành công, chạy lệnh `osrm-routed --algorithm mld --ip 127.0.0.1 --port 5000 --threads 2 <duong-dan/map.osrm>` mà script in ra. Cấu hình URL tương ứng cho backend. OSRM trên server khác cần mạng nội bộ/HTTPS và kiểm soát truy cập; không công khai tọa độ/log ca.

```powershell
./routing/Test-Routing.ps1 -BaseUrl http://127.0.0.1:5000
```

Kiểm quy tắc bằng `fixtures/access.osm`: preprocess, chạy router trên cổng riêng rồi thêm `-Fixture` khi test. Không dùng mạng giả lập để demo đường thật.

## Trạng thái kiểm chứng

Đã tải và preprocess bản trích OSM Đà Nẵng ngày 09/09/2026, SHA256 `96A7AB6DC271A48A9AF5A6C4063CD9661574B8823D78CD92ACFED4028B534C2B`. Đã dựng OSRM v5.27.1 native trên WSL (không Docker), chạy `osrm-routed` MLD và xác nhận cả Route lẫn Table trả `code: Ok` với dữ liệu thật. Đây là demo cục bộ, chưa phải máy chủ production.

- Áp dụng V8 trước backend mới. Ca cũ không có snapshot báo thiếu vị trí, không lấy GPS hiện tại giả làm lịch sử.
- Kiểm ca đóng/thu hồi xóa snapshot, đổi người nhận chụp vị trí mới.
- Kiểm kéo ghim, geometry, attribution không bị che, lỗi mạng và thử lại trên thiết bị.
- Nhận ca phải dừng GPS chờ ca; Google Maps mở đúng điểm đón/giao trên Android/iOS.
- Kiểm cầu, đường một chiều, đường cấm, `NoRoute`, biên dataset và ETA thực tế trước khi nhận ca thật.

Nguồn: [OSRM API](https://project-osrm.org/docs/v5.24.0/api/), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [chính sách tile OSM](https://operations.osmfoundation.org/policies/tiles/), [Leaflet](https://leafletjs.com/examples/quick-start/), [WebView SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/webview/).
