# Dự phòng dữ liệu PostgreSQL/PostGIS và xử lý gián đoạn

## Trạng thái và giới hạn

Đã chuẩn bị `scripts/database-backup.cjs`, cấu hình mẫu và kiểm thử logic bằng dữ liệu
giả lập. Máy chưa có `pg_dump`, `pg_restore`, `psql` hay máy chủ PostgreSQL/PostGIS
phục vụ diễn tập. **Chưa tạo bản sao lưu dữ liệu thật, chưa chạy khôi phục thật và
chưa đo được thời gian khôi phục.** Script không tự cài phần mềm.

Không bổ sung MySQL, không tự đổi database của app, không tự chuyển máy chủ dự phòng.
Đây là quy trình sao lưu và diễn tập thủ công, **không phải cơ chế bảo đảm app luôn chạy**.
Không sửa PRD/SRS hoặc reset/migrate Supabase trong công việc này.

- Supabase Dashboard không truy cập được chưa chứng minh database/Auth đã ngừng.
- Nếu database ngừng thì các chức năng cần đọc/ghi dữ liệu không thể hoạt động bình thường.
- App còn dùng Supabase Auth và API đọc `profiles`; backend xác thực JWT bằng cấu hình
  Supabase. Chỉ đổi JDBC sang database local không thay thế được các thành phần đó.
- PostgreSQL là hệ quản trị dữ liệu đang dùng; PostGIS bổ sung kiểu dữ liệu/hàm địa lý.
  Bản sao PostgreSQL/PostGIS phù hợp hơn việc duy trì thêm bộ schema MySQL khác.
- Khôi phục một bản sao cũ không khôi phục được các thay đổi phát sinh sau thời điểm sao lưu.

## Script sao lưu những gì?

Một archive định dạng custom của `pg_dump`, gồm schema và dữ liệu `public` + `auth`.
Có bảng người dùng/Auth, hồ sơ, đội cứu hộ, ca, đánh giá, lịch sử và lịch làm việc
**nếu chúng thực sự tồn tại ở nguồn lúc sao lưu**. Không tự thêm V14 còn thiếu.

`pg_dump` lấy snapshot nhất quán của dữ liệu trong lần dump; ghi dữ liệu vẫn có thể
tiếp tục. Tránh chạy migration/thay đổi cấu trúc cùng lúc. Metadata phiên bản,
extension và role chính sách được đọc riêng trước dump, không phải cùng snapshot.
Script đọc nguồn ở chế độ read-only, không dùng `--enable-row-security` để xuất một
phần dữ liệu rồi nhầm tưởng là đầy đủ; tài khoản nguồn phải đủ quyền đọc toàn bộ.

Mỗi lần chạy thành công tạo thư mục mới, không ghi đè:

```text
E:\MotoRescueBackups\motorescue-<thời-gian>-<mã-ngẫu-nhiên>\
  database.dump
  manifest.json
  restore-motorescue_drill_<mã>.json   (chỉ có sau diễn tập thành công)
```

Manifest chứa SHA-256, dung lượng byte, phiên bản, thời điểm và thời gian dump.
Không lưu mật khẩu, URL kết nối hoặc dữ liệu từng người. `restoreTested: false` ghi
trạng thái lúc tạo backup; bằng chứng diễn tập là file `restore-*.json` riêng gắn với
SHA-256 đó. `verify` chỉ kiểm tra checksum/kích thước/danh mục bảng, **không chứng minh
mọi dữ liệu có thể khôi phục**. SHA-256 phát hiện hỏng/thay đổi ngoài ý muốn, không
xác thực người tạo nếu kẻ khác sửa được cả archive lẫn manifest.

Không bao gồm:

- File ảnh/tệp trong Storage, cấu hình bucket và schema Storage/Realtime do nền tảng quản lý.
- Dịch vụ Auth, API, Realtime, khóa ký JWT, SMTP/SMS và cấu hình môi trường.
- Định nghĩa/mật khẩu role cấp cluster. Archive có owner/ACL của đối tượng, nhưng
  diễn tập bỏ owner/ACL; không được coi quyền production đã khôi phục.
- Mã backend/app, dữ liệu OSRM, cấu hình triển khai, bản cài extension PostGIS.

Đây là bản sao **phần dữ liệu của dự án**, không phải bản sao toàn bộ nền tảng Supabase.

## Chuẩn bị công cụ — chỉ khi chủ máy cho phép cài

1. Cài bộ native PostgreSQL có `pg_dump`, `pg_restore`, `psql` vào ổ E. Không cần server
   local chỉ để dump/verify. Không dùng công cụ tự tải phần mềm trong script.
2. Để diễn tập, cần thêm PostgreSQL server riêng, data directory và log ở ổ E, cùng
   PostGIS tương thích. Chọn port riêng như 5433, chỉ nghe loopback; không dùng cluster
   chứa dự án khác. Tắt service sau diễn tập nếu không cần chạy nền.
