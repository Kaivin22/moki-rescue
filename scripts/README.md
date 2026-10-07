# Database migrations Moki Rescue

## Đọc trước khi chạy trên Supabase

Không chạy mọi file theo số `00 → 01 → ...`: **`00_reset.sql` là thao tác phá hủy**, không phải bước cài đặt.
Chưa script nào tự được áp dụng lên Supabase chỉ vì bạn mở repo. Chạy cả file, không chọn riêng
một đoạn bỏ qua kiểm tra/transaction. Nếu lỗi trong transaction, dừng và `ROLLBACK;` trước khi xử lý tiếp.

| File trong `scripts` | Thời điểm chạy | Tác động |
| --- | --- | --- |
| `01_preflight.sql` | Đầu tiên | Chỉ đọc: bảng hiện có, extension, dấu vết Flyway; xem cả mục Messages cho lịch sử |
| `01_init_database.sql` | Sau preflight, chỉ trên database chưa có schema ứng dụng | Khởi tạo toàn bộ B1–V9 trong một transaction, không cần chạy file ở backend |
| `02_verify_rls.sql` | Sau khi schema đã đến V9 | Chỉ đọc: cấu trúc, RLS, quyền và một số bất biến; không tự sửa lỗi |
| `03_bootstrap_operator.sql` | Sau 02 và sau khi tài khoản admin đăng nhập OTP | Cấp admin đầu tiên theo số điện thoại bạn điền |
| `04_schedule_retention.sql` | Tùy chọn, khi đồng ý chính sách retention | Đăng ký 4 lịch tự động xóa/làm mờ dữ liệu; không cần cho demo ngắn |
| `05_seed_demo_teams.sql` | Tùy chọn, sau 02; thường sau 03 để admin kiểm tra | Thêm 12 đội giả lập `pending`, năng lực và checklist chưa xác minh |
| `06_upgrade_demo_service_coverage.sql` | Chỉ database đã chạy thủ công đến V8 | Áp dụng V9: giới hạn vùng demo OSRM, chặn nhận ca ngoài vùng; không reset, không hủy ca đang làm |
| `00_reset.sql` | Chỉ reset local/staging được phép mất dữ liệu | Xóa toàn bộ schema `public`, gồm dữ liệu app và lịch sử Flyway; giữ Auth users |

### Cài mới bằng SQL Editor (thứ tự thủ công)

Chỉ dùng khi đã xác nhận project dành riêng cho ứng dụng và **chưa có schema ứng dụng**.
**Tất cả file cần mở nằm ngay trong `scripts`.** `01_preflight.sql` chỉ kiểm tra;
`01_init_database.sql` là bản tổng hợp tự sinh từ migration gốc, không phải một schema được sửa độc lập.
Hai file cùng tiền tố 01: luôn chạy **preflight trước, init sau**, không dựa vào thứ tự tên trong Explorer.

1. Chạy `scripts/01_preflight.sql`; nếu đã có bảng ứng dụng/lịch sử Flyway, xem phần nâng cấp bên dưới.
2. Chạy **toàn bộ `scripts/01_init_database.sql` một lần**. File đã chứa B1, V2, V3, V4,
   V5, V6, V7, V8, V9 đúng thứ tự, có `BEGIN`/`COMMIT` và kiểm tra database trước khi tạo.
   **Không chạy lại các file B1–V9 riêng lẻ sau bước này.** Bỏ qua file 06 vì init đã gồm V9.
3. Chạy `scripts/02_verify_rls.sql`. Nếu lỗi, dừng; không bỏ qua bằng cách xóa câu kiểm tra.
4. Thiết lập mật khẩu riêng cho role runtime như phần bên dưới; không dùng `postgres` cho backend.
5. Bật phone auth, đăng nhập OTP bằng tài khoản của bạn; điền số E.164 vào bản chạy
   `scripts/03_bootstrap_operator.sql` rồi chạy. Script không tự tạo tài khoản hoặc xác nhận OTP.
6. Muốn dữ liệu demo: sửa `deployment_environment` thành `staging` trong bản chạy của
   `scripts/05_seed_demo_teams.sql`, rồi chạy. Không dùng trên dữ liệu vận hành thật.
7. Chỉ chạy `scripts/04_schedule_retention.sql` khi muốn tự động áp dụng retention.

