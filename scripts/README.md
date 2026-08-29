# Database migrations Moki Rescue

Schema được quản lý bằng Flyway và PostgreSQL/PostGIS. Nguồn chuẩn nằm tại:

```text
backend/src/main/resources/db/migration/
  B1__initial_schema.sql
```

`B1` là baseline migration tích lũy từ schema đã được squash trước đây. Nó dựng đầy đủ tables, indexes, constraints, triggers, RLS, grants, functions và dữ liệu cấu hình bắt buộc trên database mới. Những thay đổi tiếp theo phải là `V2__...sql`, `V3__...sql`, tăng tuần tự và có mô tả rõ ràng.

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

`migrate` sẽ chạy `B1__initial_schema.sql` và tạo `flyway_schema_history`. Sau đó:

1. Đặt password ngẫu nhiên riêng cho role backend, lưu trong secret manager và không commit câu lệnh đã điền secret:

   ```sql
   ALTER ROLE motorescue_api PASSWORD '<RANDOM_PASSWORD>';
   ```

2. Cấu hình runtime với `SPRING_DATASOURCE_USERNAME=motorescue_api`; không dùng migration owner hoặc `postgres`.
3. Chạy `scripts/02_verify_rls.sql` để kiểm tra metadata bảo mật. Script này chỉ đọc metadata.
4. Bật phone auth/SMS, đăng nhập OTP cho operator đầu tiên, thay đúng một số E.164 trong `scripts/03_bootstrap_operator.sql`, rồi chạy script.
5. Review polygon `service_zones` theo phạm vi vận hành thật.
6. Trên production, bật Supabase Cron/`pg_cron` rồi chạy `scripts/04_schedule_retention.sql`.

`03_bootstrap_operator.sql` và `04_schedule_retention.sql` là bước vận hành theo từng môi trường, không phải migration: operator phải tồn tại trong Supabase Auth trước, còn lịch cron phụ thuộc cấu hình production.

## Đưa database legacy vào Flyway

Chỉ dùng luồng này cho database đã được dựng trước đây bằng schema squash cũ và đang khớp chính xác trạng thái `B1`. Database trống không thuộc trường hợp này.

1. Dừng deploy/ghi dữ liệu, tạo backup hoặc snapshot có thể restore và ghi lại commit đang chạy.
2. Chạy `scripts/02_verify_rls.sql`; đối chiếu tables, constraints, functions, grants, RLS và dữ liệu cấu hình với `B1`. Nếu có drift, dừng lại và viết kế hoạch reconcile riêng.
3. Xác nhận chưa có `flyway_schema_history`, sau đó đánh dấu trạng thái legacy là version 1 mà không chạy lại schema:

   ```powershell
   cd backend
   .\mvnw.cmd "-Dflyway.baselineVersion=1" "-Dflyway.baselineDescription=legacy_schema_at_1" flyway:baseline
   .\mvnw.cmd flyway:validate
   .\mvnw.cmd flyway:migrate
   ```

4. Chạy lại `flyway:info`, `flyway:validate`, `02_verify_rls.sql` và smoke test backend.

`baselineOnMigrate` luôn để `false`: baseline là thao tác một lần, có chủ đích, sau khi đã xác minh đúng database. Từ đó, Flyway chỉ áp dụng tuần tự `V2`, `V3`, ...

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
- `02_verify_rls.sql`: kiểm tra read-only sau migration.
- `03_bootstrap_operator.sql`: cấp operator đầu tiên sau khi tài khoản Auth đã tồn tại.
- `04_schedule_retention.sql`: cấu hình cron retention theo môi trường.

Không có seed đội cứu hộ, vị trí, yêu cầu hay đánh giá giả. Catalog trong `B1` là cấu hình chính thức của sản phẩm, không phải mock data.

## Nguyên tắc bảo mật runtime

- Mobile chỉ giữ anon/publishable key; không đóng gói `service_role` hoặc database password.
- Spring runtime chỉ dùng `motorescue_api`, role không có quyền DDL/superuser và chỉ nhận grant cần cho API.
- Mọi mutation nghiệp vụ đi qua Spring Boot; RLS là lớp giới hạn bổ sung, không thay thế authorization/state machine ở backend.