3. Cả ba client phải cùng major, từ 15 trở lên và không cũ hơn server nguồn.
   Server diễn tập không cũ hơn major của `pg_dump`; nên dùng cùng major và PostGIS
   tương thích với nguồn. Chưa xác nhận được các phiên bản thực tế trên máy này.
4. Chủ máy tạo thư mục riêng ngoài repository, ví dụ `E:\MotoRescueBackups` và
   `E:\Private`. Không để backup thật trong `.tmp`, Git hoặc thư mục đồng bộ công khai.
5. Sao chép `.env.backup.example` thành `.env.backup.local`, điền đường dẫn/cấu hình thật.
   Không sửa `.env` chạy app. Lấy kết nối trực tiếp hoặc **session pooler** được nhà
   cung cấp hỗ trợ, không dùng transaction pooler để dump. Chọn đúng project nguồn.
6. Tạo password file riêng, không nhập mật khẩu vào command line hoặc commit. Định dạng
   libpq là `host:port:database:user:password`. Ví dụ mẫu, phải thay giá trị thực:

   ```text
   db.YOUR_PROJECT_REF.supabase.co:5432:postgres:postgres:SOURCE_PASSWORD
   ```

   File local drill dùng dòng riêng, vì tên database được sinh ngẫu nhiên:

   ```text
   127.0.0.1:5433:*:postgres:LOCAL_DRILL_PASSWORD
   ```

   Không đặt wildcard cho tất cả host/user. Trong mật khẩu, dấu `:` và `\` phải escape
   theo quy tắc libpq. Unix yêu cầu quyền 0600; Windows cần đặt ACL chỉ cho tài khoản
   chủ máy. `chmod` trong Node không thay thế ACL Windows.
7. Kết nối nguồn mặc định `verify-full`; cấu hình `BACKUP_PG_SSLROOTCERT` bằng chứng thư
   đáng tin từ nhà cung cấp nếu máy chưa có. Không tự hạ bảo vệ TLS khi gặp lỗi certificate.

Archive có hash mật khẩu, token/phiên Auth và dữ liệu cá nhân. **Không được chia sẻ
file dump/pgpass lên Git, chat hoặc gửi kèm báo cáo cho giảng viên.** Bảo vệ bằng ACL
và mã hóa ổ đĩa/thiết bị lưu trữ; custom dump là nén/định dạng lưu, không phải mã hóa.
Các đuôi dump/backup/pgpass được ignore là lớp phòng tránh, không phải bảo mật tuyệt đối.

## Thứ tự chạy tại thư mục dự án

Các lệnh dưới đây là hướng dẫn cho khi đã cài và cấu hình, chưa phải bằng chứng đã chạy.

```powershell
node --env-file=.env.backup.local scripts/database-backup.cjs check
node --env-file=.env.backup.local scripts/database-backup.cjs backup --confirm-source
node --env-file=.env.backup.local scripts/database-backup.cjs verify 'E:\MotoRescueBackups\<thu-muc-vua-tao>'
node --env-file=.env.backup.local scripts/database-backup.cjs restore-check 'E:\MotoRescueBackups\<thu-muc-vua-tao>' --confirm-local-drill
```

- `check`: chỉ xác nhận ba executable/phiên bản; không kết nối database.
- `backup`: đọc nguồn, tạo archive/manifest. Lỗi thì không có manifest thành công,
  giữ thư mục/partial để kiểm tra; không sử dụng phần dang dở làm bản sao hợp lệ.
- `verify`: không kết nối database, không khôi phục.
- `restore-check`: **ghi vào cluster local cô lập**, không kết nối app hoặc Supabase.
  Chỉ nhận địa chỉ `127.0.0.1`/`::1`, database quản trị `postgres`, cờ xác nhận và
  cluster không có database ứng dụng khác. Có quyền admin local mới được tạo DB.
  Chỉ restore archive do mình tin cậy: dump chứa SQL có thể thực thi mã.

Diễn tập tạo database mới `motorescue_drill_<16-ký-tự>` từ template0; không tái sử dụng
hay reset database cũ. Chuẩn bị extension trong schema `extensions`, role cần cho RLS
ở dạng NOLOGIN nếu còn thiếu, rồi restore trong một transaction. Script chỉ hỗ trợ
bố cục extension `postgis`, `pgcrypto`, `uuid-ossp` trong `extensions`; bố cục khác
cần rà soát riêng, không tắt guard. Nó đếm số dòng các bảng sau restore và ghi báo cáo;
không đối chiếu với số dòng nguồn đang thay đổi hoặc xác nhận ý nghĩa nghiệp vụ.

**Cả khi lỗi lẫn thành công đều giữ database diễn tập**, không tự xóa. Các role mới
tồn tại ở cấp cluster. Mỗi lần diễn tập tạo thêm dữ liệu và WAL, vì vậy sẽ tăng dung
lượng. Xem lại báo cáo/dung lượng, rồi chủ máy quyết định dọn đúng database hoặc cluster
thử nghiệm; không chạy lặp vô hạn. Script không chạy lịch nền và không tự cài service.

## Nếu cần phục hồi để app chạy thật

Kết quả `RESTORE_DRILL_PASSED` chỉ có nghĩa SQL/schema/data đã nạp được vào DB thử.
Nó **không chứng minh đăng nhập, quyền production, API và app hoạt động**.

Trước khi chuyển hệ thống thật phải có kế hoạch được duyệt: dừng nhận ghi/điều phối,
chọn bản sao phù hợp, khôi phục vào môi trường được hỗ trợ, phục hồi dịch vụ Auth/API
và cấu hình/khóa qua kênh bí mật, kiểm tra owner/grant/RLS, dữ liệu Storage và endpoint.
Sau đó kiểm thử đăng nhập đủ vai trò, đọc hồ sơ, tạo/nhận/kết thúc ca, phân quyền,
OSRM và thông báo. Ca/lời mời cũ trong backup cần đối soát, không bật scheduler gửi
lại thông báo hay giao ca cũ trước khi kiểm tra. Chuyển endpoint có kiểm soát và có
phương án quay lại; không bật app trỏ vào database diễn tập.

Schema `auth` chứa dữ liệu không đồng nghĩa đang có dịch vụ Supabase Auth. Không dùng
fixture giả lập Auth của bộ integration test để thay thế xác thực thật.

## Khi dịch vụ gián đoạn trong app

- API phân biệt lỗi phiên thật sự với lỗi tạm thời lúc lấy phiên/Auth. Không tự đăng
  xuất chỉ vì Auth/mạng tạm mất; không bỏ kiểm tra JWT hoặc phân quyền.
- Mất kết nối DB lúc mở transaction được backend trả 503 `DATABASE_UNAVAILABLE`,
  không lộ chuỗi kết nối hoặc chi tiết SQL trong phản hồi cho điện thoại.
- API client có giới hạn thời gian chờ, thông báo riêng cho lỗi mạng, timeout và 5xx.
  Không tự gửi lại thao tác ghi khi chưa biết kết quả và không giả vờ thành công.
- Với thao tác ghi đã gửi nhưng timeout/mất mạng/5xx, kết quả có thể đã được server ghi.
  Kiểm tra ca/dữ liệu hiện tại trước khi thử lại. Luồng tạo ca giữ mã idempotency khi
  chưa có xác nhận; gửi lại cùng nội dung có thể dùng lại mã để chống tạo trùng.
- Không có hàng đợi offline tự gửi ca sau khi có mạng. Nếu không thể gọi API thì không
  xác nhận cứu hộ đã nhận yêu cầu; người dùng cần phương án liên hệ hỗ trợ khác.

## Lịch sao lưu đề xuất và bằng chứng báo cáo

Hiện chạy **thủ công**, chưa có lịch tự động. Khi bắt đầu dùng dữ liệu cần giữ: sao lưu
mỗi ngày làm việc, trước migration/reset và trước buổi demo. Giữ vài phiên gần nhất
cùng ít nhất một bản đã restore thành công; không xóa bản duy nhất hoặc bản đã kiểm
chứng chỉ để tiết kiệm dung lượng.

Bản sao nằm trên cùng ổ E vẫn có thể mất cùng máy/ổ đĩa. Cần chủ động chép bản mã hóa
sang thiết bị/nơi lưu riêng được phép; script không tự tải dữ liệu lên dịch vụ ngoài.
RPO (Recovery Point Objective: mức dữ liệu tối đa chấp nhận mất theo thời gian) và
RTO (Recovery Time Objective: thời gian phục hồi mục tiêu) chỉ là mục tiêu vận hành.
Ví dụ sao lưu hằng ngày hướng tới mất không quá 24 giờ dữ liệu **nếu backup đều thành
công**; không bảo đảm điều đó khi bỏ lịch. Chưa đo diễn tập thì chưa thể hứa RTO.

Bằng chứng nộp thầy: phiên bản công cụ/DB, thời điểm backup, số byte và SHA-256,
báo cáo restore với số bảng/số dòng, thời gian đo thực tế và kết quả test các vai trò.
Chỉ chụp kết quả đã ẩn dữ liệu nhạy cảm, không nộp archive hoặc mật khẩu.

## Tài liệu tham khảo chính thức

- [PostgreSQL: pg_dump, snapshot, giới hạn chọn schema và phiên bản](https://www.postgresql.org/docs/current/app-pgdump.html).
- [PostgreSQL: pg_restore và lưu ý archive chứa SQL thực thi](https://www.postgresql.org/docs/current/app-pgrestore.html).
- [PostgreSQL: password file](https://www.postgresql.org/docs/current/libpq-pgpass.html).
- [Supabase: backup và dữ liệu không nằm trong database backup](https://supabase.com/docs/guides/platform/backups).
- [Supabase: quy trình backup/restore giữa project](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
