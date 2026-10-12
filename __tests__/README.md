# Kiểm thử app và script

Các test được gộp theo chức năng, không tạo một file mới cho mỗi lỗi nhỏ.
Mỗi khối `describe` vẫn chỉ rõ nhóm kiểm tra; lỗi Jest ghi tên tình huống và dòng lỗi.
Các file ở đây không tự chạy cùng app; chúng được chạy bởi Jest hoặc CI.

## Tìm test cần sửa

| File/nhóm                                                                          | Nội dung                                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `clientUtilities.test.ts`                                                          | Số điện thoại, UUID, khóa onboarding, hiển thị trạng thái xác minh tài khoản             |
| `rescueLifecycle.test.ts`                                                          | Trạng thái ca, hướng dẫn hoàn thành, quyền thao tác, hủy ca và vị trí bản đồ theo ca     |
| `providerPolicies.test.ts`                                                         | Điều kiện bật/tắt nhận ca, khung giờ làm việc, độ mới và độ chính xác GPS                |
| `interfaces.test.ts`                                                               | Phân tách trang theo vai trò, duyệt cứu hộ viên, đánh giá/báo cáo, thống kê              |
| `databaseSchema.test.ts`                                                           | Cấu trúc và bảo mật SQL, lịch sử migration, phạm vi phục vụ và vị trí cửa hàng           |
| `projectIntegrity.test.ts`                                                         | Cấu hình dự án, tài liệu màn hình, chính sách dependency/CI, cấu hình chạy trên mạng LAN |
| `operationalScripts.test.ts`, `testAccountSetup.test.ts`, `databaseBackup.test.ts` | An toàn bộ cài SQL, tạo tài khoản demo, sao lưu/diễn tập khôi phục                       |
| Các file Auth, API, bản đồ, vị trí và gửi yêu cầu còn lại                          | Giữ riêng để cô lập mock dịch vụ, timer, mạng hoặc lưu trữ                               |

Không gộp tùy tiện các file có `jest.mock`, `beforeEach`, fake timer hoặc thay đổi
`global.fetch`: cùng tên module nhưng mock khác có thể làm test ảnh hưởng lẫn nhau.
Ưu tiên bổ sung tình huống vào nhóm hiện có; chỉ tách file khi khác môi trường/mock
hoặc nhóm đã khó đọc, không ép mọi test vào một file khổng lồ.

## Chạy tại thư mục gốc dự án

```powershell
node node_modules/jest/bin/jest.js --runInBand --cacheDirectory=.tmp/jest-map
```

Chỉ kiểm tra một nhóm:

```powershell
node node_modules/jest/bin/jest.js --runInBand --cacheDirectory=.tmp/jest-map --runTestsByPath __tests__/rescueLifecycle.test.ts
```

CI vẫn dùng `npm run test:ci`; không đổi cấu hình Jest để bỏ qua file hay tình huống.

## Kết quả test chứng minh được gì?

- Test gọi hàm kiểm tra hành vi trong môi trường giả lập, không phải thao tác trên điện thoại thật.
- Các kiểm tra đọc code rồi `toContain`/regex là kiểm tra tĩnh. Chúng phát hiện thiếu
  ràng buộc hoặc nối sai thành phần, không chứng minh phân quyền/database/giao diện chạy đúng thực tế.
- Test bản đồ ở đây không chứng minh server OSRM đang hoạt động. Test backup dùng
  archive/công cụ giả, không chứng minh đã khôi phục PostgreSQL/PostGIS thật.
- Test backend và integration database nằm trong `backend/src/test`, không bị gộp
  hoặc xóa trong lần sắp xếp này; vẫn cần môi trường phù hợp để chạy riêng.

Lần gộp này giữ các tình huống nghiệp vụ, chỉ bỏ một test đếm màn hình lặp với kiểm
tra inventory trong `projectIntegrity.test.ts`. Kiểm tra còn lại giữ ngưỡng tối thiểu
48 màn hình điều hướng và đối chiếu tài liệu với route hiện tại, không cố định tổng
số route ở 61. Kiểm tra cùng điều kiện admin tại cùng layout chỉ giữ một chỗ.
