# Kiểm chứng trước khi chạy ca thật

Không đánh dấu các gate dưới đây đạt chỉ vì unit/integration test local đạt.
Chưa triển khai hoặc chạy SQL lên Supabase trong đợt sửa 05/09/2026.

## Điều kiện và quyền thực hiện

- Chủ dự án chọn/phê duyệt Supabase staging riêng; không dùng production để thử nghiệm.
- Có SMS provider, EAS preview Android/iOS, thiết bị thật, Expo Push credential và OSRM
  dataset xe máy đã kiểm chứng. Không nâng Expo khỏi SDK 54.
- Dùng tài khoản thử nghiệm và số điện thoại được chủ tài khoản đồng ý. SMS/Gemini/EAS
  có thể phát sinh chi phí; không tự bật dịch vụ trả phí.

## Database và API

- [ ] Backup nếu staging đã có dữ liệu; chạy `flyway:info`, `migrate`, `validate` bằng
  migration owner. Database sạch chạy B1 -> V2 -> V3 -> V4, không dùng baseline.
  Database đã có B1/V2 chỉ nhận V3/V4. Không sửa checksum của migration cũ.
- [ ] API chạy bằng `motorescue_api`, không dùng owner; readiness đạt. Runtime không
  được tạo bảng, đổi role hoặc đọc danh tính ngoài API được cấp quyền.
- [ ] Test JWT thật: hết hạn, sai issuer/audience/chữ ký; thiếu consent, tài khoản bị đình chỉ.
- [ ] Test customer A/B, assigned/unrelated provider, dispatcher/admin qua API và private Realtime.
- [ ] Tạo ca không có điểm giao, retry cùng idempotency key, hai provider cùng nhận ca,
  báo giá, từ chối/duyệt, hoàn tất và hủy theo đúng giai đoạn.
- [ ] Gián đoạn backend sau khi ca đã commit: `dispatch_recovery_jobs` phải xử lý lại;
  không tạo ca trùng. Kiểm tra retry/reassignment cũng tạo recovery job.
- [ ] Chỉ tăng replica sau test cạnh tranh worker/nhận-hủy-hết hạn offer và load test.

## Push và thiết bị

- [ ] Đăng ký push, đổi tài khoản/token, logout và xóa tài khoản không gửi cho installation cũ.
- [ ] Lỗi Expo 429/5xx và backend restart giữ job; offer quá hạn không gửi lại. Kiểm
  receipt thật và DeviceNotRegistered; at-least-once có thể lặp cùng notificationId.
- [ ] Provider bật sẵn sàng: đứng yên, khóa màn hình/chuyển app trên 3 phút, sau đó
  tạo ca gần provider. Thử từ chối quyền nền và kiểm thông báo foreground-only.
- [ ] Nhận ca dừng task chờ ca, chuyển tracking ca. Tắt sẵn sàng/đăng xuất/đổi tài khoản
  dừng task; stop trong lúc prompt quyền đang mở không tự bật tracking trở lại.
- [ ] Thu hồi quyền, tiết kiệm pin, force-stop/khởi động lại: không cam kết GPS luôn
  chạy; dữ liệu cũ phải bị loại, không được biến thành GPS mới.
- [ ] Kiểm deep link, mạng yếu/mất mạng, font scale, tai thỏ và quyền Android/iOS.

## Vận hành

- [ ] Kiểm tuyến cầu/đường một chiều/cấm xe máy/NoRoute và biên service zone. ETA không có traffic live.
- [ ] Bật retention Cron, kiểm job thực thi; thiết lập cảnh báo backlog/failed/expired
  push, recovery attempts tăng, ca quá hạn, DB/pool lỗi. Thử backup/restore và rollback image.
- [ ] Xác định người trực điều phối/hotline và quy trình khi thiết bị của khách hết pin.
- [ ] Hoàn thiện quy trình vận hành yêu cầu xóa danh tính; tính năng hiện chỉ tiếp nhận
  và vô hiệu hóa, không tự xóa Supabase Auth. Không xóa audit/ca theo cách làm mất bằng chứng.

## Ngoài phạm vi đợt sửa

Thanh toán/đối soát/bồi thường/bảo hành, bằng chứng bàn giao, chống GPS giả nâng cao,
offline toàn phần và traffic/ngập đường trực tiếp vẫn chưa được triển khai.

Biên bản mỗi gate cần có commit SHA, phiên bản app/OS, môi trường, người kiểm thử,
thời điểm, bước thực hiện, kết quả mong đợi/thực tế và bằng chứng đã loại dữ liệu nhạy cảm.
