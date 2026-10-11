# SQL cài mới Supabase — bộ rút gọn

Một file cài đặt đầy đủ, một file dữ liệu mẫu tùy chọn. Không cần chạy SQL vá lẻ.

| Thứ tự | File                     | Công dụng                                                    |
| ------ | ------------------------ | ------------------------------------------------------------ |
| 1      | `01_init_database.sql`   | Tạo schema đến V13, cấp quyền, kiểm tra bảo mật trước COMMIT |
| 2      | `02_seed_demo_teams.sql` | Tùy chọn: 12 cửa hàng mô phỏng, không phải 12 tài khoản      |

**Không chạy lại các file B1–V13 riêng lẻ** sau file 01. Migration backend là nguồn
để sinh bộ cài và giữ lịch sử Flyway, không phải bộ SQL thứ hai phải chạy.
File 01 gồm 30 bảng, thông báo/hỗ trợ, địa chỉ cửa hàng, phạm vi xe máy xăng,
quyền tạo tài khoản demo và kiểm tra schema/RLS; không cần file verify riêng.

## Chạy lại từ đầu trên project test

1. Kiểm tra đúng project riêng, backup dữ liệu cần giữ và dừng backend/app.
2. Nếu database/project mới hoàn toàn thì bỏ qua bước reset.
   Với project test cũ mà bạn **chủ động muốn xóa dữ liệu**: mở `optional/00_reset.sql`,
   đổi `confirm_reset` thành `RESET_MOTORESCUE`, `deployment_environment` thành
   `staging` trong bản chạy tại SQL Editor, rồi chạy toàn bộ file.
   **Reset xóa toàn bộ schema public**, gồm ca, đội, thông báo, hồ sơ và lịch sử Flyway.
   Chỉ khôi phục được từ backup; không dùng production/project chung.
   Auth users và mật khẩu database được giữ; hồ sơ/quyền app cần thiết lập lại.
3. Chạy TOÀN BỘ `01_init_database.sql` một lần bằng chủ schema trong SQL Editor.
   Thành công: `Database initialized through V13; schema/security checks passed...`.
4. Muốn thêm 12 cửa hàng mẫu: đổi `deployment_environment` trong `02_seed_demo_teams.sql`
   thành `staging` trong bản chạy rồi chạy toàn bộ. Có thể bỏ qua nếu chỉ cần 3 cửa hàng
   của bộ tài khoản kiểm thử bên dưới.
5. Chạy script tài khoản demo, cấu hình backend và khởi động OSRM.

Mỗi file tự quản lý transaction, không bọc thêm BEGIN/COMMIT. File 01 không tự reset.
Kiểm tra thất bại thì không commit; không bỏ guard. Nếu SQL Editor còn transaction
lỗi, chạy `ROLLBACK;` trước khi điều tra. Không chạy lại init trên database đã có dữ liệu
chỉ để chữa lỗi. Không tự xóa Auth users: init backfill hồ sơ customer cho users cũ
sau reset, script demo mới thiết lập lại vai trò tương ứng.

## Sáu tài khoản kiểm thử, bốn cứu hộ viên

Chạy tại thư mục gốc sau khi file 01 hoàn tất:

```powershell
node --env-file=.env scripts/create-test-accounts.cjs --environment=staging --confirm-test-project
```

Cần `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`/secret key
trong cấu hình riêng, cùng project. Không đưa khóa server vào `EXPO_PUBLIC_*` hoặc Git.

| Vai trò                                   | Email                          |
| ----------------------------------------- | ------------------------------ |
| Khách hàng                                | `customer.rescue@example.com`  |
| Cứu hộ viên 1                             | `provider.rescue@example.com`  |
| Cứu hộ viên 2 — cùng cửa hàng với người 1 | `provider2.rescue@example.com` |
| Cứu hộ viên 3 — cửa hàng Mỹ An            | `provider3.rescue@example.com` |
| Cứu hộ viên 4 — cửa hàng Hòa Xuân         | `provider4.rescue@example.com` |
| Admin                                     | `admin.rescue@example.com`     |

