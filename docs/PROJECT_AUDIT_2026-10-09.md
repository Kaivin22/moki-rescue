# Rà soát dự án và rút gọn SQL — 09/10/2026

> Biên bản lịch sử tại ngày 09/10, không phải hướng dẫn cài hiện hành. Từ 11/10,
> file init đã đến V13, fixture có 6 tài khoản và generator không còn sinh SQL vá/nâng cấp lẻ.
> Thứ tự chạy và xử lý lỗi hiện tại nằm ở [scripts/README.md](../scripts/README.md).

## Kết luận và phạm vi

Đã rà soát cấu trúc repository, đường dẫn và nguồn sinh SQL, migration, tài liệu chạy,
route/spec, cấu hình lint/format cùng bộ test hiện có. Đây không phải kiểm toán bảo mật
toàn diện hoặc bằng chứng tất cả luồng đều chạy trên điện thoại/Supabase.

Giữ nguyên các thay đổi chức năng đang có trong worktree trước lượt rà soát.
Không sửa PRD/SRS, không đổi phiên bản Expo/React Native, không commit/push,
không chạy SQL/reset lên Supabase, không cài công cụ hoặc package mới.

## Đã sửa

1. **SQL lặp và quá nhiều bước:** trong `scripts/` giảm từ 11 xuống 5 file SQL
   (kể cả thư mục con). Cài schema mới chỉ có một file bắt buộc. Không cắt schema
   hay bỏ kiểm tra quyền để đạt số lượng này.
2. **Kiểm tra tách rời cài đặt:** toàn bộ nội dung kiểm tra cũ được giữ trong
   `scripts/database-checks.cjs`, nhúng vào file init trước `COMMIT`.
   Nếu một kiểm tra thất bại, transaction cài đặt không commit. Muốn kiểm tra riêng,
   generator sinh cùng nội dung trong transaction `READ ONLY`.
3. **SQL nâng cấp trùng migration:** bỏ các bản sao trong `scripts/archive/`.
   Khi cần giữ database cũ cài thủ công, generator sinh một file nâng từ V8/V9/V10
   đến V11 vào `.tmp/`, có guard chống dùng lẫn Flyway, chạy lại và thiếu điều kiện.
   Người vận hành phải biết version thật, backup và đọc file; generator không
   kết nối database hoặc tự quyết định nâng cấp.
4. **Test tài liệu sai phiên bản:** thay yêu cầu cũ 70 frame bằng đối chiếu danh sách
   R01–R58 với route thực trong `app/`; cập nhật test schema/SQL/communications
   theo nguồn mới, giữ các kiểm tra quyền và guard.
5. **Lint quét thư mục cache:** loại `.tmp`, cache Maven, Expo và thư mục local-only
   khỏi phạm vi lint/format phù hợp. Sửa khai báo Node `__dirname`, thứ tự import
   trong test và định dạng một số file. Không xóa cache hoặc chỉnh `.vscode/settings.json`.
6. **Hướng dẫn lỗi thời:** đồng bộ tên SQL, schema V11, vị trí cửa hàng thay GPS chờ ca
   trong README, tài liệu triển khai/kiến trúc/thông báo và technical spec.
   Biên bản release cũ được đánh dấu là lịch sử, không dùng số test cũ làm kết quả mới.
7. **Thiếu test chính file cài thủ công:** thêm `CleanInstallBundleIntegrationTest`
   để chạy bundle thực, chặn chạy lại và kiểm rollback khi bước kiểm tra cuối lỗi.
   Test đã biên dịch, **chưa thực thi** vì chưa có cluster PostgreSQL/PostGIS test cô lập
   được cấu hình trong phiên này.

## Thứ tự SQL hiện tại

| File | Khi dùng |
| --- | --- |
| `scripts/01_init_database.sql` | Bắt buộc cho schema trống: B1–V11, 30 bảng và kiểm tra schema/quyền/RLS |
| `scripts/02_seed_demo_teams.sql` | Tùy chọn sau 01: 12 cửa hàng mô phỏng pending, không phải 12 tài khoản |
| `scripts/optional/00_reset.sql` | Chỉ khi chủ động xóa schema test và đã backup; không cần cho database mới |
| `scripts/optional/03_bootstrap_operator.sql` | Tạo admin đầu tiên qua tài khoản OTP có sẵn; không cần với script ba tài khoản demo |
| `scripts/optional/04_schedule_retention.sql` | Đăng ký lịch xóa/làm mờ dữ liệu khi đã thống nhất chính sách |

Không gộp reset, cấp admin hoặc lịch xóa dữ liệu vào init. Chúng có tác dụng phụ
khác nhau và phải được chọn có chủ đích.

Database đã có dữ liệu không chạy lại 01. Chi tiết guard, tài khoản và cách sinh SQL
chỉ đọc/nâng cấp ở [scripts/README.md](../scripts/README.md).