File init có sẵn transaction; không thêm một lớp `BEGIN`/`COMMIT` nữa. Nếu chạy lại hoặc `public`
đã chứa bảng/view/sequence hay hàm tự tạo, file sẽ từ chối trước phần khởi tạo. Không xóa guard.
Kiểm tra này không thay thế việc xác nhận đúng project/backup và không phát hiện mọi đối tượng tùy biến.
B1 cần PostGIS ở schema `extensions`; nếu đã ở schema khác, phải xử lý môi trường riêng trước,
không tự drop extension hoặc đổi schema để ép chạy. B1 có lệnh quản lý quyền trên toàn `public`,
vì vậy không chạy vào project đang chứa ứng dụng khác.

**Không trộn hai cách quản lý:** chạy thủ công không tạo `flyway_schema_history`. Giữ
`SPRING_FLYWAY_ENABLED=false`, ghi lại bản init đã chạy và commit tương ứng. Không chạy lại init/B1
hoặc chạy `flyway:migrate` mù quáng sau đó. Nếu chuyển sang Flyway, phải đối chiếu schema thật,
xác nhận version đã áp dụng (ví dụ V8) rồi mới lập kế hoạch baseline đúng version đó; không tự
chèn lịch sử hay baseline ở 1 cho database đã chạy đến 8. Cách khuyến nghị vẫn là dùng Flyway.

### Tạo lại file tổng hợp khi migration thay đổi (chỉ dành cho người phát triển)

```powershell
node scripts/build-init-sql.cjs
node scripts/build-init-sql.cjs --check
```

Hai lệnh dùng Node có sẵn, không cài gói và không kết nối database. Lệnh đầu tạo lại
`01_init_database.sql` và `06_upgrade_demo_service_coverage.sql`; lệnh `--check` chỉ đọc và báo lỗi nếu bản tổng hợp lệch nguồn. Mỗi phần
có tên migration và SHA-256 để đối chiếu. Không sửa tay bản init; sửa schema bằng migration mới
rồi tạo lại. File init chỉ dành cho database mới; database hiện có vẫn nâng cấp bằng migration.

### Database đã tồn tại

**Nâng cấp phạm vi demo từ V8 đến V9 (không xóa dữ liệu):**

1. Backup và dừng backend cũ; xác nhận database đã chạy thủ công đến V8.
2. Chạy toàn bộ `scripts/06_upgrade_demo_service_coverage.sql` trong SQL Editor.
3. Chạy `scripts/02_verify_rls.sql`; nếu có lỗi thì dừng và kiểm tra, không reset database.
4. Khởi động backend code mới rồi Expo. `/api/health/ready` sẽ chưa báo ready nếu thiếu hàm/trigger V9.

Không chạy lại 00/01/03/05 chỉ để nâng cấp này. File 06 không tạo tài khoản, không hủy ca,
không tải thêm bản đồ. Nó thay vùng `Da Nang launch zone` bằng khung demo và tắt nhận ca,
xóa GPS chờ của cứu hộ viên đang sẵn sàng nhưng ở ngoài vùng. Các vùng tùy chỉnh được giữ,
nhưng cũng bị giới hạn bởi khung dữ liệu demo khi kiểm tra phục vụ.
Database quản lý bằng Flyway phải áp dụng V9 bằng Flyway, không chạy file 06.

Khung demo: vĩ độ **15.95–16.18**, kinh độ **108.05–108.34**, bao gồm đường biên.
Đây không phải địa giới hành chính Đà Nẵng; điểm trong khung vẫn cần tuyến OSRM hợp lệ.
Mở rộng vùng sau này cần cập nhật cả dữ liệu OSRM và chính sách database, không chỉ đổi ảnh nền.

- Có lịch sử Flyway: dùng `flyway:info`, `flyway:validate`, `flyway:migrate`; không dán lại migration cũ.
- Đã chạy SQL thủ công: đối chiếu file/commit đã chạy và schema thực tế; chỉ chạy migration còn thiếu
  theo thứ tự. Không chỉ nhìn tên bảng để đoán version.
- Không rõ trạng thái: chỉ chạy `01_preflight.sql` rồi dừng để kiểm tra, không chạy `01_init_database.sql`. Không dùng 00 để chữa lỗi migration.

### Xác nhận email và OTP điện thoại

