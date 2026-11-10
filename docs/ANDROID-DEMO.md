# APK demo Android trên laptop

Bản demo dùng kiến trúc **x86_64**, dành cho máy ảo Android trên laptop này. Không dùng APK này để kết luận rằng điện thoại ARM đã được kiểm thử. Bản release cài nội bộ chứa sẵn JavaScript, ký bằng khóa debug dành cho demo; không phát hành lên Google Play.

APK: `dist/apk/moki-rescue-demo-x86_64.apk` (35.467.758 byte), package `com.danang.motorescue`, version `1.0.0`. Build ngày 10/11/2026 đã đạt `lintVitalRelease`, `assembleRelease` và kiểm tra chữ ký APK v2. File build được Git bỏ qua.

Bản 10/11 chứa form đăng nhập email/mật khẩu thông thường, sửa liên hệ theo vai trò; thêm sửa cửa hàng/thành viên, tạo dịch vụ, sửa/thu hồi thông báo và xóa từng mục/toàn bộ thông báo hoặc lịch sử cá nhân. Đã áp dụng đến V19 trên Supabase hiện tại và build lại backend. APK mới chưa cài đè lên máy ảo; các ảnh và kiểm thử trực tiếp ngày 09/11 thuộc APK trước đó. Không mở lại máy ảo/backend để giữ các tiến trình demo ở trạng thái dừng theo yêu cầu.

Đã cài APK thành công, mở được màn hình giới thiệu trên Android 16 khi Metro 8081 không chạy; log AndroidRuntime/ReactNativeJS lúc mở không có lỗi. Backend readiness trả HTTP 200. Ngày 09/11 đã kiểm thử thêm một ca vá lốp từ lúc khách gửi yêu cầu đến khi hoàn tất và lưu đánh giá. Phần chuyển đề nghị giữa bốn cứu hộ viên được kiểm thử bằng API thật, dùng cùng ca tạo trên APK; không mở nhiều máy ảo. Xem [kết quả và giới hạn kiểm thử](ANDROID-APK-TEST-2026-11-09.md).

## Chạy demo

Từ thư mục dự án:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-android-demo.ps1
npm run dev:backend
```

Lệnh đầu mở `Rescue_Demo` trực tiếp, không cần Android Studio. Khi APK đã được cài, mở biểu tượng Moki Rescue trong máy ảo. Không cần Expo Go hoặc Metro.

Backend vẫn chạy riêng. APK dùng `http://10.0.2.2:8080`, là địa chỉ máy chủ laptop nhìn từ Android Emulator. OSRM cũng phải sẵn sàng nếu muốn thử định tuyến/điều phối; build APK không đóng gói backend, database hay OSRM vào điện thoại.

Cài lần đầu hoặc cài đè bản mới sau khi máy ảo khởi động:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 install -r .\dist\apk\moki-rescue-demo-x86_64.apk
```

Nếu `adb devices` trả mã máy khác, thay `emulator-5554` bằng mã đó. Đóng cửa sổ máy ảo sau khi demo để giải phóng RAM.

## Môi trường build cục bộ

- `E:\RescueApkBuild`: bản sao các nguồn cần build và công cụ native; không sao chép `.env` hay mật khẩu database vào đây.
- SDK, NDK, CMake, JDK 17 và cache Gradle của bản build nằm trên ổ E. Java 21 có sẵn được dùng chạy Gradle/backend.
- Sau build, thư mục `E:\RescueApkBuild` khoảng 9,41 GiB; dữ liệu máy ảo khoảng 4,47 GiB (tổng kích thước file, không phải phép đo dung lượng cấp phát thực tế). Đã xóa các cache/công cụ tạm trùng lặp của những lần thử trước trong dự án.
- Máy ảo dùng bộ Android 16 đã có trong Android SDK của máy; dữ liệu máy ảo mới nằm tại `.tmp/avd/Rescue_Demo.avd` trên ổ E. Cấu hình Pixel_5 cũ trỏ tới Android 13 không còn trên máy và được giữ nguyên.
- Ổ R là ánh xạ tới thư mục dự án để công cụ máy ảo tránh lỗi đường dẫn có dấu; không phải một bản sao dữ liệu.

Cấu hình native của bản build dùng thư mục CMake ngắn `E:/RescueApkBuild/c` và `CMAKE_OBJECT_PATH_MAX=250` để tránh giới hạn đường dẫn Ninja trên Windows. Package trong MainActivity/MainApplication phải khớp `com.danang.motorescue`. Metadata locale iOS được đặt trong khóa `ios`, không trộn vào chuỗi Android.

Khi sửa giao diện/logic app cần đồng bộ nguồn vào thư mục build và tạo APK mới rồi cài đè. Sửa backend hoặc dữ liệu thường không cần build lại APK nếu API vẫn tương thích. Không chỉnh mã ở bản sao build rồi quên cập nhật dự án chính.

HTTP và đăng nhập demo được bật cho môi trường nội bộ này. Không coi cấu hình đó là bản phát hành công khai.