Mật khẩu ở `.tmp/test-accounts.local.json`; **không xóa file đó khi reset schema**,
không commit. Script tái sử dụng đúng fixture có đánh dấu, không nhận vơ tài khoản
khác, tự đổi mật khẩu hoặc kích hoạt lại người bị từ chối/đình chỉ.
Mất file mật khẩu nhưng Auth users còn: khôi phục file hoặc xử lý trong Dashboard.

Script tạo 3 cửa hàng [TEST] đã duyệt, 4 cứu hộ viên active; thành viên mới offline.
Địa chỉ/tọa độ, trạng thái, năng lực đã chỉnh và mật khẩu cũ không bị ghi đè.
Ba tài khoản cứu hộ mới dùng cùng mật khẩu đã lưu của cứu hộ viên 1, chỉ trong fixture.
**Không cần chạy `optional/03_bootstrap_operator.sql`** với bộ tài khoản này.
Thành viên cũ pending phải được admin duyệt sau kiểm tra, không tự duyệt hàng loạt.

Không đổi cài đặt xác thực toàn project trong lần rút gọn này.
Tài khoản mẫu được xác nhận email riêng; JWT, phân quyền và luồng SMS vẫn giữ.
Không chạy script tài khoản trên production.

## Kết nối và thử nhận ca

- Runtime backend dùng `SPRING_DATASOURCE_USERNAME=motorescue_api`, không dùng postgres.
  Reset schema không xóa role/mật khẩu cũ. Role mới chưa có mật khẩu thì đặt riêng bằng
  `ALTER ROLE motorescue_api PASSWORD '<mật-khẩu-riêng>';`, không commit mật khẩu.
- Cài qua SQL Editor: `SPRING_FLYWAY_ENABLED=false`, không trộn với Flyway baseline/migrate.
- Điện thoại dùng API URL LAN/HTTPS truy cập được, không dùng localhost.
- Khởi động backend và OSRM thực có dataset phù hợp. `npm start` không tự cài/chạy OSRM.
  Readiness kiểm schema, không chứng minh OSRM hoặc Google Maps đang chạy.
- Đăng nhập khách và cứu hộ viên trên thiết bị hoặc **profile trình duyệt riêng biệt**.
  Nhiều tab cùng profile chia sẻ phiên, không phải nhiều tài khoản độc lập.
- Bật sẵn sàng từng người, chọn vá lốp và điểm khách trong vùng/bán kính cửa hàng.
  Giữ app mở: Expo Go/web không đăng ký push nền; danh sách lời mời tải lại mỗi 10 giây.
- Một yêu cầu chỉ có một lời mời còn hiệu lực. Từ chối thì xét người tiếp theo;
  bỏ qua thì hết hạn (mặc định 45 giây), chờ lượt quét 15 giây và lần tải danh sách.
  Hết ứng viên hoặc không có tuyến phải kết thúc tìm, không chờ vô hạn.

Tọa độ cửa hàng là giá trị khởi tạo, không gán lại mỗi lần mở app. Admin sửa tại
**Đội → cửa hàng → Địa chỉ và vị trí cửa hàng**, chọn ghim và nhập địa chỉ.
Tắt sẵn sàng toàn đội, kết thúc ca/lời mời mở trước khi chuyển địa điểm.

Chỉ tiếp nhận **xe máy xăng**: vá lốp, hỗ trợ ắc quy, hết nhiên liệu, sửa chữa nhỏ,
vận chuyển. Catalog xe điện cũ được giữ nhưng vô hiệu hóa; không mở mới/tìm lại
cứu hộ cho ca ngoài phạm vi. Ca cũ đã phân công vẫn có thể hoàn tất/hủy.

## Khi gặp lỗi

