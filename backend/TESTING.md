# Kiểm thử PostgreSQL/PostGIS trực tiếp

Unit test chạy bằng Java 21. Integration test cần PostgreSQL 16 có PostGIS **cài trực tiếp, dành riêng cho kiểm thử**. Không dùng cluster đang phục vụ ứng dụng, Supabase hoặc đường hầm tới database thật.

Fixture chỉ kết nối `127.0.0.1`, tạo database ngẫu nhiên `moki_test_<uuid>`, chạy migration rồi xóa đúng database vừa tạo. Test có tạo/cấu hình role ở cấp cluster; vì vậy từ chối cluster có database khác ngoài database hệ thống và database test đúng mẫu. Các role test được giữ lại để tái sử dụng.

Nếu máy chưa có môi trường test riêng, chỉ chạy unit test rõ ràng:

```powershell
cd backend
.\mvnw.cmd "-Dtest=!*IntegrationTest" test
```

Khi đã có cluster test riêng, đặt biến trong terminal, không commit mật khẩu:

```powershell
$env:TEST_PG_ISOLATED = 'true'
$env:TEST_PG_PORT = '5433' # cổng cluster thử nghiệm
$env:TEST_PG_USER = 'postgres'
$env:TEST_PG_PASSWORD = '<mat-khau-cluster-thu-nghiem>'
.\mvnw.cmd test
```

Tài khoản test cần quyền tạo database, role và extension. Không dùng `SPRING_DATASOURCE_*`/`FLYWAY_*` của ứng dụng cho test. Thiếu môi trường thì full test **thất bại**, không tự bỏ qua integration test. Nếu tiến trình bị kill, database test có thể còn lại: xác minh đúng tên trước khi dọn, không xóa bằng wildcard.

CI cài PostgreSQL/PostGIS trực tiếp trên Ubuntu 24.04 và chạy toàn bộ test. JWT/OSRM/Expo trong integration test vẫn là test double, không thay cho kiểm thử dịch vụ và thiết bị thật. Máy local chưa cài sẵn database thì cần chủ dự án chuẩn bị/phê duyệt trước; không tự cài thêm từ test.

`CleanInstallBundleIntegrationTest` chạy chính `scripts/01_init_database.sql` trên database
fixture sạch: kiểm 30 bảng, chặn chạy lại và rollback khi kiểm tra cuối thất bại.
Kiểm thêm reset có xác nhận, giữ Auth users khi cài lại, seed 12 cửa hàng có thể
chạy lại mà không trùng hoặc ghi đè địa chỉ; tất cả trên database fixture cô lập.
`DatabaseMigrationIntegrationTest` chạy Flyway rồi chạy cùng khối kiểm tra schema/RLS
trích từ bundle. Hai luồng này không dùng database Supabase thật.