Theo yêu cầu hiện tại: muốn **tắt Confirm email**, không tắt đăng nhập, JWT, phân quyền hay OTP điện thoại.
Luồng SMS vẫn dùng `signInWithOtp({phone: ...})` và `verifyOtp({type: 'sms', ...})`.
Việc bỏ xác nhận email **không bỏ yêu cầu mã SMS** của luồng đó. Bản phát triển hiện có thêm
đăng nhập email/mật khẩu để kiểm thử, xem mục bên dưới; không thay đổi cấu hình Auth toàn project.

Đây là cấu hình Supabase Auth, không phải SQL ứng dụng. Trong Dashboard, vào
**Authentication → Sign In / Providers → Email → Confirm email: OFF → Save**.
Khi bạn yêu cầu bật lại, đổi đúng tùy chọn đó thành ON; không tự động bật lại bằng script.
Không sửa hàng loạt `auth.users.email_confirmed_at` và không tạo trigger xác nhận email giả.
Kiểm tra chỉ đọc ngày 21/09/2026 trên project cấu hình trong `.env`: Phone đang OFF,
Email đang ON và Confirm email đang ON. Các thiết lập cloud này chưa được thay đổi trong lần rà soát này.
Đăng nhập kiểm thử bên dưới không cần tắt xác nhận email toàn project; chỉ ba tài khoản thử được
xác nhận trước qua Admin API. Không gửi khóa quản trị hay access token vào chat.
Tắt xác nhận email chỉ phù hợp môi trường thử nghiệm đã cân nhắc rủi ro giả địa chỉ email.

