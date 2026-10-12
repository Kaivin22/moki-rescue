# Theo dõi cảnh báo dependency — 12/10/2026

Đây là phân loại theo `npm audit` và cây phụ thuộc hiện tại, không phải chứng nhận
an toàn. Số package bị đánh dấu bao gồm cả gói cha bị ảnh hưởng gián tiếp; không
được diễn giải thành từng ấy lỗ hổng độc lập trong ứng dụng.

Kết quả audit lúc rà soát: trước vá **42 high / 16 moderate / 0 critical**;
sau vá **41 high / 16 moderate / 0 critical** (57 package bị đánh dấu).

## Đã sửa, không đổi SDK

Chín bản sao `brace-expansion` nhánh 1.x được nâng từ 1.1.18 lên **1.1.21** trong
lockfile. Bản 5.0.12 đang có giữ nguyên. Không thay manifest, Expo, React Native,
Expo Router hoặc native packages; không dùng `npm audit fix --force`.

Bản 1.1.21 nằm ngoài cả ba dải ảnh hưởng:
[đệ quy parseCommaParts](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p),
[đệ quy nhóm lồng nhau](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[thời gian xử lý bậc hai](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).
Nhóm `dependency update compatibility policy` trong `__tests__/projectIntegrity.test.ts`
ngăn lockfile quay về các dải này.

## Chưa xử lý hết

| Gói gốc | Đường phụ thuộc đang có | Đánh giá / việc tiếp theo |
| --- | --- | --- |
| `braces@3.0.3` — high | Jest và Metro → micromatch → braces | Chủ yếu công cụ test/build. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) hiện chưa có bản vá; không nhận pattern từ nguồn không tin cậy vào các công cụ này. Chưa chứng minh mọi đường khai thác đều bị loại trừ. |
| `node-forge@1.4.0` — high | Expo CLI / code-signing-certificates | [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) hiện chưa có bản vá. Không tự thay thuật toán xác minh/chứng thư, không nhận chứng thư tùy ý để build/ký. Đánh giá lại trước khi triển khai quy trình ký/cập nhật production. |
| `decode-uri-component@0.2.2` — moderate | Expo Router → query-string | Có thể nằm trong luồng URL/deep link trên app, **không coi là chỉ ảnh hưởng công cụ build**. [Bản sửa 0.5.0](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) ngoài dải hiện tại của dependency cha; cần kiểm thử URL trên thiết bị trước khi override hoặc nâng gói cha. Không tự nâng Router/SDK. |
| `sprintf-js@1.0.3` — moderate | ts-jest → Babel/Istanbul → js-yaml → argparse | Còn bị audit đánh dấu. Chưa nâng major bộ kiểm thử chỉ để bỏ cảnh báo; cần rà tương thích Jest/ts-jest và định dạng đầu vào. |
| `uuid@7.0.3` — moderate | Expo config-plugins → xcode | Công cụ cấu hình/build iOS. Bản sửa được audit chỉ tới từ 11.1.1 trở lên, ngoài major đang dùng; không ép thay thư viện bên trong xcode khi chưa kiểm thử. |

Phân loại công cụ build không có nghĩa rủi ro bằng 0: developer/CI vẫn xử lý source,
cấu hình và đầu vào của dependency. Các mục chưa vá vẫn là tồn đọng cần theo dõi.

## CI và cách kiểm tra lại

CI vẫn công khai toàn bộ báo cáo, chặn mức `critical` như chính sách đang có;
**CI xanh không có nghĩa không còn high/moderate**. Không thêm `continue-on-error`,
không bỏ gói khỏi audit hay giảm mức nghiêm trọng của advisory.

```powershell
npm.cmd audit --cache .tmp/npm-cache
npm.cmd ls braces brace-expansion node-forge decode-uri-component sprintf-js uuid --all
```

Các con số có thể đổi khi cơ sở dữ liệu advisory cập nhật. Đọc kết quả audit thực
tế của lần chạy, không lấy kết quả cũ làm kết luận cho bản phát hành mới.
