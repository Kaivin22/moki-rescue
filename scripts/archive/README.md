# Các file SQL cũ đã được hợp nhất

Không còn SQL cần chạy trong thư mục này. Cài mới đọc [README chính](../README.md):
`01_init_database.sql` đã gồm schema đến V13 và toàn bộ kiểm tra RLS.

| Trước đây                                | Hiện tại                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| 02_verify_rls.sql                        | Kiểm tra trong 01; muốn chạy lại riêng: generator --verify                |
| 03_seed_demo_teams.sql (trước nữa là 05) | 02_seed_demo_teams.sql                                                    |
| optional/01_preflight.sql                | Generator --preflight                                                     |
| 06, 07, 09 upgrade SQL                   | Đã gộp vào 01; không sinh/chạy bản vá riêng khi cài mới                   |
| 08_approve_existing_test_provider.sql    | Cài mới dùng create-test-accounts.cjs; fixture pending cũ duyệt qua admin |

Các lệnh generator tạo file trong `.tmp/`, không kết nối database.
Có `flyway_schema_history` thì dùng Flyway, không dùng upgrade thủ công.
Migration B1–V13 vẫn giữ ở backend, không squash checksum đã triển khai.
Bản README lịch sử nhiều hướng dẫn trái phiên bản đã bỏ khỏi luồng sử dụng.
Bản sao trước hợp nhất của workspace này nằm trong `.tmp/sql-before-consolidation-*.zip`
(không phải backup database, không đưa lên Git).