Nguồn: [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

### Đăng nhập ba vai trò không cần SMS/email (chỉ local/staging)

Sau khi đã chạy 01/02 thành công, dùng `scripts/create-test-accounts.cjs` cho **project thử nghiệm riêng**.
Đây là đường thiết lập tài khoản demo thay cho bước đăng nhập OTP rồi chạy 03; không cần chạy lại 01,
không cần reset và không cần sửa schema Auth bằng SQL. Không chạy script này vào production.

1. Thêm `SUPABASE_SERVICE_ROLE_KEY` (hoặc `SUPABASE_SECRET_KEY`) vào `.env` trên máy.
   Lấy từ phần API Keys của đúng project Supabase; đây không phải anon/publishable key.
   Không đặt tiền tố `EXPO_PUBLIC_`, không đưa vào `app.config.js`, không commit hoặc gửi vào chat.
2. Chạy ở thư mục gốc dự án:

   ```powershell
   node --env-file=.env scripts/create-test-accounts.cjs --environment=staging --confirm-test-project
   ```

3. Chỉ khi script báo thành công cả ba lượt đăng nhập, mở `.tmp/test-accounts.local.json` để lấy mật khẩu.
   Ba tài khoản dùng chung một mật khẩu ngẫu nhiên cho tiện kiểm thử; mật khẩu không nhúng vào app.
   File này bị Git bỏ qua. Script không in mật khẩu, token hoặc khóa quản trị ra terminal.
4. Dừng Metro cũ, chạy `npm start -- --clear --go --lan`. Trên màn hình đăng nhập chọn mục
   **Đăng nhập kiểm thử — không cần SMS**, chọn email, nhập mật khẩu và đồng ý điều khoản.
   Đăng xuất trong Hồ sơ trước khi chuyển tài khoản/vai trò.

| Vai trò | Email kiểm thử | Dữ liệu chuẩn bị |
| --- | --- | --- |
| Khách hàng | `customer.rescue@example.com` | Auth user và profile `customer` thật |
| Cứu hộ viên | `provider.rescue@example.com` | Auth user, profile `provider`, thành viên đội thử riêng |
| Admin | `admin.rescue@example.com` | Auth user và profile `admin` thật |

Đội `TEST-AUTH-DN-01` có tên `[TEST]`, checklist mô phỏng và các năng lực đang bật trong catalog.
Đây không phải đối tác đã xác minh thật. Hotline/số liên hệ dùng dải hư cấu +1 202 555-0190/0191;
không gọi hoặc gửi SMS. Cứu hộ viên bắt đầu **offline, không có GPS giả**: đăng nhập, bật sẵn sàng
và cấp quyền GPS để thử ghép ca. Không sửa 12 đội `DEMO-DN-*` của file 05 hoặc đội đang có.

Script dùng Admin API `createUser` với `email_confirm: true`; không gửi thư/SMS, không tắt JWT/RLS,
không cấp quyền qua metadata do client tự khai. Sau khi tạo, script kiểm tra đăng nhập mật khẩu và
đọc đúng profile bằng JWT của từng người dùng. Nút chọn vai trò trên app **chỉ điền email**, không
đổi quyền. Mọi API nghiệp vụ vẫn kiểm tra tài khoản và vai trò từ database như bình thường.

Lưu ý: tài khoản được tạo trước khi các bước thiết lập còn lại hoàn tất. Nếu có lỗi, dữ liệu có thể
được tạo một phần; giữ file mật khẩu để chạy lại. Script từ chối tiếp quản email đã tồn tại mà không
có dấu `test_fixture` trong `app_metadata`, không âm thầm đặt lại mật khẩu hay kích hoạt tài khoản/đội
đã bị đình chỉ. Khi xong demo, vô hiệu hóa các tài khoản thử trước khi dùng project cho dữ liệu thật.

Mục đăng nhập thử chỉ hiện khi `__DEV__` và môi trường development/local/staging; có thể ẩn ngay
bằng `DEV_PASSWORD_LOGIN_ENABLED=false` rồi khởi động lại Metro. Bản production luôn ẩn mục này.
Đây là cờ giao diện, không phải biện pháp thu hồi tài khoản đã tạo. Luồng SMS cũ vẫn giữ nguyên.

Đăng nhập được không đồng nghĩa backend/OSRM đã sẵn sàng: `EXPO_PUBLIC_API_URL` phải trỏ tới backend
điện thoại truy cập được. Không dùng `localhost` làm địa chỉ backend trên iPhone. Để thử khách tạo ca
và cứu hộ viên nhận ca đồng thời, nên dùng hai phiên riêng (ví dụ web và iPhone).

Nguồn: [Supabase Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

### 12 đội mẫu và giới hạn demo

File 05 dùng mã `DEMO-DN-01`..`DEMO-DN-12`, tên có `[DEMO]`, vị trí mô phỏng phân bố ở
trung tâm Hải Châu, Thuận Phước, Thanh Khê, Xuân Hà, Hòa Khánh, Hòa Hiệp, An Hải, Thọ Quang,
Mỹ An, Khuê Mỹ, Hòa Xuân và Hòa Cầm. Các tên là nhãn khu vực để minh họa, không khẳng định địa giới
hành chính hiện hành hay cơ sở cứu hộ có thật. Mỗi đội có 3 loại năng lực và bán kính 8–14 km.

- Chạy lại không tạo trùng theo mã đối tác, không ghi đè dữ liệu đã chỉnh, không xóa đội khác.
- Hotline bắt buộc bởi schema nên dùng số **hư cấu** +1 202 555-0101..0112, không bịa số Việt Nam
  có thể thuộc người thật. Không dùng để gọi, SMS, đăng nhập hoặc kiểm tra hotline thực tế.
  Nguồn dải hư cấu: [NANPA](https://nanpa.com/numbering/555-line-numbers).
- Seed **không tạo tài khoản Auth, provider, vị trí GPS hiện tại hoặc lịch sử ca**. Đội chờ xác minh
  không đủ điều kiện nhận ca; đây là dữ liệu quản lý mạng lưới, chưa phải 12 ứng viên đang online.
- Để demo điều phối, dùng tài khoản thử nghiệm do bạn kiểm soát, thêm provider qua admin, khai báo
  số liên hệ thử nghiệm phù hợp, hoàn tất quy trình kiểm tra của môi trường demo rồi kích hoạt;
  bật sẵn sàng để có GPS mới. Không tuyên bố đó là đối tác thật hoặc mang dữ liệu này lên production.
- Tâm đội không thay thế vị trí cứu hộ viên. Tọa độ nằm trong bbox dữ liệu OSRM demo đã dùng,
  nhưng vẫn phải kiểm tra Route/Table và vùng phục vụ; không bảo đảm mọi điểm có tuyến hợp lệ.

Schema được quản lý bằng Flyway và PostgreSQL/PostGIS. Nguồn chuẩn nằm tại:

```text
backend/src/main/resources/db/migration/
  B1__initial_schema.sql
  V2__prevent_offer_accept_deadlock.sql
  V3__durable_dispatch_recovery.sql
  V4__durable_push_outbox.sql
  V5__merge_dispatcher_into_admin.sql
  V6__index_provider_service_experience.sql
  V7__configurable_fair_dispatch.sql
  V8__assignment_route_snapshot.sql
  V9__align_demo_service_coverage.sql
```

`B1` là baseline migration tích lũy từ schema đã được squash trước đây. Nó dựng đầy đủ tables, indexes, constraints, triggers, RLS, grants, functions và dữ liệu cấu hình bắt buộc trên database mới. `V2` sửa thứ tự khóa transaction khi provider nhận offer để tránh deadlock. `V3` phục hồi điều phối bị gián đoạn; `V4` lưu push outbox cùng transaction nghiệp vụ; `V5` chuyển tài khoản điều phối cũ sang admin và giới hạn hệ thống còn ba vai trò; `V6` thêm index phục vụ đếm kinh nghiệm; `V7` thêm chính sách điều phối theo loại dịch vụ và trạng thái chống bỏ đói; `V8` lưu vị trí lúc nhận ca và chặn GPS Broadcast của ca; `V9` giới hạn phục vụ theo vùng OSRM demo và chặn nhận ca ngoài vùng. Những thay đổi tiếp theo phải bắt đầu từ `V10__...sql`, tăng tuần tự và có mô tả rõ ràng.

Sau khi một migration đã chạy trên bất kỳ môi trường dùng chung nào, không được sửa, đổi tên hoặc xóa file đó. Mọi sửa đổi phải nằm trong migration có version mới. Không dùng `flyway repair` để che checksum mismatch nếu chưa điều tra và phê duyệt nguyên nhân.

## Kết nối migration

Chạy Flyway bằng tài khoản chủ database có quyền tạo extension/schema/role; không dùng role runtime `motorescue_api`. Với Supabase, ưu tiên direct connection port `5432`; nếu mạng chỉ có IPv4 thì dùng Supavisor session mode port `5432`. Không dùng transaction pooler port `6543` cho migration.

Từ thư mục `backend`, cấu hình secret chỉ trong session terminal hoặc secret store của CI:

```powershell
$env:FLYWAY_URL = 'jdbc:postgresql://<host>:5432/postgres?sslmode=require'
$env:FLYWAY_USER = '<migration-owner>'
$env:FLYWAY_PASSWORD = '<database-password>'
```

Không commit các giá trị này và không dùng chúng làm `SPRING_DATASOURCE_*` của ứng dụng.

## Bootstrap Supabase/database mới

Nếu project chưa từng chạy SQL ứng dụng, đây là luồng bắt buộc. **Không chạy `flyway:baseline` và không chạy `00_reset.sql`.**

```powershell
cd backend
.\mvnw.cmd flyway:info
.\mvnw.cmd flyway:migrate
.\mvnw.cmd flyway:validate
```

`migrate` sẽ chạy `B1__initial_schema.sql`, các migration version tiếp theo (hiện tại là `V2`, `V3`, `V4`, `V5`, `V6`, `V7`, `V8`, `V9`) và tạo `flyway_schema_history`. Sau đó:

1. Đặt password ngẫu nhiên riêng cho role backend, lưu trong secret manager và không commit câu lệnh đã điền secret:

   ```sql
   ALTER ROLE motorescue_api PASSWORD '<RANDOM_PASSWORD>';
   ```

2. Cấu hình runtime với `SPRING_DATASOURCE_USERNAME=motorescue_api`; không dùng migration owner hoặc `postgres`.
3. Chạy `scripts/02_verify_rls.sql` để kiểm tra metadata bảo mật. Script này chỉ đọc metadata.
4. Bật phone auth/SMS, đăng nhập OTP cho admin đầu tiên, thay đúng một số E.164 trong `scripts/03_bootstrap_operator.sql`, rồi chạy script.
5. Review polygon `service_zones` theo phạm vi vận hành thật.
6. Trên production, bật Supabase Cron/`pg_cron` rồi chạy `scripts/04_schedule_retention.sql`.

`03_bootstrap_operator.sql` và `04_schedule_retention.sql` là bước vận hành theo từng môi trường, không phải migration: admin phải tồn tại trong Supabase Auth trước, còn lịch cron phụ thuộc cấu hình production.

## Đưa database legacy vào Flyway

Chỉ dùng luồng này cho database đã được dựng trước đây bằng schema squash cũ và đang khớp chính xác trạng thái `B1`. Database trống không thuộc trường hợp này.

1. Dừng deploy/ghi dữ liệu, tạo backup hoặc snapshot có thể restore và ghi lại commit đang chạy.
2. Chạy `scripts/01_preflight.sql`; đối chiếu tables, constraints, functions, grants, RLS và dữ liệu cấu hình với `B1`. **Không dùng 02 ở bước này** vì 02 yêu cầu schema đến V9. Nếu có drift, dừng lại và viết kế hoạch reconcile riêng.
3. Xác nhận chưa có `flyway_schema_history`, sau đó đánh dấu trạng thái legacy là version 1 mà không chạy lại schema:

   ```powershell
   cd backend
   .\mvnw.cmd "-Dflyway.baselineVersion=1" "-Dflyway.baselineDescription=legacy_schema_at_1" flyway:baseline
   .\mvnw.cmd flyway:validate
   .\mvnw.cmd flyway:migrate
   ```

4. Chạy lại `flyway:info`, `flyway:validate`, `02_verify_rls.sql` và smoke test backend.

`baselineOnMigrate` luôn để `false`: baseline là thao tác một lần, có chủ đích, sau khi đã xác minh đúng database. Từ đó, Flyway chỉ áp dụng tuần tự các migration còn thiếu đến version hiện hành.

## Quy trình staging và production

1. Tạo migration version mới, ưu tiên DDL tương thích ngược với backend đang chạy.
2. Chạy test PostgreSQL/PostGIS sạch và toàn bộ test backend trên nhánh phát triển.
3. Backup staging, chạy `flyway:info`, `flyway:validate`, `flyway:migrate`, rồi `02_verify_rls.sql` và smoke test.
4. Kiểm tra `flyway_schema_history`: version, checksum và success phải đúng commit release.
5. Lặp lại trên production bằng một migration job duy nhất trước khi rollout backend cần schema mới.

Spring Boot có thể tự migrate khi đặt `SPRING_FLYWAY_ENABLED=true` cùng `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`, `SPRING_FLYWAY_PASSWORD`. Mặc định tính năng này tắt để runtime không giữ DDL credential và tránh nhiều replica cùng thực hiện bước quản trị. Pipeline nên dùng Maven Flyway job riêng như các lệnh trên.

## Rollback

- Không tạo down migration phá hủy dữ liệu và không dùng `flyway:clean`; cấu hình đã khóa `clean`.
- Migration PostgreSQL thất bại trong transaction sẽ được rollback; sửa nguyên nhân trong migration chưa từng applied, hoặc tạo version mới nếu migration đã được áp dụng ở môi trường dùng chung.
- Sau migration thành công, ưu tiên rollback ứng dụng nếu schema còn tương thích và triển khai forward-fix `Vn+1`.
- Nếu thay đổi không thể forward-fix an toàn, dừng ghi và restore snapshot/PITR đã tạo trước deploy. Diễn tập restore trên staging trước production.

## Các script vận hành

- `00_reset.sql`: xóa schema ứng dụng, chỉ dành cho local/staging được phép mất dữ liệu. Sau reset phải chạy lại Flyway từ đầu; không chạy trên production.
- `01_preflight.sql`: kiểm tra trạng thái trước khi chọn cài mới/nâng cấp; chỉ đọc.
- `01_init_database.sql`: bản khởi tạo đầy đủ tự sinh B1–V9 cho SQL Editor, chỉ dành cho database mới.
- `02_verify_rls.sql`: kiểm tra read-only sau migration.
- `03_bootstrap_operator.sql`: cấp admin đầu tiên sau khi tài khoản Auth đã tồn tại.
- `04_schedule_retention.sql`: cấu hình cron retention theo môi trường.
- `05_seed_demo_teams.sql`: thêm 12 đội giả lập khi chủ động chạy trên local/staging, không tự chạy trong migration.

Migration không tự seed đội, yêu cầu hoặc đánh giá giả. Script 05 tạo 12 đội demo; `create-test-accounts.cjs` tạo riêng một đội kiểm thử đăng nhập khi được chạy chủ động. Cả hai tách biệt với catalog cấu hình trong B1.

## Nguyên tắc bảo mật runtime

- Mobile chỉ giữ anon/publishable key; không đóng gói `service_role` hoặc database password.
- Spring runtime chỉ dùng `motorescue_api`, role không có quyền DDL/superuser và chỉ nhận grant cần cho API.
- Mọi mutation nghiệp vụ đi qua Spring Boot; RLS là lớp giới hạn bổ sung, không thay thế authorization/state machine ở backend.