- `RESET_NOT_CONFIRMED`: chưa điền đúng hai hằng xác nhận; không xóa guard.
- `PUBLIC_NOT_EMPTY_DO_NOT_RUN_CLEAN_INSTALL`: không chạy init chồng schema cũ.
  Chỉ reset khi backup và chủ động chọn cài lại project test theo quy trình trên.
- `MOTORESCUE_API_ROLE_UNSAFE`: nhờ quản trị database kiểm tra thuộc tính role.
  File 01 dùng lại role hợp lệ, không `ALTER ROLE ... NOSUPERUSER` gây lỗi quyền Supabase.
  Không xóa role, cấp SUPERUSER hoặc bỏ guard để chữa lỗi.
- `READ_PROFILES: 42501` hoặc READ_SHOP_ADDRESS/READ_SERVICES/READ_CHECKLIST: kiểm tra
  khóa server, đúng project và quyền bảng. File 01 đã cấp quyền rõ ràng cho 7 bảng
  fixture dùng, không dựa vào quyền mặc định sau reset và không tắt RLS.
  Chưa ghi Auth khi các kiểm tra READ này thất bại; giữ file mật khẩu để chạy lại sau xử lý.
- Thiếu địa chỉ/phạm vi xe xăng: database chưa khớp schema. Dừng để kiểm tra, không dùng
  init/reset như cách chữa lỗi tự động. Database có dữ liệu cần giữ phải có kế hoạch
  nâng cấp riêng; database do Flyway quản lý dùng migrate/validate đến V13.

## Các file SQL còn giữ

Chỉ còn 5 file SQL trong `scripts/`: 2 file chính và 3 thao tác bảo trì độc lập:

- `optional/00_reset.sql`: phá hủy public khi chủ dự án cho phép.
- `optional/03_bootstrap_operator.sql`: admin đầu tiên từ tài khoản OTP có sẵn;
  không cần với bộ tài khoản demo.
- `optional/04_schedule_retention.sql`: lịch xóa/làm mờ dữ liệu khi đã thống nhất
  retention và có pg_cron; không bắt buộc cho demo.

12 cửa hàng file 02 pending, chưa có thành viên, không tự nhận ca. Tọa độ mô phỏng
trong khung 15.95–16.18 Bắc, 108.05–108.34 Đông, không phải toàn Đà Nẵng hay địa chỉ
đối tác thật. Hotline giả +1 202 555-0101..0112, không gọi/SMS.

## Dành cho phát triển

```powershell
node scripts/build-init-sql.cjs
node scripts/build-init-sql.cjs --check
```

Lệnh mặc định chỉ tạo lại file 01; `--check` kiểm khớp nguồn, không kết nối database.
Mọi sửa lỗi cài mới phải được phản ánh trong file 01 và kiểm thử, không thêm SQL vá lẻ.
Nguồn schema: migration backend; kiểm tra: `database-checks.cjs`; quyền fixture:
`test-setup-permissions.cjs`. Không sửa checksum migration đã áp dụng.
Riêng nhánh role đã tồn tại trong B1 được trình sinh thay bằng kiểm tra an toàn;
bundle ghi cả `ORIGINAL SHA256` và `SHA256` thực thi để đối chiếu.

Khi cần chẩn đoán: `--preflight`/`--verify` sinh SQL **chỉ đọc** trong `.tmp/`,
không thực thi, không phải bước cài đặt. Công cụ không còn sinh bản vá/nâng cấp lẻ.
Bỏ qua các bản vá cũ đã lưu trong SQL Editor khi cài mới.

Test thực thi bundle, seed và rollback: `CleanInstallBundleIntegrationTest` trên
PostgreSQL/PostGIS cô lập theo [backend/TESTING.md](../backend/TESTING.md).
Unit/static test không chứng minh SQL đã chạy trên Supabase.
API thông báo/hỗ trợ: [COMMUNICATIONS.md](../docs/COMMUNICATIONS.md).