11 migration trong `backend/src/main/resources/db/migration/` vẫn cần giữ:
đó là nguồn schema, lịch sử/checksum Flyway và đầu vào cho bộ test, **không phải**
một bộ SQL người dùng phải chạy thêm sau 01. B1–V10 không bị sửa; V11 đã có trong
worktree từ phần thông báo/hỗ trợ trước lượt này.

## Kết quả kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Jest toàn bộ | 28 suite, 224 test đạt |
| TypeScript `tsc --noEmit` | Đạt |
| ESLint toàn repository sau loại cache | 0 lỗi, 0 cảnh báo |
| Prettier `--check .` với ignore đã cập nhật | Đạt |
| Maven unit, offline, loại `*IntegrationTest` | 91 test đạt; biên dịch cả mã main/test |
| `node scripts/build-init-sql.cjs --check` | Bundle khớp migration và khối kiểm tra |
| Đối chiếu khối kiểm tra trước/sau | Toàn bộ nội dung kiểm tra cũ được giữ nguyên |
| `git diff --check` | Đạt |

Maven dùng cache sẵn có, `-DforkCount=0` để chạy trong môi trường Windows hiện tại;
đây không thay thế việc chạy chế độ CI trên Linux. Cache test tạm được hướng vào
`.tmp/` trên ổ chứa dự án, không cài PostgreSQL hoặc thay đổi dịch vụ nền.

**Chưa kiểm chứng trong lượt này:** thực thi SQL trên PostgreSQL/PostGIS thật,
Supabase cloud/JWT/RLS bằng các tài khoản thật, Expo export/package compatibility,
OSRM đang phục vụ, tile OSM, Google Maps, push, thao tác trên iOS/Android và GitHub CI.
Không đánh dấu những mục này đạt chỉ từ unit/static test. Các cổng kiểm tra ngoài
workspace nằm trong [RELEASE_READINESS.md](RELEASE_READINESS.md).

## Điểm còn cần xử lý/xác nhận

1. **Bắt lỗi dữ liệu API:** `GlobalExceptionHandler.java` có handler validation bean,
   lỗi nghiệp vụ/database và catch-all 500 nhưng chưa có handler riêng cho JSON
   không đọc được, UUID/enum sai kiểu hoặc query parameter bắt buộc bị thiếu.
   Qua đọc code, các lỗi đầu vào này có nguy cơ bị trả `INTERNAL_ERROR`/500 thay vì
   400. Cần thêm test HTTP và ánh xạ lỗi tương ứng; chưa đổi hành vi runtime này
   trong đợt gộp SQL, chưa tái hiện bằng request thực.
2. **Chính sách SDK chưa thống nhất:** `AGENTS.md` ghi SDK 54, còn `package.json`
   và lockfile hiện là SDK 57 từ lần nâng trước. Không tự nâng/hạ hoặc sửa chính sách;
   cần chủ dự án xác nhận mốc chuẩn trước lần thay đổi native tiếp theo.
3. **Kiểm thử tích hợp còn thiếu bằng chứng:** fixture yêu cầu cluster local riêng
   và `TEST_PG_ISOLATED=true`. Chưa có cấu hình này; không tự chuyển sang database
   của app hay Supabase để lấy kết quả test. Test mới cần chạy trên fixture/CI.
4. **Bảo mật dependency:** số `npm audit` trong biên bản tháng 9 là lịch sử.
   Chưa truy vấn advisory mới trong lượt này, nên không kết luận hiện tại không có
   lỗ hổng. Không dùng `npm audit fix --force` để tự đổi SDK.

## File không nên xóa chỉ vì nhìn có vẻ dư

- `__tests__/`, test backend và migration: đang phục vụ kiểm tra/CI.
- Mã dừng task GPS cũ: vẫn được gọi để dọn tác vụ trên bản app nâng cấp,
  không có nghĩa dự án còn dùng GPS chờ ca.
- `.tmp/test-accounts.local.json`: chứa thông tin tài khoản demo đã tạo;
  mất file có thể mất khả năng lấy lại mật khẩu, không coi toàn bộ `.tmp` là rác.
- `node_modules`, `.expo`, `dist`, `backend/target`, cache Maven: dữ liệu sinh ra,
  không phải source cần commit; không tự xóa trong lượt rà soát này.
- Các file PRD/SRS, sơ đồ, ghi chú và cấu hình editor của người dùng: giữ nguyên.

## Khôi phục phần SQL đã gộp

Các file SQL cũ bị loại khỏi luồng chạy và README lịch sử đã được sao lưu trước
khi sửa tại `.tmp/sql-before-consolidation-20261009-110316.zip` (58.249 byte,
khoảng 56,9 KiB). Đã kiểm tra danh sách file trong ZIP. Có thể lấy lại đúng file
khi cần đối chiếu; không bung đè toàn dự án một cách tự động.

ZIP này chỉ là bản sao source SQL/runbook/generator, **không phải backup database**.
Không đưa ZIP, dữ liệu test hoặc thông tin tài khoản local lên Git.
